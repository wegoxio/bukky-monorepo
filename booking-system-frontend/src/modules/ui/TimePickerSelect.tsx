'use client';

import SelectField, { type SelectOption } from '@/modules/ui/SelectField';
import { useMemo } from 'react';

type TimePickerSelectProps = {
  value: string;
  onChange: (value: string) => void;
  stepMinutes?: number;
  disabled?: boolean;
  triggerClassName?: string;
};

function buildTimeOptions(stepMinutes: number): SelectOption[] {
  const options: SelectOption[] = [];
  const normalizedStep = Math.max(stepMinutes, 5);

  for (let minutes = 0; minutes < 24 * 60; minutes += normalizedStep) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    const time = `${hour}:${minute}`;
    options.push({ value: time, label: time });
  }

  return options;
}

const TIME_OPTIONS_CACHE = new Map<number, SelectOption[]>();

function getTimeOptions(stepMinutes: number): SelectOption[] {
  const normalizedStep = Math.max(stepMinutes, 5);
  const cached = TIME_OPTIONS_CACHE.get(normalizedStep);
  if (cached) {
    return cached;
  }

  const options = buildTimeOptions(normalizedStep);
  TIME_OPTIONS_CACHE.set(normalizedStep, options);
  return options;
}

export default function TimePickerSelect({
  value,
  onChange,
  stepMinutes = 5,
  disabled = false,
  triggerClassName = '',
}: TimePickerSelectProps): React.ReactNode {
  const options = useMemo(() => getTimeOptions(stepMinutes), [stepMinutes]);

  return (
    <SelectField
      value={value}
      onValueChange={onChange}
      options={options}
      disabled={disabled}
      triggerClassName={triggerClassName}
    />
  );
}
