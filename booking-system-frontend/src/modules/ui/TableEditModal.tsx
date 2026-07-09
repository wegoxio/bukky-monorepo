'use client';

import { FormEventHandler, ReactNode, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useModalPresence } from '@/hooks/useModalPresence';

interface TableEditModalProps {
  isOpen: boolean;
  badgeLabel: string;
  badgeIcon?: ReactNode;
  title: string;
  description: string;
  helperText?: string;
  errorMessage?: string;
  submitText: string;
  cancelText?: string;
  isSubmitting?: boolean;
  maxWidthClassName?: string;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

type TableEditModalSnapshot = Pick<
  TableEditModalProps,
  | 'badgeLabel'
  | 'badgeIcon'
  | 'title'
  | 'description'
  | 'helperText'
  | 'errorMessage'
  | 'submitText'
  | 'cancelText'
  | 'isSubmitting'
  | 'maxWidthClassName'
  | 'onSubmit'
  | 'children'
>;

export default function TableEditModal({
  isOpen,
  badgeLabel,
  badgeIcon,
  title,
  description,
  helperText,
  errorMessage,
  submitText,
  cancelText = 'Cancelar',
  isSubmitting = false,
  maxWidthClassName = 'max-w-3xl',
  onClose,
  onSubmit,
  children,
}: TableEditModalProps): React.ReactNode {
  const { shouldRender, isVisible } = useModalPresence(isOpen, 0);
  const [closingSnapshot, setClosingSnapshot] = useState<TableEditModalSnapshot | null>(null);

  const liveSnapshot = useMemo<TableEditModalSnapshot>(
    () => ({
      badgeLabel,
      badgeIcon,
      title,
      description,
      helperText,
      errorMessage,
      submitText,
      cancelText,
      isSubmitting,
      maxWidthClassName,
      onSubmit,
      children,
    }),
    [
      badgeLabel,
      badgeIcon,
      title,
      description,
      helperText,
      errorMessage,
      submitText,
      cancelText,
      isSubmitting,
      maxWidthClassName,
      onSubmit,
      children,
    ],
  );

  useEffect(() => {
    if (isOpen) {
      setClosingSnapshot(liveSnapshot);
      return;
    }

    if (!shouldRender) {
      setClosingSnapshot(null);
    }
  }, [isOpen, liveSnapshot, shouldRender]);

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

  const isClosing = !isOpen && shouldRender;
  const view = isClosing && closingSnapshot ? closingSnapshot : liveSnapshot;

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
        className={`relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-4xl border border-inverse-60 bg-gradient-to-b from-surface-warm to-surface-soft shadow-theme-modal-lg ${
          isVisible ? 'opacity-100' : 'opacity-0'
        } ${view.maxWidthClassName}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-soft px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-warning bg-surface-warning px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-warning">
              {view.badgeIcon}
              {view.badgeLabel}
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-fg-strong">
              {view.title}
            </h3>
            <p className="mt-1 text-sm text-muted">{view.description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-soft bg-surface text-neutral transition-colors hover:bg-secondary-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={view.onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{view.children}</div>

          <div className="border-t border-border-soft bg-inverse-75 px-6 py-4">
            {view.errorMessage && <p className="mb-3 text-sm text-danger">{view.errorMessage}</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">{view.helperText}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-neutral transition-colors hover:bg-secondary-hover"
                >
                  {view.cancelText}
                </button>
                <button
                  type="submit"
                  disabled={view.isSubmitting}
                  className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent transition hover:brightness-[0.98] disabled:opacity-60"
                >
                  {view.submitText}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
