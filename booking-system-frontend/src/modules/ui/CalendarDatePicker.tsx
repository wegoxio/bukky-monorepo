'use client';

import * as Popover from '@radix-ui/react-popover';
import { CalendarDays } from 'lucide-react';
import { type CSSProperties, useMemo, useState } from 'react';
import { DayPicker, type Matcher } from 'react-day-picker';
import 'react-day-picker/style.css';

type CalendarDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  placeholder?: string;
  buttonClassName?: string;
  disabledMatchers?: Matcher | Matcher[];
};

function parseDateString(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  const date = parseDateString(value);
  if (!date) return 'Seleccionar fecha';
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export default function CalendarDatePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Seleccionar fecha',
  buttonClassName = '',
  disabledMatchers,
}: CalendarDatePickerProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDate = useMemo(() => parseDateString(value), [value]);
  const minDateValue = useMemo(() => parseDateString(minDate ?? ''), [minDate]);
  const resolvedDisabledMatchers = useMemo(() => {
    const matchers = [
      ...(minDateValue ? [{ before: minDateValue }] : []),
      ...(Array.isArray(disabledMatchers)
        ? disabledMatchers
        : disabledMatchers
          ? [disabledMatchers]
          : []),
    ];

    return matchers.length > 0 ? matchers : undefined;
  }, [disabledMatchers, minDateValue]);

  const calendarThemeStyle = {
    '--rdp-accent-color': 'var(--primary-accent)',
    '--rdp-accent-background-color': 'var(--surface-warning-soft)',
    '--rdp-day_button-border-radius': '10px',
  } as CSSProperties;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline-flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface px-3 text-sm text-fg transition hover:bg-surface-soft ${buttonClassName}`.trim()}
        >
          <span>{value ? formatDisplayDate(value) : placeholder}</span>
          <CalendarDays className="h-4 w-4 text-fg-icon" />
        </button>
      </Popover.Trigger>

      {isOpen ? (
        <Popover.Portal>
          <Popover.Content
            sideOffset={8}
            className="z-[80] rounded-2xl border border-border bg-surface p-3 shadow-theme-card"
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              defaultMonth={selectedDate ?? minDateValue ?? new Date()}
              onSelect={(nextDate) => {
                if (!nextDate) return;
                onChange(toDateString(nextDate));
                setIsOpen(false);
              }}
              disabled={resolvedDisabledMatchers}
              weekStartsOn={1}
              showOutsideDays
              className="text-fg"
              style={calendarThemeStyle}
            />
          </Popover.Content>
        </Popover.Portal>
      ) : null}
    </Popover.Root>
  );
}
