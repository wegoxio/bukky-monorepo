import { getPasswordRequirementStatus } from '@/utils/validation';
import { CheckCircle2, Circle } from 'lucide-react';

type PasswordRequirementsProps = {
  password: string;
  className?: string;
};

const REQUIREMENT_ITEMS: Array<{
  key: keyof ReturnType<typeof getPasswordRequirementStatus>;
  label: string;
}> = [
  { key: 'minLength', label: 'Al menos 8 caracteres' },
  { key: 'lowercase', label: 'Una letra minuscula' },
  { key: 'uppercase', label: 'Una letra mayuscula' },
  { key: 'number', label: 'Un número' },
  { key: 'symbol', label: 'Un simbolo' },
];

export default function PasswordRequirements({
  password,
  className = '',
}: PasswordRequirementsProps) {
  const status = getPasswordRequirementStatus(password);

  return (
    <div
      className={`rounded-2xl border border-border-info bg-surface-info px-4 py-3 text-sm ${className}`.trim()}
    >
      <p className="font-medium text-info">Requisitos de contraseña</p>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {REQUIREMENT_ITEMS.map((item) => {
          const isMet = status[item.key];

          return (
            <p
              key={item.key}
              className={`inline-flex items-center gap-2 ${
                isMet ? 'text-success' : 'text-fg-secondary'
              }`}
            >
              {isMet ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" />
              )}
              <span>{item.label}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
