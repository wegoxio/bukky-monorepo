'use client';

import * as Popover from '@radix-ui/react-popover';
import {
  getPhoneCountryFlag,
  getPhoneCountryOption,
  normalizePhoneCountryIso2,
} from '@/modules/phone/utils/phone';
import type { PhoneCountryOption } from '@/modules/phone/constants/phone-country-options';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type PhoneCountrySelectProps = {
  value: string;
  defaultValue: string;
  options: PhoneCountryOption[];
  onValueChange: (value: string) => void;
  triggerClassName?: string;
  disabled?: boolean;
};

function getSearchText(option: PhoneCountryOption): string {
  return `${option.label} ${option.dialCode} ${option.iso2}`.toLowerCase();
}

export default function PhoneCountrySelect({
  value,
  defaultValue,
  options,
  onValueChange,
  triggerClassName = '',
  disabled = false,
}: PhoneCountrySelectProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const effectiveValue = normalizePhoneCountryIso2(value || defaultValue);
  const selectedOption = getPhoneCountryOption(effectiveValue);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => getSearchText(option).includes(normalizedQuery));
  }, [options, searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`inline-flex h-12 w-full items-center justify-between rounded-2xl border border-border bg-surface px-3 text-sm text-fg outline-none transition hover:bg-surface-soft focus:border-accent disabled:opacity-60 ${triggerClassName}`.trim()}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <span className="text-base leading-none">
              {getPhoneCountryFlag(selectedOption?.iso2)}
            </span>
            <span className="truncate font-medium text-fg-strong">
              {selectedOption?.dialCode ?? '+00'}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-fg-icon" />
        </button>
      </Popover.Trigger>

      {isOpen ? (
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={8}
            avoidCollisions={false}
            className="z-[90] w-[320px] rounded-2xl border border-border bg-surface p-2 shadow-theme-card"
          >
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3">
              <Search className="h-4 w-4 text-fg-placeholder" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar país o prefijo"
                className="h-11 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-placeholder"
              />
            </div>

            <div className="max-h-72 overflow-y-auto pr-1">
              {filteredOptions.length === 0 ? (
                <div className="rounded-xl px-3 py-5 text-sm text-muted">
                  No hay resultados para esa búsqueda.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((option) => {
                    const isSelected = option.iso2 === effectiveValue;

                    return (
                      <button
                        key={option.iso2}
                        type="button"
                        onClick={() => {
                          onValueChange(option.iso2);
                          setIsOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          isSelected
                            ? 'bg-surface-warning-soft text-fg-strong'
                            : 'text-fg hover:bg-surface-soft'
                        }`}
                      >
                        <span className="text-lg leading-none">
                          {getPhoneCountryFlag(option.iso2)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{option.dialCode}</span>
                          <span className="block truncate text-xs text-muted">{option.label}</span>
                        </span>
                        {isSelected ? <Check className="h-4 w-4 text-warning" /> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      ) : null}
    </Popover.Root>
  );
}
