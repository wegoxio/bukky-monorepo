import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  containerClassName?: string;
};

export default function Input({
  label,
  id,
  name,
  className = '',
  containerClassName = '',
  ...props
}: InputProps) {
  const inputId = id ?? name;

  return (
    <div className={containerClassName}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-fg-strong">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={`bg-surface-soft border border-border rounded-lg text-neutral w-full p-2.5 ${className}`.trim()}
        {...props}
      />
    </div>
  );
}
