import { Camera, Mail, Phone, ShieldCheck, Upload, X } from 'lucide-react';
import { Avatar as EmployeeAvatar } from '@/modules/employees/components/components/Avatar';
import { getPhoneDisplay } from '@/modules/phone/utils/phone';
import PhoneField from '@/modules/ui/PhoneField';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

type EmployeeEditModalContentProps = {
  form: {
    name: string;
    email: string;
    phone_country_iso2: string;
    phone_national_number: string;
    phone_legacy: string;
    avatar_url: string | null;
    avatar_file: File | null;
    is_active: boolean;
  };
  isEditing: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneCountryChange: (value: string) => void;
  onPhoneNationalNumberChange: (value: string) => void;
  onClearPhone: () => void;
  onAvatarFileChange: (file: File | null) => void;
  onIsActiveChange: (value: boolean) => void;
};

export default function EmployeeEditModalContent({
  form,
  isEditing,
  onNameChange,
  onEmailChange,
  onPhoneCountryChange,
  onPhoneNationalNumberChange,
  onClearPhone,
  onAvatarFileChange,
  onIsActiveChange,
}: EmployeeEditModalContentProps): React.ReactNode {
  const [localAvatarPreviewUrl, setLocalAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!form.avatar_file) {
      setLocalAvatarPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(form.avatar_file);
    setLocalAvatarPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [form.avatar_file]);

  const phoneDisplay =
    getPhoneDisplay({
      display: form.phone_legacy,
      countryIso2: form.phone_country_iso2,
      nationalNumber: form.phone_national_number,
    }) ?? '';
  const selectedAvatarName = form.avatar_file?.name?.trim() || '';

  const handleAvatarInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    onAvatarFileChange(nextFile);
  };

  const handleClearAvatarFile = () => {
    onAvatarFileChange(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  return (
    <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="employee-name" className="text-sm font-medium text-fg-label">
            Nombre
          </label>
          <input
            id="employee-name"
            value={form.name}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            placeholder="Ej: Ana López"
            required
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="employee-email" className="text-sm font-medium text-fg-label">
            Email
          </label>
          <input
            id="employee-email"
            type="email"
            value={form.email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            placeholder="empleado@empresa.com"
            required
            maxLength={255}
          />
        </div>

        <PhoneField
          idPrefix="employee-phone"
          label="Teléfono"
          countryIso2={form.phone_country_iso2}
          nationalNumber={form.phone_national_number}
          onCountryChange={onPhoneCountryChange}
          onNationalNumberChange={onPhoneNationalNumberChange}
          onClear={onClearPhone}
          helperText="Selecciona un país y escribe el número sin el prefijo internacional."
          legacyValue={form.phone_legacy}
          selectTriggerClassName="border-border bg-surface"
          inputClassName="border-border bg-surface"
        />

        <label className="space-y-1.5">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-fg-label">
            <Camera className="h-4 w-4 text-fg-icon" />
            Foto del perfil
          </span>
          <div className="rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface-soft px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover">
                <Upload className="h-3.5 w-3.5" />
                {selectedAvatarName ? 'Cambiar imagen' : 'Seleccionar imagen'}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarInputChange}
                  className="hidden"
                />
              </label>

              {selectedAvatarName ? (
                <button
                  type="button"
                  onClick={handleClearAvatarFile}
                  className="inline-flex items-center gap-1 rounded-xl border border-border-strong bg-surface-soft px-2.5 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover"
                >
                  <X className="h-3.5 w-3.5" />
                  Quitar
                </button>
              ) : null}
            </div>

            <p className="mt-2 truncate text-xs text-muted">
              {selectedAvatarName || 'No hay archivo seleccionado.'}
            </p>
          </div>
          <p className="text-xs text-muted">
            PNG, JPG o WEBP. Máximo 2 MB. Si no subes imagen se usará el avatar con iniciales.
          </p>
        </label>

        {isEditing ? (
          <label className="flex items-center gap-2 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-fg-label">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => onIsActiveChange(event.target.checked)}
            />
            Empleado activo
          </label>
        ) : null}
      </div>

      <div className="space-y-4 rounded-[28px] border border-border bg-inverse-80 p-5">
        <div className="flex items-center gap-3">
          <EmployeeAvatar
            name={form.name || 'Nuevo empleado'}
            imageUrl={localAvatarPreviewUrl ?? form.avatar_url}
          />
          <div>
            <p className="font-semibold text-fg-strong">{form.name.trim() || 'Nuevo empleado'}</p>
            <p className="text-sm text-muted">{form.email.trim() || 'correo@empresa.com'}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-border-soft bg-surface-panel-strong p-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-fg">
              <Mail className="h-4 w-4 text-fg-icon" />
              Contacto principal
            </div>
            <p className="mt-2 text-sm text-muted">
              Usa un email real para notificaciones y asignaciones operativas.
            </p>
          </div>

          <div className="rounded-2xl border border-border-soft bg-surface-panel-strong p-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-fg">
              <Phone className="h-4 w-4 text-fg-icon" />
              Teléfono de soporte
            </div>
            <p className="mt-2 text-sm text-muted">
              {phoneDisplay || 'Aún no se ha definido un teléfono para este perfil.'}
            </p>
          </div>

          <div className="rounded-2xl border border-border-soft bg-surface-panel-strong p-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-fg">
              <ShieldCheck className="h-4 w-4 text-fg-icon" />
              Estado del perfil
            </div>
            <p className="mt-2 text-sm text-muted">
              {isEditing
                ? form.is_active
                  ? 'Este empleado aparecerá disponible para asignaciones.'
                  : 'Este empleado quedará oculto de los flujos activos.'
                : 'El nuevo empleado se creará como activo por defecto.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
