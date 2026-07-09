import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export default function Card({ className = '', elevated = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-card-border bg-surface-panel ${
        elevated ? 'shadow-theme-soft-sm' : ''
      } ${className}`.trim()}
      {...props}
    />
  );
}
