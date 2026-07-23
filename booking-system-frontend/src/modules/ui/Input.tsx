import { AnimatePresence, motion } from 'framer-motion';
import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  containerClassName?: string;
  helperText?: string;
  errorMessage?: string;
};

export default function Input({
  label,
  id,
  name,
  className = '',
  containerClassName = '',
  helperText,
  errorMessage,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: InputProps) {
  const inputId = id ?? name;
  const message = errorMessage || helperText;
  const messageId =
    inputId && message ? `${inputId}-${errorMessage ? 'error' : 'helper'}` : undefined;
  const describedBy = [ariaDescribedBy, messageId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-fg-strong">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-describedby={describedBy}
        aria-invalid={errorMessage ? true : ariaInvalid}
        className={`bg-surface-soft border border-border rounded-lg text-neutral w-full p-2.5 ${className}`.trim()}
        {...props}
      />
      <AnimatePresence initial={false}>
        {message ? (
          <motion.p
            key={messageId}
            id={messageId}
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -3, height: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`mt-2 overflow-hidden text-xs ${
              errorMessage ? 'text-danger' : 'text-fg-secondary'
            }`.trim()}
          >
            {message}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
