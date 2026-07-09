'use client';

import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useModalPresence } from '@/hooks/useModalPresence';
import BookingsCreatePanel from '@/modules/bookings/components/BookingsCreatePanel';
import type { Booking } from '@/types/booking.types';

type BookingsCreateModalProps = {
  isOpen: boolean;
  token: string | null;
  onClose: () => void;
  onBookingCreated?: (booking: Booking) => Promise<void> | void;
};

export default function BookingsCreateModal({
  isOpen,
  token,
  onClose,
  onBookingCreated,
}: BookingsCreateModalProps): React.ReactNode {
  const { shouldRender, isVisible } = useModalPresence(isOpen, 0);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        type="button"
        aria-label="Cerrar modal"
        className={`absolute inset-0 bg-overlay backdrop-blur-[6px] ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-4xl border border-inverse-60 bg-linear-to-b from-surface-warm to-surface-soft shadow-theme-modal-lg transition ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-soft px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-warning bg-surface-warning px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-warning">
              <Sparkles className="h-3.5 w-3.5" />
              Nueva cita
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-fg-strong">
              Registrar cita
            </h3>
            <p className="mt-1 text-sm text-muted">
              Completa el servicio, profesional y datos del cliente en un flujo más simple.
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <BookingsCreatePanel
            token={token}
            variant="modal"
            onBookingCreated={async (booking) => {
              await onBookingCreated?.(booking);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
