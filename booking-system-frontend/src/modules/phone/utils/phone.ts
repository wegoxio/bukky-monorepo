import {
  PHONE_COUNTRY_OPTIONS,
  type PhoneCountryOption,
} from '@/modules/phone/constants/phone-country-options';

export const DEFAULT_PHONE_COUNTRY_ISO2 = 'VE';

type PhoneDisplayInput = {
  display?: string | null;
  countryIso2?: string | null;
  nationalNumber?: string | null;
  e164?: string | null;
};

const PHONE_COUNTRY_BY_ISO2 = new Map(PHONE_COUNTRY_OPTIONS.map((option) => [option.iso2, option]));

function normalizeText(value?: string | null): string {
  return value?.trim() ?? '';
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D+/g, '').slice(0, 15);
}

export function normalizePhoneCountryIso2(value: string): string {
  return value.trim().toUpperCase();
}

export function hasStructuredPhoneValue(
  countryIso2?: string | null,
  nationalNumber?: string | null,
): boolean {
  return (
    normalizePhoneCountryIso2(countryIso2 ?? '').length > 0 ||
    normalizePhoneDigits(nationalNumber ?? '').length > 0
  );
}

export function getPhoneCountryOption(iso2?: string | null): PhoneCountryOption | null {
  const normalizedIso2 = normalizePhoneCountryIso2(iso2 ?? '');
  return PHONE_COUNTRY_BY_ISO2.get(normalizedIso2) ?? null;
}

export function getPhoneCountryFlag(iso2?: string | null): string {
  const normalizedIso2 = normalizePhoneCountryIso2(iso2 ?? '');
  if (normalizedIso2.length !== 2) {
    return '';
  }

  return normalizedIso2
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

export function getPhoneInputPlaceholder(iso2?: string | null): string {
  return getPhoneCountryOption(iso2)?.exampleNumber ?? 'Ej: 612345678';
}

export function getPhoneDisplay({
  display,
  countryIso2,
  nationalNumber,
  e164,
}: PhoneDisplayInput): string | null {
  const normalizedDisplay = normalizeText(display);
  if (normalizedDisplay) {
    return normalizedDisplay;
  }

  const normalizedNationalNumber = normalizePhoneDigits(nationalNumber ?? '');
  if (!normalizedNationalNumber) {
    return normalizeText(e164) || null;
  }

  const countryOption = getPhoneCountryOption(countryIso2);
  if (countryOption) {
    return `${countryOption.dialCode} ${normalizedNationalNumber}`;
  }

  return normalizeText(e164) || normalizedNationalNumber;
}

export function getPhoneSearchValue(input: PhoneDisplayInput): string {
  return [
    normalizeText(input.display),
    normalizePhoneDigits(input.nationalNumber ?? ''),
    normalizeText(input.e164),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function validateOptionalPhoneValue(input: {
  countryIso2?: string | null;
  nationalNumber?: string | null;
  legacyDisplay?: string | null;
  label?: string;
}): string | null {
  const label = input.label ?? 'teléfono';
  const normalizedCountryIso2 = normalizePhoneCountryIso2(input.countryIso2 ?? '');
  const normalizedNationalNumber = normalizePhoneDigits(input.nationalNumber ?? '');
  const normalizedLegacyDisplay = normalizeText(input.legacyDisplay);

  if (!normalizedCountryIso2 && !normalizedNationalNumber) {
    return null;
  }

  if (!normalizedCountryIso2 && normalizedNationalNumber) {
    return `Selecciona un país o prefijo para el ${label}.`;
  }

  if (normalizedCountryIso2 && !normalizedNationalNumber) {
    return `Ingresa el número del ${label}.`;
  }

  if (normalizedNationalNumber.length < 4 || normalizedNationalNumber.length > 15) {
    return `El ${label} debe tener entre 4 y 15 dígitos.`;
  }

  if (normalizedLegacyDisplay && !normalizedCountryIso2 && !normalizedNationalNumber) {
    return null;
  }

  return null;
}
