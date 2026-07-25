'use client';

import { PHONE_COUNTRY_OPTIONS } from '@/modules/phone/constants/phone-country-options';
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  getPhoneInputPlaceholder,
  normalizePhoneDigits,
  normalizePhoneCountryIso2,
} from '@/modules/phone/utils/phone';
import PhoneCountrySelect from '@/modules/ui/PhoneCountrySelect';
import { useEffect } from 'react';

type PhoneFieldProps = {
  idPrefix: string;
  label: string;
  countryIso2: string;
  nationalNumber: string;
  onCountryChange: (value: string) => void;
  onNationalNumberChange: (value: string) => void;
  onClear?: () => void;
  helperText?: string;
  legacyValue?: string;
  wrapperClassName?: string;
  selectTriggerClassName?: string;
  inputClassName?: string;
  noteClassName?: string;
};

export default function PhoneField({
  idPrefix,
  label,
  countryIso2,
  nationalNumber,
  onCountryChange,
  onNationalNumberChange,
  onClear,
  helperText,
  legacyValue,
  wrapperClassName = '',
  selectTriggerClassName = '',
  inputClassName = '',
  noteClassName = '',
}: PhoneFieldProps): React.ReactNode {
  const normalizedLegacyValue = legacyValue?.trim() ?? '';
  const effectiveCountryIso2 = normalizePhoneCountryIso2(countryIso2 || DEFAULT_PHONE_COUNTRY_ISO2);
  const showLegacyNote =
    normalizedLegacyValue.length > 0 &&
    countryIso2.trim().length === 0 &&
    nationalNumber.trim().length === 0;
  const canClear =
    typeof onClear === 'function' &&
    (showLegacyNote || countryIso2.trim().length > 0 || nationalNumber.trim().length > 0);

  useEffect(() => {
    if (nationalNumber.trim().length > 0 && countryIso2.trim().length === 0) {
      onCountryChange(DEFAULT_PHONE_COUNTRY_ISO2);
    }
  }, [countryIso2, nationalNumber, onCountryChange]);

  return (
    <div className={`space-y-1.5 ${wrapperClassName}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${idPrefix}-number`} className="text-sm font-medium text-fg-label">
          {label}
        </label>
        {canClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-muted transition hover:text-fg"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-[128px_minmax(0,1fr)] gap-3">
        <PhoneCountrySelect
          value={countryIso2}
          defaultValue={DEFAULT_PHONE_COUNTRY_ISO2}
          options={PHONE_COUNTRY_OPTIONS}
          onValueChange={(value) => onCountryChange(normalizePhoneCountryIso2(value))}
          triggerClassName={selectTriggerClassName}
        />

        <input
          id={`${idPrefix}-number`}
          type="tel"
          inputMode="numeric"
          value={nationalNumber}
          onChange={(event) => {
            const nextValue = normalizePhoneDigits(event.target.value);
            onNationalNumberChange(nextValue);
          }}
          className={`h-12 w-full rounded-2xl border px-4 text-sm text-fg ${inputClassName}`.trim()}
          placeholder={getPhoneInputPlaceholder(effectiveCountryIso2)}
          maxLength={15}
        />
      </div>

      {helperText ? (
        <p className={`text-xs text-muted ${noteClassName}`.trim()}>{helperText}</p>
      ) : null}

      {showLegacyNote ? (
        <p className={`text-xs text-muted ${noteClassName}`.trim()}>
          Teléfono actual legado: {normalizedLegacyValue}. Completa país y número para migrarlo.
        </p>
      ) : null}
    </div>
  );
}
