'use client';

import { getPhoneDisplay } from '@/modules/phone/utils/phone';
import Avatar from '@/modules/ui/Avatar';
import TableEditModal from '@/modules/ui/TableEditModal';
import type { Booking, BookingStatus } from '@/types/booking.types';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  Copy,
  Mail,
  MessageCircle,
  Phone,
  Scissors,
  TimerReset,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'react-hot-toast';

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: 'bg-surface-warning-soft text-warning',
  CONFIRMED: 'bg-surface-info text-info',
  IN_PROGRESS: 'bg-surface-warning text-warning',
  COMPLETED: 'bg-surface-success text-success',
  CANCELLED: 'bg-surface-danger text-danger',
  NO_SHOW: 'bg-surface-muted text-neutral',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours <= 0) return `${minutes} min`;
  if (remaining === 0) return `${hours} h`;
  return `${hours} h ${remaining} min`;
}

function buildWhatsappSummary(booking: Booking) {
  const services = booking.items.map((item) => `- ${item.service_name_snapshot}`).join('\n');
  const phoneDisplay = getPhoneDisplay({
    display: booking.customer_phone,
    countryIso2: booking.customer_phone_country_iso2,
    nationalNumber: booking.customer_phone_national_number,
    e164: booking.customer_phone_e164,
  });

  return [
    `Cita de ${booking.customer_name}`,
    `Estado: ${STATUS_LABELS[booking.status]}`,
    `Fecha: ${formatDateTime(booking.start_at_utc)}`,
    `Profesional: ${booking.employee?.name ?? 'Sin asignar'}`,
    `Servicios:\n${services || '- Sin servicios'}`,
    `Personas: ${booking.party_size}`,
    `Duración: ${formatMinutes(booking.total_duration_minutes)}`,
    `Total: ${booking.total_price} ${booking.currency}`,
    booking.customer_email ? `Email: ${booking.customer_email}` : null,
    phoneDisplay ? `Teléfono: ${phoneDisplay}` : null,
    booking.notes ? `Notas: ${booking.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildTimeline(booking: Booking) {
  const items = [
    {
      key: 'created',
      label: 'Cita creada',
      description:
        booking.source === 'WEB'
          ? 'El cliente creó la cita desde el enlace público.'
          : 'La cita fue registrada desde el panel.',
      date: booking.created_at,
      icon: CalendarClock,
      tone: 'text-info bg-surface-info',
    },
  ];

  if (booking.updated_at !== booking.created_at) {
    items.push({
      key: 'updated',
      label: 'Última actualización',
      description: 'La cita tuvo cambios después de su creación.',
      date: booking.updated_at,
      icon: TimerReset,
      tone: 'text-warning bg-surface-warning-soft',
    });
  }

  if (booking.status === 'CONFIRMED') {
    items.push({
      key: 'confirmed',
      label: 'Cita confirmada',
      description: 'La cita está lista para ser atendida.',
      date: booking.updated_at,
      icon: CheckCircle2,
      tone: 'text-success bg-surface-success',
    });
  }

  if (booking.status === 'COMPLETED' && booking.completed_at_utc) {
    items.push({
      key: 'completed',
      label: 'Cita completada',
      description: 'El servicio fue marcado como realizado.',
      date: booking.completed_at_utc,
      icon: CheckCircle2,
      tone: 'text-success bg-surface-success',
    });
  }

  if (booking.status === 'CANCELLED' && booking.cancelled_at_utc) {
    items.push({
      key: 'cancelled',
      label: 'Cita cancelada',
      description: booking.cancellation_reason || 'La cita fue cancelada.',
      date: booking.cancelled_at_utc,
      icon: XCircle,
      tone: 'text-danger bg-surface-danger',
    });
  }

  if (booking.status === 'NO_SHOW') {
    items.push({
      key: 'no-show',
      label: 'Cliente no asistió',
      description: booking.cancellation_reason || 'La cita fue marcada como no asistida.',
      date: booking.cancelled_at_utc ?? booking.updated_at,
      icon: XCircle,
      tone: 'text-neutral bg-surface-muted',
    });
  }

  return items;
}

type BookingDetailModalProps = {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (booking: Booking) => void;
  onStatusChange: (booking: Booking, status: BookingStatus) => void;
};

export default function BookingDetailModal({
  booking,
  isOpen,
  onClose,
  onReschedule,
  onStatusChange,
}: BookingDetailModalProps) {
  const timeline = useMemo(() => (booking ? buildTimeline(booking) : []), [booking]);

  if (!booking) return null;

  const phoneDisplay = getPhoneDisplay({
    display: booking.customer_phone,
    countryIso2: booking.customer_phone_country_iso2,
    nationalNumber: booking.customer_phone_national_number,
    e164: booking.customer_phone_e164,
  });

  const canReschedule = ['PENDING', 'CONFIRMED'].includes(booking.status);
  const canConfirm = booking.status === 'PENDING';
  const canComplete = ['CONFIRMED', 'IN_PROGRESS'].includes(booking.status);
  const canCancel = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status);

  async function copyText(value: string, successMessage: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast.error('Tu navegador no permite copiar al portapapeles.');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error('No se pudo copiar la información.');
    }
  }

  return (
    <TableEditModal
      isOpen={isOpen}
      badgeLabel="Detalle operativo"
      badgeIcon={<CalendarClock className="h-3.5 w-3.5" />}
      title="Detalle de cita"
      description="Resumen operativo, historial y acciones rápidas de esta reserva."
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        onClose();
      }}
      submitText="Cerrar"
      cancelText="Volver"
      maxWidthClassName="max-w-5xl"
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4">
          <div className="rounded-3xl border border-border-soft bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={booking.customer_name} className="h-12 w-12" />
                <div>
                  <p className="text-lg font-semibold text-fg-strong">{booking.customer_name}</p>
                  <p className="text-sm text-muted">Cliente de la cita</p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[booking.status]}`}
              >
                {STATUS_LABELS[booking.status]}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Fecha y hora
                </p>
                <p className="mt-2 font-semibold text-fg">{formatDateTime(booking.start_at_utc)}</p>
                <p className="mt-1 text-sm text-muted">
                  Finaliza a las {formatTime(booking.end_at_utc)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Profesional
                </p>
                <p className="mt-2 font-semibold text-fg">
                  {booking.employee?.name ?? 'Sin profesional'}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {booking.employee?.email ?? 'Sin email registrado'}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Contacto
                </p>
                <div className="mt-2 space-y-1 text-sm text-fg-secondary">
                  <p className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {booking.customer_email ?? 'Sin email'}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {phoneDisplay ?? 'Sin teléfono'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Resumen
                </p>
                <p className="mt-2 font-semibold text-fg">
                  {booking.total_price} {booking.currency}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {booking.party_size} persona(s) · {formatMinutes(booking.total_duration_minutes)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-surface p-5">
            <h3 className="text-base font-semibold text-fg-strong">Servicios</h3>
            <div className="mt-4 space-y-3">
              {booking.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border-soft bg-surface-soft p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="inline-flex items-center gap-2 font-semibold text-fg">
                        <Scissors className="h-4 w-4 text-fg-icon" />
                        {item.service_name_snapshot}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {formatMinutes(item.duration_minutes_snapshot)}
                      </p>
                    </div>
                    <p className="font-semibold text-fg">
                      {item.line_total_snapshot} {item.currency_snapshot}
                    </p>
                  </div>
                  {item.instructions_snapshot ? (
                    <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-fg-secondary">
                      {item.instructions_snapshot}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {booking.notes ? (
            <div className="rounded-3xl border border-border-soft bg-surface p-5">
              <h3 className="text-base font-semibold text-fg-strong">Notas</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-fg-secondary">{booking.notes}</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border-soft bg-surface p-5">
            <h3 className="text-base font-semibold text-fg-strong">Acciones rápidas</h3>
            <div className="mt-4 grid gap-2">
              {canConfirm ? (
                <button
                  type="button"
                  onClick={() => onStatusChange(booking, 'CONFIRMED')}
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm font-semibold text-fg transition hover:bg-surface-soft"
                >
                  Confirmar cita
                </button>
              ) : null}
              {canComplete ? (
                <button
                  type="button"
                  onClick={() => onStatusChange(booking, 'COMPLETED')}
                  className="rounded-2xl border border-border-success bg-surface-success px-4 py-3 text-left text-sm font-semibold text-success transition hover:opacity-90"
                >
                  Marcar como completada
                </button>
              ) : null}
              {canReschedule ? (
                <button
                  type="button"
                  onClick={() => onReschedule(booking)}
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm font-semibold text-fg transition hover:bg-surface-soft"
                >
                  Reprogramar cita
                </button>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  onClick={() => onStatusChange(booking, 'CANCELLED')}
                  className="rounded-2xl border border-border-danger bg-surface-danger px-4 py-3 text-left text-sm font-semibold text-danger transition hover:opacity-90"
                >
                  Cancelar cita
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  copyText(buildWhatsappSummary(booking), 'Resumen para WhatsApp copiado.')
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg transition hover:bg-surface-soft"
              >
                <MessageCircle className="h-4 w-4" />
                Copiar resumen para WhatsApp
              </button>
              <button
                type="button"
                onClick={() => copyText(booking.id, 'ID interno de la cita copiado para soporte.')}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg transition hover:bg-surface-soft"
              >
                <ClipboardCopy className="h-4 w-4" />
                Copiar ID para soporte
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-border-soft bg-surface-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Link de gestión del cliente
              </p>
              <p className="mt-2 text-sm text-muted">
                El enlace seguro se envía por email al cliente. Por seguridad, el token no se
                muestra en el panel administrativo.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-surface p-5">
            <h3 className="text-base font-semibold text-fg-strong">Timeline</h3>
            <div className="mt-4 space-y-4">
              {timeline.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`grid h-9 w-9 place-items-center rounded-2xl ${item.tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {index < timeline.length - 1 ? (
                        <span className="mt-2 h-full w-px flex-1 bg-border-soft" />
                      ) : null}
                    </div>
                    <div className="pb-2">
                      <p className="font-semibold text-fg">{item.label}</p>
                      <p className="mt-1 text-sm text-fg-secondary">{item.description}</p>
                      <p className="mt-1 text-xs text-muted">{formatDateTime(item.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-surface p-5">
            <h3 className="text-base font-semibold text-fg-strong">Notificaciones</h3>
            <div className="mt-3 space-y-2 text-sm text-fg-secondary">
              <p className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-fg-icon" />
                Confirmación al cliente: enviada al crear la cita si el email está configurado.
              </p>
              <p className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4 text-fg-icon" />
                Profesional: notificado cuando tiene email disponible.
              </p>
              <p className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-fg-icon" />
                Recordatorios: dependen de la configuración del backend.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg transition hover:bg-surface-soft"
        >
          <Copy className="h-4 w-4" />
          Cerrar detalle
        </button>
      </div>
    </TableEditModal>
  );
}
