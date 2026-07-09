import type { ButtonHTMLAttributes, ReactNode } from 'react';

type TopIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ariaLabel: string;
  children: ReactNode;
};

export default function TopIconButton({
  children,
  ariaLabel,
  className = '',
  type = 'button',
  ...props
}: TopIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={`grid h-7 w-7 place-items-center rounded-full border border-icon-button-border bg-icon-button text-icon-button-text transition-colors hover:bg-icon-button-hover ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
