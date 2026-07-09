import SelectField, { type SelectOption } from '@/modules/ui/SelectField';
import type { Employee } from '@/types/employee.types';
import type { ServiceFormState } from '@/types/service.types';
import { useState } from 'react';
import { ServiceEmployeesSelector } from './ServiceEmployeesSelector';

type ServiceEditModalContentProps = {
  form: ServiceFormState;
  isEditing: boolean;
  activeEmployees: Employee[];
  filteredEmployees: Employee[];
  selectedEmployees: Employee[];
  employeeSearch: string;
  onFormChange: (updater: (prev: ServiceFormState) => ServiceFormState) => void;
  onEmployeeSearchChange: (value: string) => void;
  onEmployeeToggle: (employeeId: string) => void;
};

const BASE_DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180];
const BASE_CAPACITY_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);
const BASE_CURRENCY_OPTIONS = ['USD', 'EUR', 'DOP', 'MXN', 'COP'];

function buildNumberOptions(
  baseValues: number[],
  currentValue: number,
  labelFormatter: (value: number) => string,
): SelectOption[] {
  const values = new Set(baseValues);
  values.add(currentValue);

  return Array.from(values)
    .sort((a, b) => a - b)
    .map((value) => ({
      value: String(value),
      label: labelFormatter(value),
    }));
}

function buildCurrencyOptions(currentValue: string): SelectOption[] {
  const values = new Set(BASE_CURRENCY_OPTIONS);
  const normalizedCurrent = currentValue.trim().toUpperCase();
  if (normalizedCurrent) {
    values.add(normalizedCurrent);
  }

  return Array.from(values)
    .sort()
    .map((currency) => ({
      value: currency,
      label: currency,
    }));
}

export default function ServiceEditModalContent({
  form,
  isEditing,
  activeEmployees,
  filteredEmployees,
  selectedEmployees,
  employeeSearch,
  onFormChange,
  onEmployeeSearchChange,
  onEmployeeToggle,
}: ServiceEditModalContentProps): React.ReactNode {
  const durationOptions = buildNumberOptions(
    BASE_DURATION_OPTIONS,
    form.duration_minutes,
    (value) => `${value} min`,
  );
  const capacityOptions = buildNumberOptions(
    BASE_CAPACITY_OPTIONS,
    Math.max(form.min_party_size, form.max_party_size, form.slot_capacity),
    (value) => `${value} persona${value === 1 ? '' : 's'}`,
  );
  const currencyOptions = buildCurrencyOptions(form.currency);
  const [priceInputOverride, setPriceInputOverride] = useState<string | null>(null);
  const priceInput = priceInputOverride ?? (Number.isFinite(form.price) ? String(form.price) : '');

  return (
    <div className="space-y-4">
      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="space-y-1.5">
          <label htmlFor="service-name" className="text-sm font-medium text-fg-label">
            Nombre
          </label>
          <input
            id="service-name"
            value={form.name}
            onChange={(event) => onFormChange((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            placeholder="Ej: Corte + Barba"
            required
          />
        </div>

        <ServiceEmployeesSelector
          employees={activeEmployees}
          filteredEmployees={filteredEmployees}
          selectedEmployees={selectedEmployees}
          selectedIds={form.employee_ids}
          employeeSearch={employeeSearch}
          onEmployeeSearchChange={onEmployeeSearchChange}
          onEmployeeToggle={onEmployeeToggle}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <label htmlFor="service-duration" className="text-sm font-medium text-fg-label">
            Duración (min)
          </label>
          <SelectField
            value={String(form.duration_minutes)}
            onValueChange={(value) =>
              onFormChange((prev) => ({
                ...prev,
                duration_minutes: Number(value),
              }))
            }
            options={durationOptions}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="service-min-capacity" className="text-sm font-medium text-fg-label">
            Mín. personas
          </label>
          <SelectField
            value={String(form.min_party_size)}
            onValueChange={(value) => {
              const nextMinCapacity = Number(value);
              onFormChange((prev) => ({
                ...prev,
                min_party_size: nextMinCapacity,
                max_party_size: Math.max(prev.max_party_size, nextMinCapacity),
                slot_capacity: Math.max(prev.slot_capacity, prev.max_party_size, nextMinCapacity),
                min_capacity: nextMinCapacity,
              }));
            }}
            options={capacityOptions}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="service-max-capacity" className="text-sm font-medium text-fg-label">
            Máx. personas
          </label>
          <SelectField
            value={String(form.max_party_size)}
            onValueChange={(value) => {
              const nextMaxCapacity = Number(value);
              onFormChange((prev) => ({
                ...prev,
                max_party_size: nextMaxCapacity,
                min_party_size: Math.min(prev.min_party_size, nextMaxCapacity),
                slot_capacity: Math.max(prev.slot_capacity, nextMaxCapacity),
                max_capacity: nextMaxCapacity,
              }));
            }}
            options={capacityOptions}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-fg-label">Capacidad total del horario</label>
          <SelectField
            value={String(form.slot_capacity)}
            onValueChange={(value) => {
              const slotCapacity = Number(value);
              onFormChange((prev) => ({
                ...prev,
                slot_capacity: slotCapacity,
                max_party_size: Math.min(prev.max_party_size, slotCapacity),
                capacity: slotCapacity,
              }));
            }}
            options={capacityOptions}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-fg-label">Modelo de precio</label>
          <SelectField
            value={form.pricing_model}
            onValueChange={(value) =>
              onFormChange((prev) => ({
                ...prev,
                pricing_model: value as 'FLAT' | 'PER_PERSON',
              }))
            }
            options={[
              { value: 'FLAT', label: 'Fijo por reserva' },
              { value: 'PER_PERSON', label: 'Por persona' },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="service-price" className="text-sm font-medium text-fg-label">
            {form.pricing_model === 'PER_PERSON' ? 'Precio por persona' : 'Precio por reserva'}
          </label>
          <input
            id="service-price"
            type="number"
            min={0}
            step={0.01}
            value={priceInput}
            onChange={(event) => {
              const nextValue = event.target.value;
              setPriceInputOverride(nextValue);

              if (nextValue === '') {
                onFormChange((prev) => ({ ...prev, price: Number.NaN }));
                return;
              }

              const parsedValue = Number(nextValue);
              onFormChange((prev) => ({
                ...prev,
                price: Number.isFinite(parsedValue) ? parsedValue : Number.NaN,
              }));
            }}
            onBlur={() => {
              if (priceInput === '') return;
              const parsedValue = Number(priceInput);
              if (!Number.isFinite(parsedValue)) return;
              setPriceInputOverride(null);
              onFormChange((prev) => ({ ...prev, price: parsedValue }));
            }}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="service-currency" className="text-sm font-medium text-fg-label">
            Moneda
          </label>
          <SelectField
            value={form.currency.trim().toUpperCase()}
            onValueChange={(value) =>
              onFormChange((prev) => ({ ...prev, currency: value.toUpperCase() }))
            }
            options={currencyOptions}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="service-description" className="text-sm font-medium text-fg-label">
          Descripción
        </label>
        <textarea
          id="service-description"
          value={form.description}
          onChange={(event) =>
            onFormChange((prev) => ({ ...prev, description: event.target.value }))
          }
          className="min-h-28 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
          placeholder="Describe el valor del servicio, detalles o notas internas"
          maxLength={1000}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="service-instructions" className="text-sm font-medium text-fg-label">
          Instrucciones previas
        </label>
        <textarea
          id="service-instructions"
          value={form.instructions}
          onChange={(event) =>
            onFormChange((prev) => ({ ...prev, instructions: event.target.value }))
          }
          className="min-h-24 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
          placeholder="Ej: llegar con 10 minutos de antelación, traer referencia, evitar lavado previo..."
          maxLength={2000}
        />
        <p className="text-xs text-muted">
          Campo opcional. Se mostrará en el flujo de reserva y también se enviará por correo.
        </p>
      </div>

      <label className="flex items-start gap-2 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-fg-label">
        <input
          type="checkbox"
          checked={form.requires_confirmation}
          onChange={(event) =>
            onFormChange((prev) => ({
              ...prev,
              requires_confirmation: event.target.checked,
            }))
          }
        />
        <span>
          Requiere confirmación
          <span className="mt-1 block text-xs text-muted">
            Las reservas entran como pendientes hasta que el negocio las confirme.
          </span>
        </span>
      </label>

      {isEditing ? (
        <label className="flex items-center gap-2 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-fg-label">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) =>
              onFormChange((prev) => ({ ...prev, is_active: event.target.checked }))
            }
          />
          Servicio activo
        </label>
      ) : null}
    </div>
  );
}
