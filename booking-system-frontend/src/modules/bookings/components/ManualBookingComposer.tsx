import Avatar from '@/modules/ui/Avatar';
import CalendarDatePicker from '@/modules/ui/CalendarDatePicker';
import PhoneField from '@/modules/ui/PhoneField';
import type { BookingStatus } from '@/types/booking.types';
import type { Employee } from '@/types/employee.types';
import type { Service } from '@/types/service.types';
import { Clock3, ShieldAlert, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BookingCustomerFormState } from './BookingComposer';

export type ManualBookingStatusSelection = '' | BookingStatus;

type ManualBookingComposerProps = {
  services: Service[];
  selectedServiceIds: string[];
  onToggleService: (serviceId: string) => void;
  eligibleEmployees: Employee[];
  isLoadingEligibleEmployees: boolean;
  selectedEmployeeId: string;
  onSelectEmployee: (employeeId: string) => void;
  manualDate: string;
  onManualDateChange: (date: string) => void;
  manualTime: string;
  manualTimezone: string;
  onManualTimeChange: (time: string) => void;
  manualStatus: ManualBookingStatusSelection;
  onManualStatusChange: (status: ManualBookingStatusSelection) => void;
  allowOverlap: boolean;
  onAllowOverlapChange: (value: boolean) => void;
  cancellationReason: string;
  onCancellationReasonChange: (value: string) => void;
  partySize: number;
  onPartySizeChange: (value: number) => void;
  customerForm: BookingCustomerFormState;
  onCustomerFormChange: (next: BookingCustomerFormState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errorMessage: string;
  estimatedDurationMinutes: number | null;
  estimatedTotalPrice: number;
  wizardMode?: boolean;
};

const STEP_TITLES = ['Servicios', 'Profesional', 'Fecha y control', 'Cliente'] as const;
const TOTAL_STEPS = STEP_TITLES.length;

const STATUS_OPTIONS: Array<{ value: ManualBookingStatusSelection; label: string }> = [
  { value: '', label: 'Automatico' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'NO_SHOW', label: 'No asistio' },
];

function formatDuration(minutes: number | null) {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function isCancellationStatus(status: ManualBookingStatusSelection) {
  return status === 'CANCELLED' || status === 'NO_SHOW';
}

export default function ManualBookingComposer({
  services,
  selectedServiceIds,
  onToggleService,
  eligibleEmployees,
  isLoadingEligibleEmployees,
  selectedEmployeeId,
  onSelectEmployee,
  manualDate,
  onManualDateChange,
  manualTime,
  manualTimezone,
  onManualTimeChange,
  manualStatus,
  onManualStatusChange,
  allowOverlap,
  onAllowOverlapChange,
  cancellationReason,
  onCancellationReasonChange,
  partySize,
  onPartySizeChange,
  customerForm,
  onCustomerFormChange,
  onSubmit,
  isSubmitting,
  errorMessage,
  estimatedDurationMinutes,
  estimatedTotalPrice,
  wizardMode = false,
}: ManualBookingComposerProps): React.ReactNode {
  const [requestedStep, setRequestedStep] = useState(1);

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [services, selectedServiceIds],
  );
  const selectedService = selectedServices[0];
  const partySizeOptions = selectedService
    ? Array.from({ length: Math.max(1, selectedService.max_party_size) }, (_, index) => index + 1)
    : [];

  const isReadyToSubmit =
    selectedServiceIds.length > 0 &&
    selectedEmployeeId.length > 0 &&
    manualDate.length > 0 &&
    manualTime.length > 0 &&
    customerForm.customer_name.trim().length > 0 &&
    (!isCancellationStatus(manualStatus) || cancellationReason.trim().length > 0);

  const isStepThreeValid =
    manualDate.length > 0 &&
    manualTime.length > 0 &&
    (!isCancellationStatus(manualStatus) || cancellationReason.trim().length > 0);

  const highestAllowedStep =
    selectedServiceIds.length === 0
      ? 1
      : selectedEmployeeId.length === 0
        ? 2
        : !isStepThreeValid
          ? 3
          : 4;
  const currentStep = wizardMode ? Math.min(requestedStep, highestAllowedStep) : 1;

  const canContinueCurrentStep =
    currentStep === 1
      ? selectedServiceIds.length > 0
      : currentStep === 2
        ? selectedEmployeeId.length > 0
        : currentStep === 3
          ? isStepThreeValid
          : isReadyToSubmit;

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  const servicesStep = (
    <div>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-surface-warning px-3 py-1 text-xs font-semibold text-warning">
        1<span className="uppercase tracking-[0.14em]">Servicios</span>
      </div>

      <div className="rounded-2xl border border-border-soft bg-surface p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const selected = selectedServiceIds.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onToggleService(service.id)}
                className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                  selected
                    ? 'border-accent bg-surface-warning-soft'
                    : 'border-border-soft bg-surface hover:border-border'
                }`}
              >
                <p className="text-sm font-semibold text-fg-strong">{service.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {service.duration_minutes} min - {service.price} {service.currency}
                </p>
                {service.instructions ? (
                  <p className="mt-2 text-xs text-warning">Indicaciones: {service.instructions}</p>
                ) : null}
              </button>
            );
          })}
        </div>

        {selectedServices.length > 0 ? (
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px] md:items-end">
            <p className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <Clock3 className="h-3.5 w-3.5 text-fg-icon" />
              {selectedServices.length} servicio(s) seleccionado(s). Duración estimada:{' '}
              {formatDuration(estimatedDurationMinutes)}. Total estimado:{' '}
              {estimatedTotalPrice.toFixed(2)} {selectedServices[0]?.currency ?? 'USD'}.
            </p>
            {selectedService ? (
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-fg-label">Personas</span>
                <select
                  value={partySize}
                  onChange={(event) => onPartySizeChange(Number(event.target.value))}
                  className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-fg"
                >
                  {partySizeOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">Selecciona al menos un servicio para continuar.</p>
        )}
      </div>
    </div>
  );

  const professionalStep = (
    <div>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-surface-warning px-3 py-1 text-xs font-semibold text-warning">
        2<span className="uppercase tracking-[0.14em]">Profesional</span>
      </div>

      <div className="rounded-2xl border border-border-soft bg-surface p-3">
        {selectedServiceIds.length === 0 ? (
          <p className="text-sm text-muted">
            Selecciona servicios para mostrar profesionales compatibles.
          </p>
        ) : isLoadingEligibleEmployees ? (
          <p className="text-sm text-muted">Buscando profesionales...</p>
        ) : eligibleEmployees.length === 0 ? (
          <p className="text-sm text-muted">
            No hay profesionales activos para esta combinacion de servicios.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {eligibleEmployees.map((employee) => {
              const selected = selectedEmployeeId === employee.id;
              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => onSelectEmployee(employee.id)}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? 'border-accent bg-surface-warning-soft'
                      : 'border-border-soft bg-surface hover:border-border'
                  }`}
                >
                  <Avatar name={employee.name} imageUrl={employee.avatar_url} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">
                      {employee.name}
                    </span>
                    <span className="block truncate text-xs text-muted">{employee.email}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const schedulingStep = (
    <div>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-surface-warning px-3 py-1 text-xs font-semibold text-warning">
        3<span className="uppercase tracking-[0.14em]">Fecha, hora y control</span>
      </div>

      <div className="rounded-2xl border border-border-soft bg-surface p-3">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-fg-label">
              Fecha
            </span>
            <CalendarDatePicker
              value={manualDate}
              onChange={onManualDateChange}
              placeholder="Seleccionar fecha"
              buttonClassName="border-border bg-surface-soft"
            />
          </label>

          <label className="space-y-1.5">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-fg-label">
              <Clock3 className="h-4 w-4 text-fg-icon" />
              Hora
            </span>
            <input
              type="time"
              value={manualTime}
              onChange={(event) => onManualTimeChange(event.target.value)}
              step={300}
              className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-fg"
            />
            <span className="block text-[11px] text-muted">
              Zona horaria del profesional: {manualTimezone}
            </span>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-fg-label">Estado inicial</span>
            <select
              value={manualStatus}
              onChange={(event) =>
                onManualStatusChange(event.target.value as ManualBookingStatusSelection)
              }
              className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-fg"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'auto'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-muted">
          {manualStatus
            ? `Se guardara como ${STATUS_OPTIONS.find((option) => option.value === manualStatus)?.label?.toLowerCase()}.`
            : 'Automatico: futuras como pendientes y pasadas como completadas.'}
        </p>

        <label className="mt-3 flex items-start gap-2 rounded-2xl border border-border-warning bg-surface-warning-soft px-4 py-3 text-sm text-warning">
          <input
            type="checkbox"
            checked={allowOverlap}
            onChange={(event) => onAllowOverlapChange(event.target.checked)}
          />
          <span>
            Forzar registro si choca con agenda.
            <span className="mt-1 block text-xs text-warning">
              Util solo para walk-ins, atrasos operativos o carga historica.
            </span>
          </span>
        </label>

        {isCancellationStatus(manualStatus) ? (
          <label className="mt-3 block space-y-2">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-fg-label">
              <ShieldAlert className="h-4 w-4 text-danger" />
              Motivo
            </span>
            <textarea
              value={cancellationReason}
              onChange={(event) => onCancellationReasonChange(event.target.value)}
              rows={4}
              maxLength={500}
              className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none transition focus:border-accent"
              placeholder="Ej: cliente cancelo de ultima hora, no asistio, se reagendo..."
            />
          </label>
        ) : null}
      </div>
    </div>
  );

  const customerStep = (
    <div>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-surface-warning px-3 py-1 text-xs font-semibold text-warning">
        4<span className="uppercase tracking-[0.14em]">Cliente</span>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border-soft bg-surface p-3 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-label">Nombre</span>
          <input
            value={customerForm.customer_name}
            onChange={(event) =>
              onCustomerFormChange({
                ...customerForm,
                customer_name: event.target.value,
              })
            }
            className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-fg"
            placeholder="Ej: Carlos Ruiz"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-label">Email</span>
          <input
            value={customerForm.customer_email}
            onChange={(event) =>
              onCustomerFormChange({
                ...customerForm,
                customer_email: event.target.value,
              })
            }
            className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-fg"
            placeholder="cliente@correo.com"
            type="email"
          />
        </label>

        <PhoneField
          idPrefix="manual-booking-customer-phone"
          label="Teléfono"
          countryIso2={customerForm.customer_phone_country_iso2}
          nationalNumber={customerForm.customer_phone_national_number}
          onCountryChange={(value) =>
            onCustomerFormChange({
              ...customerForm,
              customer_phone_country_iso2: value,
            })
          }
          onNationalNumberChange={(value) =>
            onCustomerFormChange({
              ...customerForm,
              customer_phone_national_number: value,
            })
          }
          onClear={() =>
            onCustomerFormChange({
              ...customerForm,
              customer_phone_country_iso2: '',
              customer_phone_national_number: '',
            })
          }
          wrapperClassName="md:col-span-2"
          selectTriggerClassName="border-border bg-surface-soft"
          inputClassName="border-border bg-surface-soft"
        />

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-xs font-medium text-fg-label">Notas</span>
          <textarea
            value={customerForm.notes}
            onChange={(event) =>
              onCustomerFormChange({
                ...customerForm,
                notes: event.target.value,
              })
            }
            className="h-20 w-full resize-none rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-fg"
            placeholder="Detalles adicionales de la cita..."
          />
        </label>
      </div>
    </div>
  );

  const wizardStepContent =
    currentStep === 1
      ? servicesStep
      : currentStep === 2
        ? professionalStep
        : currentStep === 3
          ? schedulingStep
          : customerStep;

  return (
    <div className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-fg-strong">Registro manual</h3>
        <p className="text-sm text-muted">
          Para walk-ins, citas telefonicas o historial pasado cargado por el comercio.
        </p>
      </div>

      {wizardMode ? (
        <div className="mb-4 rounded-2xl border border-border-soft bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-warning">
              Paso {currentStep} de {TOTAL_STEPS}
            </span>
            <span className="text-fg-secondary">{STEP_TITLES[currentStep - 1]}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-soft">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-5">
        {wizardMode ? (
          <div key={currentStep} style={{ animation: 'bookingWizardStepIn 220ms ease-out' }}>
            {wizardStepContent}
          </div>
        ) : (
          <>
            {servicesStep}
            {professionalStep}
            {schedulingStep}
            {customerStep}
          </>
        )}

        {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}

        {wizardMode ? (
          <div className="flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              Avanza por pasos para registrar solo la info necesaria en cada momento.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setRequestedStep((prev) => Math.max(1, prev - 1))}
                disabled={currentStep === 1 || isSubmitting}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg-secondary transition hover:bg-surface-soft disabled:opacity-60"
              >
                Anterior
              </button>

              {currentStep < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={() => setRequestedStep((prev) => Math.min(TOTAL_STEPS, prev + 1))}
                  disabled={!canContinueCurrentStep || isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent disabled:opacity-60"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!isReadyToSubmit || isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent disabled:opacity-60"
                >
                  <UserRound className="h-4 w-4" />
                  {isSubmitting ? 'Guardando...' : 'Registrar manualmente'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              Por defecto valida agenda real. Activa la sobreescritura solo cuando realmente
              necesites forzar el registro.
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!isReadyToSubmit || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent disabled:opacity-60"
            >
              <UserRound className="h-4 w-4" />
              {isSubmitting ? 'Guardando...' : 'Registrar manualmente'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
