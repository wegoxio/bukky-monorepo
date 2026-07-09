'use client';

import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  imageUrl?: string | null;
  initials?: string;
};

const EMPTY_VALUE_TOKEN = '__select_empty__';

type SelectFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
};

function getInitials(label: string) {
  return label
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function OptionVisual({ option }: { option: SelectOption }) {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = option.icon;
  const initials = option.initials ?? getInitials(option.label);

  if (option.imageUrl && !imageFailed) {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-soft bg-surface-soft">
        <Image
          src={option.imageUrl}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  if (Icon) {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-soft bg-surface-soft text-fg-icon">
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-soft bg-surface-soft text-[10px] font-semibold text-fg">
      {initials || '?'}
    </span>
  );
}

export default function SelectField({
  value,
  onValueChange,
  options,
  placeholder = 'Seleccionar...',
  triggerClassName = '',
  contentClassName = '',
  disabled = false,
}: SelectFieldProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = value === '' ? EMPTY_VALUE_TOKEN : value;
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <Select.Root
      open={isOpen}
      onOpenChange={setIsOpen}
      value={normalizedValue}
      onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_VALUE_TOKEN ? '' : nextValue)}
      disabled={disabled}
    >
      <Select.Trigger
        className={`inline-flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none transition data-[placeholder]:text-fg-placeholder focus:border-accent ${triggerClassName}`.trim()}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption ? <OptionVisual option={selectedOption} /> : null}
          <span className={`truncate ${selectedOption ? 'text-fg' : 'text-fg-placeholder'}`}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <Select.Icon>
          <ChevronDown className="h-4 w-4 text-fg-icon" />
        </Select.Icon>
      </Select.Trigger>

      {isOpen ? (
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            className={`z-[70] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface shadow-theme-card ${contentClassName}`.trim()}
          >
            <Select.Viewport className="p-1">
              {options.map((option) => {
                const optionValue = option.value === '' ? EMPTY_VALUE_TOKEN : option.value;
                return (
                  <Select.Item
                    key={optionValue}
                    value={optionValue}
                    className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-sm text-fg outline-none data-[highlighted]:bg-surface-warning-soft data-[state=checked]:bg-surface-warning-soft"
                  >
                    <Select.ItemIndicator className="absolute left-2 inline-flex h-4 w-4 items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-warning" />
                    </Select.ItemIndicator>
                    <OptionVisual option={option} />
                    <div className="min-w-0">
                      <Select.ItemText>
                        <span className="block truncate">{option.label}</span>
                      </Select.ItemText>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {option.description}
                        </span>
                      ) : null}
                    </div>
                  </Select.Item>
                );
              })}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      ) : null}
    </Select.Root>
  );
}
