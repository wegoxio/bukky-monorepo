'use client';

import { bookingsService } from '@/modules/bookings/services/bookings.service';
import CalendarDatePicker from '@/modules/ui/CalendarDatePicker';
import TurnstileWidget from '@/modules/ui/TurnstileWidget';
import type { BookingSlot, PublicBookingManagement } from '@/types/booking.types';
import { ApiError } from '@/modules/http/services/api';
import { CalendarClock, CheckCircle2, ChevronLeft, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

type PublicBookingManageFlowProps = {
  token: string;
};

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
const TURNSTILE_RESCHEDULE_ACTION =
  process.env.NEXT_PUBLIC_TURNSTILE_RESCHEDULE_ACTION?.trim() || 'booking_reschedule';

function getTodayDateInput() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toDateInput(value: string) {
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatSlotDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(value));
}

function formatSlotTime(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatStatus(status: string) {
  switch (status) {
    case 'PENDING':
      return 'Pendiente de confirmación';
    case 'CONFIRMED':
      return 'Confirmada';
    case 'COMPLETED':
      return 'Completada';
    case 'CANCELLED':
      return 'Cancelada';
    case 'NO_SHOW':
      return 'No asistida';
    default:
      return status.replace(/_/g, ' ');
  }
}

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `reschedule_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function PublicBookingManageFlow({ token }: PublicBookingManageFlowProps) {
  const isTurnstileEnabled = TURNSTILE_SITE_KEY.length > 0;
  const [booking, setBooking] = useState<PublicBookingManagement | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [date, setDate] = useState(getTodayDateInput());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const serviceNames = useMemo(
    () => booking?.items.map((item) => item.service_name_snapshot).join(', ') ?? '',
    [booking],
  );

  const loadBooking = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const loaded = await bookingsService.findPublicBookingByToken(token);
      setBooking(loaded);
      setDate(toDateInput(loaded.start_at_utc));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos abrir el enlace de gestión de esta cita.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadSlots = useCallback(async () => {
    if (!booking?.can_reschedule) return;
    setIsLoadingSlots(true);
    setErrorMessage('');
    try {
      const availability = await bookingsService.getPublicBookingManagementAvailability(token, {
        date,
      });
      setSlots(availability.slots);
      setSelectedSlot('');
    } catch (error) {
      setSlots([]);
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos consultar los horarios disponibles.',
      );
    } finally {
      setIsLoadingSlots(false);
    }
  }, [booking?.can_reschedule, date, token]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const handleReschedule = async () => {
    if (!selectedSlot || !booking) return;
    const selectedAvailability = slots.find((slot) => slot.start_at_utc === selectedSlot);
    if (selectedAvailability && selectedAvailability.available_capacity < booking.party_size) {
      setSelectedSlot('');
      setErrorMessage(
        `Este horario solo tiene ${selectedAvailability.available_capacity} cupo(s).`,
      );
      return;
    }
    if (isTurnstileEnabled && !captchaToken) {
      setErrorMessage('Completa la verificación de seguridad antes de continuar.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      const payload = {
        start_at_utc: selectedSlot,
        captcha_token: isTurnstileEnabled ? (captchaToken ?? undefined) : undefined,
      };
      const fingerprint = JSON.stringify(payload);
      if (idempotencyRef.current?.fingerprint !== fingerprint) {
        idempotencyRef.current = { fingerprint, key: makeIdempotencyKey() };
      }
      const updated = await bookingsService.reschedulePublicByToken(
        token,
        payload,
        idempotencyRef.current.key,
      );
      idempotencyRef.current = null;
      setBooking(updated);
      setDate(toDateInput(updated.start_at_utc));
      setSelectedSlot('');
      toast.success('Cita reprogramada correctamente.');
      if (isTurnstileEnabled) {
        setCaptchaRefreshKey((prev) => prev + 1);
      }
    } catch (error) {
      if (isTurnstileEnabled) {
        setCaptchaRefreshKey((prev) => prev + 1);
      }
      if (error instanceof ApiError && error.status === 409) {
        await loadSlots();
        setErrorMessage(
          'Ese horario acaba de ocuparse. Te mostramos los siguientes horarios disponibles.',
        );
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'No pudimos reprogramar la cita.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="mt-4 text-sm font-medium text-slate-700">Cargando cita...</p>
        </section>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-red-600">
            {errorMessage || 'El enlace de gestión no es válido o expiró.'}
          </p>
          <Link href="/" className="mt-5 inline-flex rounded-xl border px-4 py-2 text-sm">
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
            Gestión de cita
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
            Reprogramar cita
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Este enlace permite cambiar únicamente la fecha y hora de esta reserva.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{booking.customer_name}</p>
                <p className="mt-1 text-sm text-slate-600">{serviceNames}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Estado
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{formatStatus(booking.status)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Fecha actual
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {formatSlotDate(booking.start_at_utc)} · {formatSlotTime(booking.start_at_utc)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Profesional
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {booking.employee?.name ?? 'Por asignar'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Personas
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{booking.party_size}</dd>
              </div>
            </dl>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {booking.can_reschedule ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-600">Nueva fecha</span>
                    <CalendarDatePicker
                      value={date}
                      minDate={getTodayDateInput()}
                      onChange={setDate}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void loadSlots()}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                  >
                    Buscar horarios
                  </button>
                </div>

                {errorMessage ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </p>
                ) : null}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Horarios disponibles
                  </p>
                  {isLoadingSlots ? (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Buscando horarios...
                    </p>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {slots.map((slot) => {
                        const hasEnoughCapacity =
                          !booking || slot.available_capacity >= booking.party_size;
                        return (
                          <button
                            key={slot.start_at_utc}
                            type="button"
                            disabled={!hasEnoughCapacity}
                            onClick={() => {
                              if (hasEnoughCapacity) setSelectedSlot(slot.start_at_utc);
                            }}
                            className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                              selectedSlot === slot.start_at_utc
                                ? 'border-violet-500 bg-violet-50 text-violet-900'
                                : !hasEnoughCapacity
                                  ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-70'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 font-semibold">
                              <Clock3 className="h-4 w-4" />
                              {formatSlotTime(slot.start_at_utc)}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {slot.available_capacity === 1
                                ? 'Queda 1 cupo'
                                : `Quedan ${slot.available_capacity} cupos`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No hay horarios disponibles para esta fecha. Prueba con otro día.
                    </p>
                  )}
                </div>

                {isTurnstileEnabled ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-600">
                      Verificación de seguridad
                    </p>
                    <TurnstileWidget
                      siteKey={TURNSTILE_SITE_KEY}
                      action={TURNSTILE_RESCHEDULE_ACTION}
                      refreshKey={captchaRefreshKey}
                      onTokenChange={setCaptchaToken}
                    />
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Volver
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleReschedule()}
                    disabled={!selectedSlot || isSaving}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Confirmar nuevo horario'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Esta cita ya no puede reprogramarse desde el enlace.
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Si necesitas ayuda, contacta directamente al negocio.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
