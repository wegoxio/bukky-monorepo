'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { useModalPresence } from '@/hooks/useModalPresence';

type ConfirmActionModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  checkboxLabel?: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmActionModal({
  isOpen,
  title,
  description,
  checkboxLabel = 'Confirmo que quiero aplicar estos cambios.',
  confirmText = 'Confirmar cambios',
  cancelText = 'Cancelar',
  isConfirming = false,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const { shouldRender, isVisible } = useModalPresence(isOpen, 0);

  useEffect(() => {
    if (!shouldRender) {
      setIsChecked(false);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setIsChecked(false);

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  const handleClose = () => {
    if (isConfirming) return;
    onClose();
  };

  const handleConfirm = () => {
    if (!isChecked || isConfirming) return;
    onConfirm();
  };

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        type="button"
        aria-label="Cerrar modal de confirmación"
        className={`absolute inset-0 bg-overlay-strong backdrop-blur-[5px] ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full max-w-xl overflow-hidden rounded-[28px] border border-inverse-60 bg-gradient-to-b from-surface-warm to-surface-soft shadow-theme-modal ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border-soft px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-info bg-surface-info px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-info">
              <ShieldAlert className="h-3.5 w-3.5" />
              Confirmacion
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-fg-strong">
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isConfirming}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-soft bg-surface text-neutral transition-colors hover:bg-secondary-hover disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-border-info bg-surface-info p-4">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-info">
              <CheckCircle2 className="h-4 w-4" />
              Aplicar cambios
            </div>
            <p className="mt-2 text-sm text-info">{description}</p>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-fg-label">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(event) => setIsChecked(event.target.checked)}
              className="mt-0.5"
              disabled={isConfirming}
            />
            <span>{checkboxLabel}</span>
          </label>
        </div>

        <div className="flex flex-col gap-2 border-t border-border-soft bg-inverse-80 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isConfirming}
            className="rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-neutral transition-colors hover:bg-secondary-hover disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isChecked || isConfirming}
            className="rounded-xl bg-info px-4 py-2.5 text-sm font-medium text-inverse shadow-theme-info transition hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConfirming ? 'Aplicando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
