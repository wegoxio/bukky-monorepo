import { Plus, Search } from 'lucide-react';

interface TableHeaderProps {
  title: string;
  subtitle: string;
  inputStateValue: string;
  inputOnchange: (parameter: string) => void;
  buttonOnOpen: () => void;
  buttonLabel: string;
  searchPlaceholder?: string;
}

export default function TableHeader({
  title,
  subtitle,
  inputStateValue,
  inputOnchange,
  buttonOnOpen,
  buttonLabel,
  searchPlaceholder = 'Buscar por nombre o slug',
}: TableHeaderProps): React.ReactNode {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-lg font-semibold text-fg-strong">{title}</h3>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-65">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-placeholder" />
          <input
            value={inputStateValue}
            onChange={(event) => inputOnchange(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-fg outline-none transition focus:border-accent"
            placeholder={searchPlaceholder}
          />
        </label>
        <button
          type="button"
          onClick={buttonOnOpen}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent transition hover:brightness-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
