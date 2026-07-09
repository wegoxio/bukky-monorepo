import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export default function Button({ type = 'button', className = '', ...props }: ButtonProps) {
  return <button type={type} className={`button ${className}`.trim()} {...props} />;
}
