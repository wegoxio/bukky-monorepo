import Avatar from '@/modules/ui/Avatar';
import CalendarDatePicker from '@/modules/ui/CalendarDatePicker';
import PhoneField from '@/modules/ui/PhoneField';
import type { BookingSlot } from '@/types/booking.types';
import type { Employee } from '@/types/employee.types';
import type { Service } from '@/types/service.types';
import { calculateEstimatedTotal } from '@/modules/bookings/utils/money';
import { Clock3, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';

export type BookingCustomerFormState = {
  customer_name: string;
  customer_email: string;
  customer_phone_country_iso2: string;
  customer_phone_national_number: string;
  notes: string;
};

type BookingComposerProps = {
  services: Service[];
  selectedServiceIds: string[];
  onToggleService: (serviceId: string) => void;
  eligibleEmployees: Employee[];
  isLoadingEligibleEmployees: boolean;
  selectedEmployeeId: string;
  onSelectEmployee: (employeeId: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  slots: BookingSlot[];
  isLoadingSlots: boolean;
  selectedSlotStart: string | null;
  onSelectSlot: (slotStart: string) => void;
  requiredDurationMinutes: number | null;
  availabilityTimezone: string | null;
  partySize: number;
  onPartySizeChange: (value: number) => void;
  customerForm: BookingCustomerFormState;
  onCustomerFormChange: (next: BookingCustomerFormState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errorMessage: string;
  isReadyToSubmit: boolean;
  wizardMode?: boolean;
};

const STEP_TITLES = ['Servicios', 'Profesional', 'Fecha y hora', 'Cliente'] as const;
const TOTAL_STEPS = STEP_TITLES.length;

function getTodayDateInput() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatSlotTime(iso: string, timeZone?: string | null) {
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
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

export default function BookingComposer({
  services,
  selectedServiceIds,
  onToggleService,
  eligibleEmployees,
  isLoadingEligibleEmployees,
  selectedEmployeeId,
  onSelectEmployee,
  selectedDate,
  onDateChange,
  slots,
  isLoadingSlots,
  selectedSlotStart,
  onSelectSlot,
  requiredDurationMinutes,
  availabilityTimezone,
  partySize,
  onPartySizeChange,
  customerForm,
  onCustomerFormChange,
  onSubmit,
  isSubmitting,
  errorMessage,
  isReadyToSubmit,
  wizardMode = false,
}: BookingComposerProps): React.ReactNode {
  const [requestedStep, setRequestedStep] = useState(1);

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [services, selectedServiceIds],
  );

  const selectedService = selectedServices[0];
  const totalPrice = selectedService
    ? calculateEstimatedTotal(selectedService.price, partySize, selectedService.pricing_model)
    : '0.00';
  const partySizeOptions = selectedService
    ? Array.from(
        { length: selectedService.max_party_size - selectedService.min_party_size + 1 },
        (_, index) => selectedService.min_party_size + index,
      )
    : [];
  const highestAllowedStep =
    selectedServiceIds.length === 0
      ? 1
      : selectedEmployeeId.length === 0
        ? 2
        : !selectedSlotStart
          ? 3
          : 4;
  const currentStep = wizardMode ? Math.min(requestedStep, highestAllowedStep) : 1;

  const canContinueCurrentStep =
    currentStep === 1
      ? selectedServiceIds.length > 0
      : currentStep === 2
        ? selectedEmployeeId.length > 0
        : currentStep === 3
          ? Boolean(selectedSlotStart)
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
              </button>
            );
          })}
        </div>

        {selectedServices.length > 0 ? (
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px] md:items-end">
            <p className="text-xs text-muted">
              {selectedServices.length} servicio(s) seleccionado(s). Total estimado: {totalPrice}{' '}
              {selectedServices[0]?.currency ?? 'USD'}.
              {selectedService?.pricing_model === 'PER_PERSON'
                ? ' Precio por persona.'
                : ' Precio fijo por reserva.'}
              {selectedService?.requires_confirmation ? ' Requiere confirmación.' : ''}
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

  const scheduleStep = (
    <div>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-surface-warning px-3 py-1 text-xs font-semibold text-warning">
        3<span className="uppercase tracking-[0.14em]">Fecha y hora</span>
      </div>

      <div className="rounded-2xl border border-border-soft bg-surface p-3">
        <label className="mb-2 block text-xs font-medium text-fg-label">Fecha</label>
        <CalendarDatePicker
          minDate={getTodayDateInput()}
          value={selectedDate}
          onChange={onDateChange}
          placeholder="Seleccionar fecha"
          buttonClassName="border-border bg-surface-soft"
        />

        <label className="mb-2 mt-3 block text-xs font-medium text-fg-label">
          Slots disponibles
        </label>
        {isLoadingSlots ? (
          <p className="text-sm text-muted">Calculando disponibilidad...</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted">No hay slots para la fecha seleccionada.</p>
        ) : (
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((slot) => {
              const isSelected = slot.start_at_utc === selectedSlotStart;
              return (
                <button
                  key={slot.start_at_utc}
                  type="button"
                  onClick={() => onSelectSlot(slot.start_at_utc)}
                  className={`rounded-xl border px-2.5 py-2 text-xs font-medium transition ${
                    isSelected
                      ? 'border-accent bg-accent text-accent-text'
                      : 'border-border-soft bg-surface-soft text-fg-secondary hover:bg-surface-muted'
                  }`}
                >
                  {formatSlotTime(slot.start_at_utc, availabilityTimezone)}
                  <span className="mt-0.5 block text-[10px] opacity-80">
                    {slot.available_capacity} plaza(s) libre(s)
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {requiredDurationMinutes ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
            <Clock3 className="h-3.5 w-3.5 text-fg-icon" />
            Duración estimada: {formatDuration(requiredDurationMinutes)}.
          </p>
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
          idPrefix="booking-customer-phone"
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
          ? scheduleStep
          : customerStep;

  return (
    <div className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-fg-strong">Agendar cita</h3>
        <p className="text-sm text-muted">
          Sigue este orden: servicio, profesional, horario y datos del cliente.
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
            {scheduleStep}
            {customerStep}
          </>
        )}

        {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}

        {wizardMode ? (
          <div className="flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              Completa cada paso para continuar sin perder contexto.
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
                  {isSubmitting ? 'Agendando...' : 'Agendar cita'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              Solo se muestran slots realmente disponibles para ese profesional.
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!isReadyToSubmit || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent disabled:opacity-60"
            >
              <UserRound className="h-4 w-4" />
              {isSubmitting ? 'Agendando...' : 'Agendar cita'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
