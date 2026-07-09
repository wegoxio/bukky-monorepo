'use client';

import { bookingsService } from '@/modules/bookings/services/bookings.service';
import { validateOptionalPhoneValue } from '@/modules/phone/utils/phone';
import { defaultTenantSettings } from '@/modules/settings/config/default-tenant-settings';
import { tenantSettingsService } from '@/modules/settings/services/tenant-settings.service';
import {
  applyDocumentBranding,
  readDocumentFaviconHref,
  readDocumentTitle,
} from '@/modules/settings/utils/document-branding';
import {
  createThemeVariables,
  normalizeThemeMode,
  normalizeThemeOverrides,
  normalizeThemeSettings,
} from '@/modules/settings/utils/theme-colors';
import Avatar from '@/modules/ui/Avatar';
import CalendarDatePicker from '@/modules/ui/CalendarDatePicker';
import PhoneField from '@/modules/ui/PhoneField';
import TurnstileWidget from '@/modules/ui/TurnstileWidget';
import type {
  BookingSlot,
  PublicBookingConfirmation,
  PublicBookingEmployee,
  PublicBookingService,
} from '@/types/booking.types';
import type { TenantSettingsRecord } from '@/types/tenant-settings.types';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Scissors, UserRound } from 'lucide-react';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ApiError } from '@/modules/http/services/api';
import { calculateEstimatedTotal } from '@/modules/bookings/utils/money';

type BookingStep = 'services' | 'employee' | 'datetime' | 'customer' | 'done';

type CustomerFormState = {
  customer_name: string;
  customer_email: string;
  customer_phone_country_iso2: string;
  customer_phone_national_number: string;
  notes: string;
};

type TenantPublicBookingFlowProps = {
  tenantSlug: string;
};

const STEP_ORDER: BookingStep[] = ['services', 'employee', 'datetime', 'customer', 'done'];

const INITIAL_CUSTOMER_FORM: CustomerFormState = {
  customer_name: '',
  customer_email: '',
  customer_phone_country_iso2: '',
  customer_phone_national_number: '',
  notes: '',
};
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
const TURNSTILE_BOOKING_ACTION =
  process.env.NEXT_PUBLIC_TURNSTILE_BOOKING_ACTION?.trim() || 'booking_create';
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });

function getTodayDateInput() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getDateWeekday(value: string) {
  return parseDateInput(value)?.getDay() ?? null;
}

function isDateAllowedForWorkingDays(value: string, workingDays: number[]) {
  if (workingDays.length === 0) return false;
  const weekday = getDateWeekday(value);
  return weekday !== null && workingDays.includes(weekday);
}

function getNextAllowedDateFrom(value: string, workingDays: number[]) {
  const startDate = parseDateInput(value);
  if (!startDate || workingDays.length === 0) return null;

  for (let offset = 0; offset < 366; offset += 1) {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + offset);

    if (workingDays.includes(nextDate.getDay())) {
      const year = nextDate.getFullYear();
      const month = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(nextDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function formatWorkingDaysLabel(workingDays: number[]) {
  if (workingDays.length === 0) return 'Sin horario público configurado';

  return [...new Set(workingDays)]
    .sort((a, b) => a - b)
    .map((day) => {
      const referenceDate = new Date(2026, 0, 4 + day);
      const weekdayLabel = WEEKDAY_FORMATTER.format(referenceDate);
      return weekdayLabel.charAt(0).toUpperCase() + weekdayLabel.slice(1);
    })
    .join(', ');
}

function formatSlotTime(iso: string, timeZone?: string | null) {
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

function formatSlotDate(iso: string, timeZone?: string | null) {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    ...(timeZone ? { timeZone } : {}),
  });
}

function formatDuration(minutes: number | null) {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function toBusinessNameFromSlug(slug: string) {
  const normalized = slug.trim();
  if (!normalized) return 'Comercio';
  return normalized
    .split('-')
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function getStepTitle(step: BookingStep) {
  switch (step) {
    case 'services':
      return 'Paso 1: Selecciona servicios';
    case 'employee':
      return 'Paso 2: Selecciona profesional';
    case 'datetime':
      return 'Paso 3: Selecciona fecha y hora';
    case 'customer':
      return 'Paso 4: Datos del cliente';
    case 'done':
      return 'Resultado de la reserva';
  }
}

function formatCapacityLabel(slot: BookingSlot) {
  if (slot.available_capacity <= 0) return 'Horario completo';
  if (slot.available_capacity === 1) return 'Queda 1 cupo';
  return `Quedan ${slot.available_capacity} cupos`;
}

export default function TenantPublicBookingFlow({ tenantSlug }: TenantPublicBookingFlowProps) {
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const isTurnstileEnabled = TURNSTILE_SITE_KEY.length > 0;
  const [services, setServices] = useState<PublicBookingService[]>([]);
  const [businessSettings, setBusinessSettings] = useState<TenantSettingsRecord | null>(null);
  const [eligibleEmployees, setEligibleEmployees] = useState<PublicBookingEmployee[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [partySize, setPartySize] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDateInput());
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);
  const [requiredDurationMinutes, setRequiredDurationMinutes] = useState<number | null>(null);
  const [availabilityTimezone, setAvailabilityTimezone] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(INITIAL_CUSTOMER_FORM);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);
  const [currentStep, setCurrentStep] = useState<BookingStep>('services');
  const [createdBooking, setCreatedBooking] = useState<PublicBookingConfirmation | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessName = useMemo(() => {
    const byBusiness = businessSettings?.business?.name?.trim();
    if (byBusiness) return byBusiness;
    const byBranding = businessSettings?.branding?.appName?.trim();
    if (byBranding) return byBranding;
    return toBusinessNameFromSlug(tenantSlug);
  }, [businessSettings, tenantSlug]);

  const businessSlug = useMemo(
    () => businessSettings?.business?.slug?.trim() || tenantSlug,
    [businessSettings, tenantSlug],
  );

  const branding = useMemo(() => {
    const source = businessSettings?.branding;
    return {
      appName: source?.appName?.trim() || businessName,
      windowTitle: source?.windowTitle?.trim() || `${businessName} | Reserva online`,
      logoUrl: source?.logoUrl?.trim() || defaultTenantSettings.branding.logoUrl,
      faviconUrl: source?.faviconUrl?.trim() || defaultTenantSettings.branding.faviconUrl,
    };
  }, [businessName, businessSettings]);

  const themeSettings = useMemo(
    () => normalizeThemeSettings(businessSettings?.theme ?? defaultTenantSettings.theme),
    [businessSettings],
  );

  const themeMode = useMemo(
    () => normalizeThemeMode(businessSettings?.themeMode ?? defaultTenantSettings.themeMode),
    [businessSettings],
  );

  const themeOverrides = useMemo(
    () =>
      normalizeThemeOverrides(
        businessSettings?.themeOverrides ?? defaultTenantSettings.themeOverrides,
      ),
    [businessSettings],
  );

  const themeVariables = useMemo(
    () => createThemeVariables(themeSettings, themeMode, themeOverrides),
    [themeMode, themeOverrides, themeSettings],
  );

  const themeStyle = useMemo(() => themeVariables as CSSProperties, [themeVariables]);

  const activeServices = useMemo(() => services.filter((service) => service.is_active), [services]);

  const selectedServices = useMemo(
    () => activeServices.filter((service) => selectedServiceIds.includes(service.id)),
    [activeServices, selectedServiceIds],
  );
  const selectedService = selectedServices[0];
  const partySizeOptions = selectedService
    ? Array.from(
        { length: selectedService.max_party_size - selectedService.min_party_size + 1 },
        (_, index) => selectedService.min_party_size + index,
      )
    : [];

  const selectedEmployee = useMemo(
    () => eligibleEmployees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [eligibleEmployees, selectedEmployeeId],
  );
  const selectedEmployeeWorkingDays = useMemo(
    () => [...new Set(selectedEmployee?.working_days ?? [])].sort((a, b) => a - b),
    [selectedEmployee],
  );

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.start_at_utc === selectedSlotStart) ?? null,
    [slots, selectedSlotStart],
  );

  const totalPrice = selectedService
    ? calculateEstimatedTotal(selectedService.price, partySize, selectedService.pricing_model)
    : '0.00';

  const loadMeta = useCallback(async () => {
    setIsLoadingMeta(true);
    setErrorMessage('');

    const [servicesResult, settingsResult] = await Promise.allSettled([
      bookingsService.findPublicServices(tenantSlug),
      tenantSettingsService.findPublicByBusinessSlug(tenantSlug),
    ]);

    if (servicesResult.status === 'fulfilled') {
      setServices(servicesResult.value);
    } else {
      setServices([]);
      setErrorMessage(
        servicesResult.reason instanceof Error
          ? servicesResult.reason.message
          : 'No se pudieron cargar servicios.',
      );
    }

    if (settingsResult.status === 'fulfilled') {
      setBusinessSettings(settingsResult.value);
    } else {
      setBusinessSettings(null);
    }

    setIsLoadingMeta(false);
  }, [tenantSlug]);

  const refreshAvailability = useCallback(async () => {
    if (!selectedEmployeeId || selectedServiceIds.length === 0 || !selectedDate) {
      setSlots([]);
      setSelectedSlotStart(null);
      setRequiredDurationMinutes(null);
      return;
    }

    if (selectedEmployeeWorkingDays.length === 0) {
      setSlots([]);
      setSelectedSlotStart(null);
      setRequiredDurationMinutes(null);
      setAvailabilityTimezone(null);
      return;
    }

    if (!isDateAllowedForWorkingDays(selectedDate, selectedEmployeeWorkingDays)) {
      setSlots([]);
      setSelectedSlotStart(null);
      setRequiredDurationMinutes(null);
      return;
    }

    setIsLoadingSlots(true);
    setErrorMessage('');
    try {
      const availability = await bookingsService.getPublicAvailability(tenantSlug, {
        employee_id: selectedEmployeeId,
        service_ids: selectedServiceIds,
        date: selectedDate,
        party_size: partySize,
      });
      setSlots(availability.slots);
      setRequiredDurationMinutes(availability.required_duration_minutes);
      setAvailabilityTimezone(availability.timezone);
      setSelectedSlotStart((prev) =>
        prev && availability.slots.some((slot) => slot.start_at_utc === prev) ? prev : null,
      );
    } catch (error) {
      setSlots([]);
      setSelectedSlotStart(null);
      setRequiredDurationMinutes(null);
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo calcular disponibilidad.',
      );
    } finally {
      setIsLoadingSlots(false);
    }
  }, [
    selectedDate,
    selectedEmployeeId,
    selectedEmployeeWorkingDays,
    selectedServiceIds,
    partySize,
    tenantSlug,
  ]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (isLoadingMeta || typeof document === 'undefined') return;
    const previousTitle = readDocumentTitle();
    const previousFavicon = readDocumentFaviconHref();

    applyDocumentBranding({
      title: branding.windowTitle,
      faviconUrl: branding.faviconUrl,
    });

    return () => {
      applyDocumentBranding({
        title: previousTitle,
        faviconUrl: previousFavicon,
      });
    };
  }, [branding.faviconUrl, branding.windowTitle, isLoadingMeta]);

  useEffect(() => {
    if (selectedServiceIds.length === 0) {
      return;
    }

    let isCancelled = false;
    setIsLoadingEmployees(true);
    setErrorMessage('');

    (async () => {
      try {
        const data = await bookingsService.findPublicEligibleEmployees(
          tenantSlug,
          selectedServiceIds,
        );
        if (isCancelled) return;
        setEligibleEmployees(data);
        if (!data.some((employee) => employee.id === selectedEmployeeId)) {
          setSelectedEmployeeId('');
          setSlots([]);
          setSelectedSlotStart(null);
          setRequiredDurationMinutes(null);
        }
      } catch (error) {
        if (isCancelled) return;
        setEligibleEmployees([]);
        setSelectedEmployeeId('');
        setSlots([]);
        setSelectedSlotStart(null);
        setRequiredDurationMinutes(null);
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudieron cargar profesionales.',
        );
      } finally {
        if (!isCancelled) {
          setIsLoadingEmployees(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [selectedServiceIds, selectedEmployeeId, tenantSlug]);

  useEffect(() => {
    void refreshAvailability();
  }, [refreshAvailability]);

  const handleToggleService = (serviceId: string) => {
    const isSelected = selectedServiceIds.includes(serviceId);
    const nextService = activeServices.find((service) => service.id === serviceId);
    setSelectedServiceIds(isSelected ? [] : [serviceId]);
    setPartySize(isSelected ? 1 : (nextService?.min_party_size ?? 1));
    setEligibleEmployees([]);
    setSelectedEmployeeId('');
    setSlots([]);
    setSelectedSlotStart(null);
    setRequiredDurationMinutes(null);
    setAvailabilityTimezone(null);
    if (currentStep !== 'services') {
      setCurrentStep('services');
    }
  };

  const handleSelectEmployee = (employee: PublicBookingEmployee) => {
    const workingDays = [...new Set(employee.working_days ?? [])].sort((a, b) => a - b);
    const nextAllowedDate = isDateAllowedForWorkingDays(selectedDate, workingDays)
      ? selectedDate
      : (getNextAllowedDateFrom(selectedDate, workingDays) ??
        getNextAllowedDateFrom(getTodayDateInput(), workingDays));

    setSelectedEmployeeId(employee.id);
    if (nextAllowedDate && nextAllowedDate !== selectedDate) {
      setSelectedDate(nextAllowedDate);
    }
    setSlots([]);
    setSelectedSlotStart(null);
    setRequiredDurationMinutes(null);
    setAvailabilityTimezone(null);
  };

  const goNext = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    const nextStep = STEP_ORDER[currentIndex + 1];
    if (nextStep && nextStep !== 'done') {
      setCurrentStep(nextStep);
    }
  };

  const goBack = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    const prevStep = STEP_ORDER[currentIndex - 1];
    if (prevStep && prevStep !== 'done') {
      setCurrentStep(prevStep);
    }
  };

  const resetFlow = () => {
    setSelectedServiceIds([]);
    setPartySize(1);
    setEligibleEmployees([]);
    setSelectedEmployeeId('');
    setSelectedDate(getTodayDateInput());
    setSlots([]);
    setSelectedSlotStart(null);
    setRequiredDurationMinutes(null);
    setAvailabilityTimezone(null);
    setCustomerForm(INITIAL_CUSTOMER_FORM);
    setCaptchaToken(null);
    setCaptchaRefreshKey((prev) => prev + 1);
    setCreatedBooking(null);
    setErrorMessage('');
    setCurrentStep('services');
  };

  const handleCreateBooking = async () => {
    if (!selectedEmployeeId || selectedServiceIds.length === 0 || !selectedSlotStart) {
      setErrorMessage('Completa los pasos antes de confirmar.');
      return;
    }
    if (customerForm.customer_name.trim().length === 0) {
      setErrorMessage('El nombre del cliente es obligatorio.');
      return;
    }
    if (
      customerForm.customer_email.trim().length > 0 &&
      !/^\S+@\S+\.\S+$/.test(customerForm.customer_email.trim())
    ) {
      setErrorMessage('El correo del cliente no es válido.');
      return;
    }
    const phoneValidationError = validateOptionalPhoneValue({
      countryIso2: customerForm.customer_phone_country_iso2,
      nationalNumber: customerForm.customer_phone_national_number,
      label: 'teléfono',
    });
    if (phoneValidationError) {
      setErrorMessage(phoneValidationError);
      return;
    }
    if (isTurnstileEnabled && !captchaToken) {
      setErrorMessage('Completa la verificación de seguridad para confirmar.');
      return;
    }
    if (
      selectedService &&
      (partySize < selectedService.min_party_size || partySize > selectedService.max_party_size)
    ) {
      setErrorMessage('El número de personas no es válido para el servicio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const payload = {
        employee_id: selectedEmployeeId,
        service_ids: selectedServiceIds,
        start_at_utc: selectedSlotStart,
        party_size: partySize,
        customer_name: customerForm.customer_name.trim(),
        customer_email: customerForm.customer_email.trim() || undefined,
        customer_phone_country_iso2: customerForm.customer_phone_country_iso2.trim() || undefined,
        customer_phone_national_number:
          customerForm.customer_phone_national_number.trim() || undefined,
        notes: customerForm.notes.trim() || undefined,
        source: 'WEB',
        captcha_token: isTurnstileEnabled ? (captchaToken ?? undefined) : undefined,
      } as const;
      const fingerprint = JSON.stringify(payload);
      if (idempotencyRef.current?.fingerprint !== fingerprint) {
        idempotencyRef.current = {
          fingerprint,
          key:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `booking_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        };
      }
      const booking = await bookingsService.createPublic(
        tenantSlug,
        payload,
        idempotencyRef.current.key,
      );
      idempotencyRef.current = null;
      setCreatedBooking(booking);
      setCurrentStep('done');
      toast.success(
        booking.status === 'PENDING'
          ? 'Solicitud enviada correctamente.'
          : 'Reserva confirmada correctamente.',
      );
    } catch (error) {
      if (isTurnstileEnabled) {
        setCaptchaRefreshKey((prev) => prev + 1);
      }
      if (error instanceof ApiError && error.status === 409) {
        await refreshAvailability();
        setErrorMessage(
          'Ese horario acaba de ocuparse. Te mostramos los siguientes horarios disponibles para que elijas otro.',
        );
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo crear la reserva.');
      }
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepNumber = STEP_ORDER.indexOf(currentStep) + 1;

  if (isLoadingMeta) {
    return (
      <div className="min-h-screen bg-slate-100 py-10">
        <section className="mx-auto max-w-6xl px-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              <p className="mt-4 text-sm font-medium text-slate-700">
                Cargando experiencia de reservas...
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={themeStyle} className="min-h-screen bg-app py-6">
      <section className="mx-auto max-w-6xl space-y-3 px-3 sm:space-y-4 sm:px-4">
        <header className="rounded-[26px] border border-card-border bg-gradient-to-br from-surface-warm via-surface to-surface-soft p-4 shadow-theme-soft sm:rounded-[28px] sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-card-border bg-surface shadow-theme-soft-sm sm:h-14 sm:w-14">
                <Image
                  src={branding.logoUrl}
                  alt={`${businessName} logo`}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-9 w-9 rounded-md object-contain sm:h-10 sm:w-10"
                  onError={(event) => {
                    event.currentTarget.src = defaultTenantSettings.branding.logoUrl;
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Reserva online
                </p>
                <h1 className="mt-1 truncate text-[1.75rem] font-semibold tracking-[-0.03em] text-fg-strong sm:text-3xl">
                  {businessName}
                </h1>
                <p className="mt-2 hidden max-w-2xl text-sm text-muted sm:block">
                  Selecciona servicios, profesional y horario disponible para completar tu cita.
                </p>
                <p className="mt-2 text-xs text-muted sm:hidden">
                  Elige servicio, profesional y horario.
                </p>
              </div>
            </div>

            <div className="hidden rounded-2xl border border-card-border bg-surface-soft px-4 py-3 md:min-w-64 lg:block">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Comercio</p>
              <p className="mt-1 text-sm font-semibold text-fg-strong">{businessName}</p>
              <p className="mt-1 text-xs text-muted">/{`book/${businessSlug}`}</p>
            </div>
          </div>
        </header>

        <div className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card">
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <aside className="order-2 hidden rounded-3xl border border-border-soft bg-surface p-4 lg:block xl:order-1">
              <div className="rounded-2xl border border-border-soft bg-surface-soft p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Negocio
                </p>
                <div className="mt-2 flex items-center gap-2.5">
                  <Image
                    src={branding.logoUrl}
                    alt={`${businessName} logo`}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 rounded-md border border-border-soft bg-surface object-contain p-1"
                    onError={(event) => {
                      event.currentTarget.src = defaultTenantSettings.branding.logoUrl;
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg-strong">{businessName}</p>
                    <p className="truncate text-xs text-muted">{businessSlug}</p>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Resumen
              </p>

              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-muted">Servicios</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selectedServices.length === 0 ? (
                      <span className="text-xs text-muted">Sin seleccionar</span>
                    ) : (
                      selectedServices.map((service) => (
                        <div key={service.id} className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] text-fg-secondary">
                            <Scissors className="h-3 w-3" />
                            {service.name}
                          </span>
                          {service.instructions ? (
                            <p className="max-w-xs text-[11px] text-warning">
                              Indicaciones: {service.instructions}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted">Personas</p>
                  <p className="mt-1 text-sm font-medium text-fg">{partySize}</p>
                </div>

                <div>
                  <p className="text-xs text-muted">Profesional</p>
                  <p className="mt-1 text-sm font-medium text-fg">
                    {selectedEmployee?.name ?? 'Pendiente'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted">Fecha / Hora</p>
                  <p className="mt-1 text-sm font-medium text-fg">
                    {selectedSlot
                      ? `${formatSlotDate(selectedSlot.start_at_utc, availabilityTimezone)} - ${formatSlotTime(selectedSlot.start_at_utc, availabilityTimezone)}`
                      : 'Pendiente'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted">Duración</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-fg">
                    <Clock3 className="h-4 w-4 text-fg-icon" />
                    {formatDuration(requiredDurationMinutes)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted">Total estimado</p>
                  {selectedService?.pricing_model === 'PER_PERSON' ? (
                    <p className="mt-1 text-xs text-muted">
                      {selectedService.price} {selectedService.currency} por persona
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm font-semibold text-fg-strong">
                    {totalPrice} {selectedServices[0]?.currency ?? 'USD'}
                  </p>
                </div>
              </div>
            </aside>

            <div className="order-1 rounded-3xl border border-border-soft bg-surface p-4 xl:order-2">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-fg-strong">
                  {getStepTitle(currentStep)}
                </h3>
                {currentStep !== 'done' ? (
                  <span className="rounded-full bg-surface-warning-soft px-3 py-1 text-xs font-medium text-warning">
                    Paso {stepNumber}/4
                  </span>
                ) : null}
              </div>

              <div className="mb-4 rounded-2xl border border-border-soft bg-surface-soft px-3 py-3 lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Resumen rapido
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-muted">Servicio</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-fg">
                      {selectedServices[0]?.name ?? 'Sin seleccionar'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted">Profesional</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-fg">
                      {selectedEmployee?.name ?? 'Pendiente'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted">Fecha / Hora</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-fg">
                      {selectedSlot
                        ? `${formatSlotDate(selectedSlot.start_at_utc, availabilityTimezone)} - ${formatSlotTime(selectedSlot.start_at_utc, availabilityTimezone)}`
                        : 'Pendiente'}
                    </p>
                  </div>
                </div>
              </div>

              {errorMessage ? <p className="mb-4 text-sm text-danger">{errorMessage}</p> : null}

              {activeServices.length === 0 ? (
                <p className="rounded-2xl border border-border-soft bg-surface-soft px-3 py-3 text-sm text-muted">
                  Este negocio todavía no puede recibir reservas porque no tiene servicios públicos
                  activos con profesionales disponibles.
                </p>
              ) : (
                <div key={currentStep} className="booking-step-enter space-y-4">
                  {currentStep === 'services' ? (
                    <>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {activeServices.map((service) => {
                          const isSelected = selectedServiceIds.includes(service.id);
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => handleToggleService(service.id)}
                              className={`rounded-2xl border px-3 py-3 text-left transition ${
                                isSelected
                                  ? 'border-accent bg-surface-warning-soft'
                                  : 'border-border-soft bg-surface hover:border-border'
                              }`}
                            >
                              <p className="text-sm font-semibold text-fg-strong">{service.name}</p>
                              <p className="mt-1 text-xs text-muted">
                                {service.duration_minutes} min - {service.price} {service.currency}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-secondary">
                                  {service.min_party_size === service.max_party_size
                                    ? `${service.max_party_size} ${service.max_party_size === 1 ? 'persona' : 'personas'}`
                                    : `${service.min_party_size}-${service.max_party_size} personas`}
                                </span>
                                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-secondary">
                                  {service.slot_capacity} plazas por horario
                                </span>
                                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-secondary">
                                  {service.pricing_model === 'PER_PERSON'
                                    ? 'Precio por persona'
                                    : 'Precio fijo'}
                                </span>
                                {service.requires_confirmation ? (
                                  <span className="rounded-full bg-surface-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                                    Requiere confirmación
                                  </span>
                                ) : null}
                              </div>
                              {service.instructions ? (
                                <p className="mt-2 text-xs text-warning">
                                  Indicaciones: {service.instructions}
                                </p>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                      {selectedService ? (
                        <label className="block max-w-xs space-y-1.5">
                          <span className="text-xs font-medium text-fg-label">Personas</span>
                          <select
                            value={partySize}
                            onChange={(event) => {
                              setPartySize(Number(event.target.value));
                              setSelectedSlotStart(null);
                            }}
                            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
                          >
                            {partySizeOptions.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={selectedServiceIds.length === 0}
                          onClick={goNext}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent disabled:opacity-60"
                        >
                          Continuar
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : null}

                  {currentStep === 'employee' ? (
                    <>
                      {isLoadingEmployees ? (
                        <p className="text-sm text-muted">Buscando profesionales...</p>
                      ) : eligibleEmployees.length === 0 ? (
                        <p className="rounded-2xl border border-border-soft bg-surface-soft px-3 py-3 text-sm text-muted">
                          No hay profesionales disponibles para esta selección.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {eligibleEmployees.map((employee) => {
                            const isSelected = selectedEmployeeId === employee.id;
                            return (
                              <button
                                key={employee.id}
                                type="button"
                                onClick={() => handleSelectEmployee(employee)}
                                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                                  isSelected
                                    ? 'border-accent bg-surface-warning-soft'
                                    : 'border-border-soft bg-surface hover:border-border'
                                }`}
                              >
                                <Avatar name={employee.name} imageUrl={employee.avatar_url} />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-fg-strong">
                                    {employee.name}
                                  </span>
                                  <span className="block truncate text-xs text-muted">
                                    Profesional disponible
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={goBack}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-neutral"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Atrás
                        </button>
                        <button
                          type="button"
                          disabled={!selectedEmployeeId}
                          onClick={goNext}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent disabled:opacity-60"
                        >
                          Continuar
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : null}

                  {currentStep === 'datetime' ? (
                    <>
                      <div className="rounded-2xl border border-border-soft bg-surface-soft p-3">
                        <label className="mb-2 block text-xs font-medium text-fg-label">
                          Fecha
                        </label>
                        {selectedEmployeeWorkingDays.length === 0 ? (
                          <p className="rounded-2xl border border-border-soft bg-surface px-3 py-3 text-sm text-muted">
                            Este profesional aún no tiene días laborables publicados.
                          </p>
                        ) : (
                          <>
                            <CalendarDatePicker
                              value={selectedDate}
                              onChange={setSelectedDate}
                              minDate={getTodayDateInput()}
                              placeholder="Seleccionar fecha"
                              disabledMatchers={[
                                (date: Date) =>
                                  !selectedEmployeeWorkingDays.includes(date.getDay()),
                              ]}
                            />
                            <p className="mt-2 text-xs text-muted">
                              Días atendidos: {formatWorkingDaysLabel(selectedEmployeeWorkingDays)}.
                            </p>
                          </>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium text-fg-label">Slots disponibles</p>
                        {isLoadingSlots ? (
                          <p className="text-sm text-muted">Calculando disponibilidad...</p>
                        ) : slots.length === 0 ? (
                          <p className="rounded-2xl border border-border-soft bg-surface-soft px-3 py-3 text-sm text-muted">
                            No hay disponibilidad para la fecha seleccionada. Prueba con otro día o
                            vuelve al paso anterior para elegir otro profesional.
                          </p>
                        ) : (
                          <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                            {slots.map((slot) => {
                              const isSelected = slot.start_at_utc === selectedSlotStart;
                              return (
                                <button
                                  key={slot.start_at_utc}
                                  type="button"
                                  onClick={() => setSelectedSlotStart(slot.start_at_utc)}
                                  className={`rounded-xl border px-2.5 py-2 text-xs font-medium transition ${
                                    isSelected
                                      ? 'border-accent bg-accent text-accent-text'
                                      : 'border-border-soft bg-surface text-fg-secondary hover:bg-surface-muted'
                                  }`}
                                >
                                  {formatSlotTime(slot.start_at_utc, availabilityTimezone)}
                                  <span className="mt-0.5 block text-[10px] opacity-80">
                                    {formatCapacityLabel(slot)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={goBack}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-neutral"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Atrás
                        </button>
                        <button
                          type="button"
                          disabled={!selectedSlotStart}
                          onClick={goNext}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent disabled:opacity-60"
                        >
                          Continuar
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : null}

                  {currentStep === 'customer' ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1.5">
                          <span className="text-xs font-medium text-fg-label">Nombre</span>
                          <input
                            value={customerForm.customer_name}
                            onChange={(event) =>
                              setCustomerForm((prev) => ({
                                ...prev,
                                customer_name: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
                            placeholder="Ej: Carlos Ruiz"
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs font-medium text-fg-label">Email</span>
                          <input
                            value={customerForm.customer_email}
                            onChange={(event) =>
                              setCustomerForm((prev) => ({
                                ...prev,
                                customer_email: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
                            placeholder="cliente@correo.com"
                          />
                        </label>
                        <PhoneField
                          idPrefix="public-booking-phone"
                          label="Teléfono"
                          countryIso2={customerForm.customer_phone_country_iso2}
                          nationalNumber={customerForm.customer_phone_national_number}
                          onCountryChange={(value) =>
                            setCustomerForm((prev) => ({
                              ...prev,
                              customer_phone_country_iso2: value,
                            }))
                          }
                          onNationalNumberChange={(value) =>
                            setCustomerForm((prev) => ({
                              ...prev,
                              customer_phone_national_number: value,
                            }))
                          }
                          onClear={() =>
                            setCustomerForm((prev) => ({
                              ...prev,
                              customer_phone_country_iso2: '',
                              customer_phone_national_number: '',
                            }))
                          }
                          wrapperClassName="md:col-span-2"
                          selectTriggerClassName="border-border bg-surface"
                          inputClassName="border-border bg-surface"
                        />
                        <label className="space-y-1.5 md:col-span-2">
                          <span className="text-xs font-medium text-fg-label">Notas</span>
                          <textarea
                            value={customerForm.notes}
                            onChange={(event) =>
                              setCustomerForm((prev) => ({ ...prev, notes: event.target.value }))
                            }
                            className="h-20 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
                            placeholder="Detalles adicionales..."
                          />
                        </label>
                      </div>

                      {isTurnstileEnabled ? (
                        <div className="rounded-2xl border border-border-soft bg-surface-soft p-3">
                          <p className="mb-2 text-xs font-medium text-fg-label">
                            Verificación de seguridad
                          </p>
                          <TurnstileWidget
                            siteKey={TURNSTILE_SITE_KEY}
                            action={TURNSTILE_BOOKING_ACTION}
                            refreshKey={captchaRefreshKey}
                            onTokenChange={setCaptchaToken}
                          />
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={goBack}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-neutral"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Atrás
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCreateBooking()}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent disabled:opacity-60"
                        >
                          <UserRound className="h-4 w-4" />
                          {isSubmitting ? 'Agendando...' : 'Confirmar reserva'}
                        </button>
                      </div>
                    </>
                  ) : null}

                  {currentStep === 'done' ? (
                    <div className="rounded-2xl border border-border-success bg-surface-success p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                        <div>
                          <p className="font-semibold text-success">
                            {createdBooking?.status === 'PENDING'
                              ? 'Solicitud recibida'
                              : 'Reserva confirmada'}
                          </p>
                          <p className="mt-1 text-sm text-fg-secondary">
                            {createdBooking
                              ? `${createdBooking.customer_name} con ${createdBooking.employee?.name ?? 'profesional'}`
                              : 'Reserva creada'}
                          </p>
                          {createdBooking ? (
                            <div className="mt-1 space-y-1 text-sm text-fg-secondary">
                              <p>
                                {formatSlotDate(createdBooking.start_at_utc)} -{' '}
                                {formatSlotTime(createdBooking.start_at_utc)}
                              </p>
                              <p>
                                {createdBooking.party_size}{' '}
                                {createdBooking.party_size === 1 ? 'persona' : 'personas'} ·{' '}
                                {createdBooking.total_price} {createdBooking.currency}
                              </p>
                              <p>
                                {createdBooking.status === 'PENDING'
                                  ? 'El negocio debe confirmar la solicitud.'
                                  : 'La reserva está confirmada.'}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={resetFlow}
                            className="rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-neutral"
                          >
                            Crear otra reserva
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx global>{`
          .booking-step-enter {
            animation: booking-step-enter 220ms ease;
          }

          @keyframes booking-step-enter {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </section>
    </div>
  );
}
