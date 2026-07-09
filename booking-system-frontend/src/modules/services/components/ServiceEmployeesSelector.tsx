'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Users2 } from 'lucide-react';
import { getPhoneDisplay } from '@/modules/phone/utils/phone';
import Avatar from '@/modules/ui/Avatar';
import type { Employee } from '@/types/employee.types';

type ServiceEmployeesSelectorProps = {
  employees: Employee[];
  filteredEmployees: Employee[];
  selectedEmployees: Employee[];
  selectedIds: string[];
  employeeSearch: string;
  onEmployeeSearchChange: (value: string) => void;
  onEmployeeToggle: (employeeId: string) => void;
};

export function ServiceEmployeesSelector({
  employees,
  filteredEmployees,
  selectedEmployees,
  selectedIds,
  employeeSearch,
  onEmployeeSearchChange,
  onEmployeeToggle,
}: ServiceEmployeesSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (!isOpen) {
      return;
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const selectionSummary = useMemo(() => {
    if (selectedEmployees.length === 0) {
      return 'Seleccionar empleados';
    }

    const preview = selectedEmployees
      .slice(0, 2)
      .map((employee) => employee.name)
      .join(', ');

    if (selectedEmployees.length <= 2) {
      return preview;
    }

    return `${preview} +${selectedEmployees.length - 2}`;
  }, [selectedEmployees]);

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-fg-label">Empleados asignados</label>
        <span className="text-xs text-muted">{selectedEmployees.length} seleccionados</span>
      </div>

      {employees.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-muted">
          No hay empleados activos. Crea empleados en el módulo correspondiente.
        </p>
      ) : (
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition hover:border-border-soft"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex -space-x-2">
              {selectedEmployees.length > 0 ? (
                selectedEmployees
                  .slice(0, 2)
                  .map((employee) => (
                    <Avatar
                      key={employee.id}
                      name={employee.name}
                      imageUrl={employee.avatar_url}
                      className="ring-2 ring-surface"
                    />
                  ))
              ) : (
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-subtle text-fg-secondary">
                  <Users2 className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{selectionSummary}</p>
              {selectedEmployees.length > 0 ? (
                <p className="truncate text-xs text-muted">Toca para agregar o quitar empleados.</p>
              ) : null}
            </div>
          </div>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-fg-secondary transition ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}

      {isOpen && employees.length > 0 ? (
        <div className="absolute inset-x-0 top-full z-20 mt-2 rounded-[24px] border border-border-soft bg-surface p-3 shadow-theme-card">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-border-soft bg-surface-subtle px-3 py-1 text-xs text-fg-secondary transition hover:bg-surface"
            >
              Listo
            </button>
          </div>

          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-placeholder" />
            <input
              value={employeeSearch}
              onChange={(event) => onEmployeeSearchChange(event.target.value)}
              className="w-full rounded-2xl border border-border-soft bg-surface-soft py-2.5 pl-9 pr-3 text-sm text-fg outline-none transition focus:border-accent focus:bg-surface"
              placeholder="Buscar por nombre, correo o teléfono"
            />
          </label>

          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredEmployees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                No hay resultados para tu búsqueda.
              </div>
            ) : (
              filteredEmployees.map((employee) => {
                const checked = selectedIds.includes(employee.id);

                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => onEmployeeToggle(employee.id)}
                    className={`group flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition ${
                      checked
                        ? 'border-accent bg-surface-warning-soft shadow-theme-accent-sm'
                        : 'border-border-soft bg-surface-panel-strong hover:border-border-soft hover:bg-surface'
                    }`}
                  >
                    <Avatar name={employee.name} imageUrl={employee.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-fg">{employee.name}</span>
                        <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-fg-secondary">
                          Disponible
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted">{employee.email}</p>
                      <p className="mt-0.5 text-xs text-fg-soft">
                        {getPhoneDisplay({
                          display: employee.phone,
                          countryIso2: employee.phone_country_iso2,
                          nationalNumber: employee.phone_national_number,
                          e164: employee.phone_e164,
                        }) || 'Sin teléfono registrado'}
                      </p>
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                        checked
                          ? 'border-border-warning bg-accent text-accent-text'
                          : 'border-border-soft bg-surface text-transparent group-hover:text-fg-soft'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
