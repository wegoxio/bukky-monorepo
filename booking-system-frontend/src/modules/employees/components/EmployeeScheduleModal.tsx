'use client';

import { useModalPresence } from '@/hooks/useModalPresence';
import type { Employee } from '@/types/employee.types';
import { CalendarClock, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const BookingsSchedulePanel = dynamic(
  () => import('@/modules/bookings/components/BookingsSchedulePanel'),
  {
    ssr: false,
    loading: () => (
      <div className="inline-flex items-center gap-2 text-sm text-muted">
        Cargando configurador de horario...
      </div>
    ),
  },
);

type EmployeeScheduleModalProps = {
  isOpen: boolean;
  token: string | null;
  employees: Employee[];
  selectedEmployeeId: string;
  onSelectEmployee: (employeeId: string) => void;
  onClose: () => void;
};

export default function EmployeeScheduleModal({
  isOpen,
  token,
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  onClose,
}: EmployeeScheduleModalProps): React.ReactNode {
  const { shouldRender, isVisible } = useModalPresence(isOpen, 0);

  useEffect(() => {
    if (!shouldRender) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        type="button"
        aria-label="Cerrar modal"
        className={`absolute inset-0 bg-overlay ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-inverse-60 bg-gradient-to-b from-surface-warm to-surface-soft shadow-theme-modal-lg ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-soft px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-warning bg-surface-warning px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-warning">
              <CalendarClock className="h-3.5 w-3.5" />
              Horario
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-fg-strong">
              Configurar agenda profesional
            </h3>
            <p className="mt-1 text-sm text-muted">
              {selectedEmployee
                ? `Editando horario de ${selectedEmployee.name}.`
                : 'Selecciona y configura horas de trabajo, descansos y bloqueos.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-soft bg-surface text-neutral transition-colors hover:bg-secondary-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <BookingsSchedulePanel
            token={token}
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={onSelectEmployee}
          />
        </div>
      </div>
    </div>
  );
}
