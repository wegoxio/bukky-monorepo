'use client';

import { useAuth } from '@/context/AuthContext';
import { authService } from '@/modules/auth/services/auth.service';
import { PHONE_COUNTRY_OPTIONS } from '@/modules/phone/constants/phone-country-options';
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  getPhoneCountryOption,
  normalizePhoneCountryIso2,
  normalizePhoneDigits,
} from '@/modules/phone/utils/phone';
import { tenantsService } from '@/modules/tenants/services/tenants.service';
import Button from '@/modules/ui/Button';
import Input from '@/modules/ui/Input';
import PhoneField from '@/modules/ui/PhoneField';
import SelectField, { type SelectOption } from '@/modules/ui/SelectField';
import type { Tenant } from '@/types/tenant.types';
import {
  Building2,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  QrCode,
  Save,
  ShieldAlert,
} from 'lucide-react';
import * as QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

const FIXED_COUNTRY = 'Venezuela';
const VENEZUELA_PHONE_ISO2 = DEFAULT_PHONE_COUNTRY_ISO2;
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim() ?? '';
const PUBLIC_BOOKING_PREFIX = '/book';

const VENEZUELA_STATE_CITIES: Record<string, string[]> = {
  Amazonas: ['Puerto Ayacucho', 'San Fernando de Atabapo'],
  Anzoátegui: ['Barcelona', 'Puerto La Cruz', 'Lechería', 'El Tigre'],
  Apure: ['San Fernando de Apure', 'Guasdualito'],
  Aragua: ['Maracay', 'La Victoria', 'Turmero', 'Cagua'],
  Barinas: ['Barinas', 'Socopó', 'Barinitas'],
  Bolívar: ['Ciudad Bolívar', 'Puerto Ordaz', 'San Félix', 'Upata'],
  Carabobo: ['Valencia', 'Naguanagua', 'Guacara', 'Puerto Cabello'],
  Cojedes: ['San Carlos', 'Tinaquillo'],
  'Delta Amacuro': ['Tucupita'],
  'Distrito Capital': ['Caracas'],
  Falcón: ['Coro', 'Punto Fijo', 'Chichiriviche'],
  Guárico: ['San Juan de los Morros', 'Calabozo', 'Valle de la Pascua'],
  Lara: ['Barquisimeto', 'Cabudare', 'Carora'],
  Mérida: ['Mérida', 'El Vigía', 'Tovar'],
  Miranda: ['Los Teques', 'Guatire', 'Charallave', 'Chacao', 'Baruta'],
  Monagas: ['Maturín', 'Punta de Mata'],
  'Nueva Esparta': ['Porlamar', 'Pampatar', 'La Asunción'],
  Portuguesa: ['Guanare', 'Acarigua', 'Araure'],
  Sucre: ['Cumaná', 'Carúpano'],
  Táchira: ['San Cristóbal', 'Táriba', 'Rubio'],
  Trujillo: ['Trujillo', 'Valera', 'Boconó'],
  'La Guaira': ['La Guaira', 'Catia La Mar', 'Macuto'],
  Yaracuy: ['San Felipe', 'Yaritagua'],
  Zulia: ['Maracaibo', 'Cabimas', 'Ciudad Ojeda', 'Machiques'],
};

const STATE_OPTIONS: SelectOption[] = Object.keys(VENEZUELA_STATE_CITIES).map((state) => ({
  value: state,
  label: state,
  description: 'Venezuela',
  icon: MapPin,
}));

const TEXT_PATTERN = /^[\p{L}\p{N}\s.,#º°\-'/]+$/u;
const NAME_PATTERN = /^[\p{L}\p{N}\s.'-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_PATTERN = /^[A-Za-z0-9\-\s]{3,12}$/;

type BusinessDraft = {
  name: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone_country_iso2: string;
  phone_national_number: string;
  public_email: string;
};

type BusinessErrors = Partial<Record<keyof BusinessDraft | 'requested_email', string>>;

function parseStoredPhone(phone?: string | null) {
  const normalized = phone?.trim() ?? '';
  if (!normalized) {
    return {
      phone_country_iso2: VENEZUELA_PHONE_ISO2,
      phone_national_number: '',
    };
  }

  const option = PHONE_COUNTRY_OPTIONS.find((country) => normalized.startsWith(country.dialCode));

  if (!option) {
    return {
      phone_country_iso2: VENEZUELA_PHONE_ISO2,
      phone_national_number: normalizePhoneDigits(normalized),
    };
  }

  return {
    phone_country_iso2: option.iso2,
    phone_national_number: normalizePhoneDigits(normalized.slice(option.dialCode.length)),
  };
}

function formatPhone(countryIso2: string, nationalNumber: string) {
  const number = normalizePhoneDigits(nationalNumber);
  if (!number) return '';
  const country = getPhoneCountryOption(countryIso2) ?? getPhoneCountryOption(VENEZUELA_PHONE_ISO2);
  return `${country?.dialCode ?? '+58'} ${number}`;
}

function toDraft(tenant: Tenant | null): BusinessDraft {
  const phone = parseStoredPhone(tenant?.phone);
  const state = tenant?.state ?? '';
  const knownCities = state ? (VENEZUELA_STATE_CITIES[state] ?? []) : [];
  const city = tenant?.city && knownCities.includes(tenant.city) ? tenant.city : '';

  return {
    name: tenant?.name ?? '',
    address_line: tenant?.address_line ?? '',
    city,
    state,
    country: FIXED_COUNTRY,
    postal_code: tenant?.postal_code ?? '',
    phone_country_iso2: phone.phone_country_iso2,
    phone_national_number: phone.phone_national_number,
    public_email: tenant?.public_email ?? '',
  };
}

function toComparablePayload(draft: BusinessDraft) {
  return {
    name: draft.name.trim(),
    address_line: draft.address_line.trim(),
    city: draft.city.trim(),
    state: draft.state.trim(),
    country: FIXED_COUNTRY,
    postal_code: draft.postal_code.trim(),
    phone: formatPhone(draft.phone_country_iso2, draft.phone_national_number),
    public_email: draft.public_email.trim().toLowerCase(),
  };
}

function validateBusinessDraft(draft: BusinessDraft): BusinessErrors {
  const errors: BusinessErrors = {};
  const name = draft.name.trim();
  const address = draft.address_line.trim();
  const postalCode = draft.postal_code.trim();
  const publicEmail = draft.public_email.trim();
  const phoneNumber = normalizePhoneDigits(draft.phone_national_number);

  if (name.length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres.';
  } else if (!NAME_PATTERN.test(name)) {
    errors.name = 'El nombre contiene caracteres no permitidos.';
  }

  if (publicEmail && !EMAIL_PATTERN.test(publicEmail)) {
    errors.public_email = 'Ingresa un correo válido, por ejemplo negocio@correo.com.';
  }

  if (phoneNumber && (phoneNumber.length < 7 || phoneNumber.length > 15)) {
    errors.phone_national_number = 'El número debe tener entre 7 y 15 dígitos.';
  }

  if (address && !TEXT_PATTERN.test(address)) {
    errors.address_line = 'La dirección contiene caracteres no permitidos.';
  }

  if (!draft.state) {
    errors.state = 'Selecciona un estado.';
  }

  if (!draft.city) {
    errors.city = 'Selecciona una ciudad.';
  }

  if (postalCode && !POSTAL_PATTERN.test(postalCode)) {
    errors.postal_code = 'Ingresa un código postal válido.';
  }

  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-danger">{message}</p>;
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}

function buildTenantBookingUrl(baseDomain: string, tenantSlug: string) {
  const normalizedDomain = trimTrailingSlashes(baseDomain.trim());
  const normalizedSlug = tenantSlug.trim();
  if (!normalizedDomain || !normalizedSlug) return '';
  return `${normalizedDomain}${PUBLIC_BOOKING_PREFIX}/${encodeURIComponent(normalizedSlug)}`;
}

export default function BusinessGeneralSettingsPanel() {
  const { token, user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [draft, setDraft] = useState<BusinessDraft>(() => toDraft(null));
  const [errors, setErrors] = useState<BusinessErrors>({});
  const [requestedEmail, setRequestedEmail] = useState('');
  const [runtimeAppDomain, setRuntimeAppDomain] = useState('');
  const [bookingQrDataUrl, setBookingQrDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingPasswordLink, setIsSendingPasswordLink] = useState(false);

  const isTenantAdmin = user?.role === 'TENANT_ADMIN';
  const hasTenant = isTenantAdmin && !!user?.tenant_id;
  const bookingAppDomain = APP_DOMAIN || runtimeAppDomain;
  const tenantBookingPublicUrl = useMemo(
    () => buildTenantBookingUrl(bookingAppDomain, tenant?.slug ?? user?.tenant?.slug ?? ''),
    [bookingAppDomain, tenant?.slug, user?.tenant?.slug],
  );

  const cityOptions = useMemo<SelectOption[]>(
    () =>
      (draft.state ? (VENEZUELA_STATE_CITIES[draft.state] ?? []) : []).map((city) => ({
        value: city,
        label: city,
        description: draft.state,
        icon: Building2,
      })),
    [draft.state],
  );

  const hasChanges = useMemo(() => {
    if (!tenant) return false;
    return (
      JSON.stringify(toComparablePayload(draft)) !==
      JSON.stringify(toComparablePayload(toDraft(tenant)))
    );
  }, [draft, tenant]);

  const loadTenant = useCallback(async () => {
    if (!token || !hasTenant) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await tenantsService.getCurrent(token);
      setTenant(response);
      setDraft(toDraft(response));
      setErrors({});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudieron cargar los datos del negocio.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [hasTenant, token]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  useEffect(() => {
    if (APP_DOMAIN) return;
    if (typeof window === 'undefined') return;
    setRuntimeAppDomain(window.location.origin);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!tenantBookingPublicUrl) {
      setBookingQrDataUrl('');
      return () => {
        isCancelled = true;
      };
    }

    QRCode.toDataURL(tenantBookingPublicUrl, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!isCancelled) setBookingQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!isCancelled) setBookingQrDataUrl('');
      });

    return () => {
      isCancelled = true;
    };
  }, [tenantBookingPublicUrl]);

  const updateField = (field: keyof BusinessDraft, value: string) => {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === 'state') {
        next.city = '';
      }
      if (field === 'country') {
        next.country = FIXED_COUNTRY;
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const saveBusinessProfile = async () => {
    if (!token) return;
    const nextErrors = validateBusinessDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Revisa los campos marcados antes de guardar.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await tenantsService.updateCurrent(toComparablePayload(draft), token);
      setTenant(updated);
      setDraft(toDraft(updated));
      setErrors({});
      toast.success('Datos del negocio actualizados.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudieron guardar los datos del negocio.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const requestPasswordChange = async () => {
    if (!user?.email) return;
    setIsSendingPasswordLink(true);
    try {
      await authService.requestPasswordReset({ email: user.email });
      toast.success('Te enviamos el enlace para cambiar tu contraseña.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo solicitar el cambio de contraseña.',
      );
    } finally {
      setIsSendingPasswordLink(false);
    }
  };

  const copyPublicBookingLink = async () => {
    if (!tenantBookingPublicUrl) {
      toast.error('Configura el dominio público para generar el enlace.');
      return;
    }

    if (!navigator.clipboard?.writeText) {
      toast.error('Tu navegador no permite copiar al portapapeles.');
      return;
    }

    await navigator.clipboard.writeText(tenantBookingPublicUrl);
    toast.success('Enlace público copiado.');
  };

  const downloadPublicBookingQr = () => {
    if (!bookingQrDataUrl || !tenant?.slug) {
      toast.error('No se pudo generar el QR del enlace público.');
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = bookingQrDataUrl;
    anchor.download = `qr-reservas-${tenant.slug}.png`;
    anchor.click();
  };

  const copyEmailChangeRequest = async () => {
    const nextEmail = requestedEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(nextEmail)) {
      setErrors((current) => ({
        ...current,
        requested_email: 'Ingresa un correo válido para preparar la solicitud.',
      }));
      toast.error('Ingresa un correo válido.');
      return;
    }

    const message = [
      'Solicitud de cambio de email administrativo',
      '',
      `Cuenta actual: ${user?.email ?? '-'}`,
      `Nuevo email solicitado: ${nextEmail}`,
      `Negocio: ${tenant?.name ?? user?.tenant?.name ?? '-'}`,
      '',
      'Este cambio requiere verificación de identidad y revocación de sesiones activas.',
    ].join('\n');

    await navigator.clipboard.writeText(message);
    toast.success('Solicitud copiada. Envíala al super admin para validación.');
  };

  if (!hasTenant) {
    return (
      <section className="rounded-[30px] border border-card-border bg-card p-6 shadow-theme-card">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-fg-secondary">
          <Building2 className="h-3.5 w-3.5 text-accent" />
          General
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-fg-strong">Datos generales de la cuenta</h1>
        <p className="mt-2 max-w-3xl text-sm text-fg-secondary">
          Esta cuenta no está asociada a un negocio específico. Los datos del negocio se editan
          desde la sección Negocios cuando estás en modo super admin.
        </p>
        <div className="mt-6 rounded-2xl border border-border-soft bg-surface-soft p-4">
          <p className="text-sm font-semibold text-fg-strong">{user?.name}</p>
          <p className="mt-1 text-sm text-fg-secondary">{user?.email}</p>
          <Button
            onClick={() => void requestPasswordChange()}
            disabled={isSendingPasswordLink}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg-strong hover:border-accent disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            Solicitar cambio de contraseña
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section data-tour="settings-general-section" className="space-y-5">
      <article
        data-tour="settings-general-header"
        className="rounded-[30px] border border-card-border bg-card p-6 shadow-theme-card"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-fg-secondary">
              <Building2 className="h-3.5 w-3.5 text-accent" />
              General
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-fg-strong">
              Datos del negocio
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-fg-secondary">
              Mantén actualizada la información operativa del negocio y los datos de contacto
              visibles para administración.
            </p>
          </div>
          <Button
            onClick={() => void saveBusinessProfile()}
            disabled={!hasChanges || isSaving || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text shadow-theme-accent disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article
          data-tour="settings-business-info"
          className="rounded-[28px] border border-card-border bg-card p-5 shadow-theme-card sm:p-6"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-card-border bg-surface text-accent">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-fg-strong">Información del negocio</h2>
              <p className="text-sm text-fg-secondary">Nombre, dirección y contacto público.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border-soft bg-surface-soft p-4 text-sm text-fg-secondary">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando datos...
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <Input
                  label="Nombre del negocio"
                  name="businessName"
                  placeholder="Ej: Barbería Demo Bukky"
                  value={draft.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
                <FieldError message={errors.name} />
              </div>

              <div>
                <Input
                  label="Email público del negocio"
                  name="publicEmail"
                  type="email"
                  placeholder="contacto@tunegocio.com"
                  value={draft.public_email}
                  onChange={(event) => updateField('public_email', event.target.value)}
                />
                <FieldError message={errors.public_email} />
              </div>

              <div className="md:col-span-2">
                <PhoneField
                  idPrefix="business-phone"
                  label="Teléfono"
                  countryIso2={draft.phone_country_iso2}
                  nationalNumber={draft.phone_national_number}
                  onCountryChange={(value) =>
                    updateField('phone_country_iso2', normalizePhoneCountryIso2(value))
                  }
                  onNationalNumberChange={(value) =>
                    updateField('phone_national_number', normalizePhoneDigits(value))
                  }
                  onClear={() => {
                    updateField('phone_country_iso2', VENEZUELA_PHONE_ISO2);
                    updateField('phone_national_number', '');
                  }}
                  helperText="Selecciona el prefijo y escribe solo números."
                  inputClassName="border-border bg-surface-soft"
                />
                <FieldError message={errors.phone_national_number} />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Dirección"
                  name="address"
                  placeholder="Ej: Av. Principal, local 12"
                  value={draft.address_line}
                  onChange={(event) => updateField('address_line', event.target.value)}
                />
                <FieldError message={errors.address_line} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-fg-strong">País</label>
                <div className="flex h-12 items-center rounded-lg border border-border bg-surface-soft px-3 text-sm font-medium text-fg-strong">
                  Venezuela
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Por ahora el país está fijado para el mercado objetivo.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-fg-strong">Estado</label>
                <SelectField
                  value={draft.state}
                  onValueChange={(value) => updateField('state', value)}
                  options={STATE_OPTIONS}
                  placeholder="Selecciona un estado"
                  triggerClassName="h-12 rounded-lg bg-surface-soft"
                />
                <FieldError message={errors.state} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-fg-strong">Ciudad</label>
                <SelectField
                  value={draft.city}
                  onValueChange={(value) => updateField('city', value)}
                  options={cityOptions}
                  placeholder={
                    draft.state ? 'Selecciona una ciudad' : 'Selecciona primero un estado'
                  }
                  disabled={!draft.state}
                  triggerClassName="h-12 rounded-lg bg-surface-soft"
                />
                <FieldError message={errors.city} />
              </div>

              <div>
                <Input
                  label="Código postal"
                  name="postalCode"
                  placeholder="Ej: 1010"
                  value={draft.postal_code}
                  onChange={(event) => updateField('postal_code', event.target.value)}
                />
                <FieldError message={errors.postal_code} />
              </div>
            </div>
          )}
        </article>

        <article
          data-tour="settings-public-booking-link"
          className="rounded-[28px] border border-card-border bg-card p-5 shadow-theme-card sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-card-border bg-surface text-accent">
                <QrCode className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-fg-strong">Enlace público de reservas</h2>
                <p className="text-sm text-fg-secondary">
                  Compártelo como enlace o QR para que tus clientes reserven.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 break-all rounded-2xl border border-border-soft bg-surface-soft px-3 py-2 text-xs text-fg-secondary">
            {tenantBookingPublicUrl || 'Configura el dominio público para generar el enlace.'}
          </p>

          <div className="mt-4 rounded-3xl border border-border-soft bg-surface-soft px-4 py-5">
            {bookingQrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bookingQrDataUrl}
                alt="QR del enlace público de reservas"
                className="mx-auto h-44 w-44 rounded-2xl bg-white p-2"
              />
            ) : (
              <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-border text-center text-xs text-muted">
                El QR aparecerá cuando exista un enlace público.
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => void copyPublicBookingLink()}
              disabled={!tenantBookingPublicUrl}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg-strong hover:border-accent disabled:opacity-60"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar enlace
            </Button>
            <Button
              onClick={downloadPublicBookingQr}
              disabled={!bookingQrDataUrl}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg-strong hover:border-accent disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar QR
            </Button>
            <a
              href={tenantBookingPublicUrl || undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!tenantBookingPublicUrl}
              className={`inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg-strong hover:border-accent ${
                tenantBookingPublicUrl ? '' : 'pointer-events-none opacity-60'
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver vista pública
            </a>
          </div>
        </article>

        <article
          data-tour="settings-admin-access"
          className="rounded-[28px] border border-card-border bg-card p-5 shadow-theme-card sm:p-6"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-card-border bg-surface text-accent">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-fg-strong">Acceso administrativo</h2>
              <p className="text-sm text-fg-secondary">Cambios sensibles de la cuenta.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border-soft bg-surface-soft p-4">
              <p className="text-sm font-semibold text-fg-strong">Contraseña</p>
              <p className="mt-1 text-sm text-fg-secondary">
                Recibirás un enlace seguro para definir una nueva contraseña.
              </p>
              <Button
                onClick={() => void requestPasswordChange()}
                disabled={isSendingPasswordLink}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg-strong hover:border-accent disabled:opacity-60"
              >
                {isSendingPasswordLink ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Solicitar cambio de contraseña
              </Button>
            </div>

            <div className="rounded-2xl border border-border-warning bg-surface-warning p-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-warning" />
                <div>
                  <p className="text-sm font-semibold text-fg-strong">Email administrativo</p>
                  <p className="mt-1 text-sm text-fg-secondary">
                    Actual: {user?.email}. Este cambio requiere validación de identidad y revocación
                    de sesiones.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <Input
                    label="Nuevo email solicitado"
                    name="requestedEmail"
                    type="email"
                    placeholder="nuevo-admin@correo.com"
                    value={requestedEmail}
                    onChange={(event) => {
                      setRequestedEmail(event.target.value);
                      setErrors((current) => ({ ...current, requested_email: undefined }));
                    }}
                    containerClassName="min-w-0"
                  />
                  <FieldError message={errors.requested_email} />
                </div>
                <Button
                  onClick={() => void copyEmailChangeRequest()}
                  className="inline-flex items-center justify-center gap-2 self-end rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-fg-strong hover:border-accent"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Preparar solicitud
                </Button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
