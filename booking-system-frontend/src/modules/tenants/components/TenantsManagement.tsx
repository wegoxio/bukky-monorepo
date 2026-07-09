'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { tenantsService } from '@/modules/tenants/services/tenants.service';
import { tenantAdminsService } from '@/modules/tenant-admins/services/tenant-admins.service';
import TenantEditModalContent from '@/modules/tenants/components/TenantEditModalContent';
import TenantsTable from '@/modules/tenants/components/TenantsTable';
import ConfirmActionModal from '@/modules/ui/ConfirmActionModal';
import TableEditModal from '@/modules/ui/TableEditModal';
import {
  emptyForm,
  type CreateTenantPayload,
  type Tenant,
  type TenantFormState,
  type UpdateTenantPayload,
} from '@/types/tenant.types';
import { normalizeSlug } from '@/utils/format';
import { wait } from '@/utils/delay';
import TableSkeleton from '@/modules/ui/TableSkeleton';
import SectionHeader from '@/modules/ui/SectionHeader';
import TableHeader from '@/modules/ui/TableHeader';
import { validateTenantCreateForm } from '@/utils/validation';
import { toast } from 'react-hot-toast';

export default function TenantsManagement() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<TenantFormState>(emptyForm);
  const [inviteAdminEnabled, setInviteAdminEnabled] = useState(false);
  const [inviteAdminName, setInviteAdminName] = useState('');
  const [inviteAdminEmail, setInviteAdminEmail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantToDeactivate, setTenantToDeactivate] = useState<Tenant | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const activeTenantsCount = useMemo(
    () => tenants.filter((tenant) => tenant.is_active).length,
    [tenants],
  );

  const filteredTenants = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return tenants;
    }

    return tenants.filter((tenant) => {
      const haystack = `${tenant.name} ${tenant.slug}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [tenants, searchQuery]);

  const loadTenants = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await tenantsService.findAll(token);
      await wait(600);
      setTenants(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron cargar los negocios.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setInviteAdminEnabled(false);
    setInviteAdminName('');
    setInviteAdminEmail('');
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      is_active: tenant.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openDeactivateModal = (tenant: Tenant) => {
    if (!tenant.is_active) return;
    setTenantToDeactivate(tenant);
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: normalizeSlug(value),
    }));
  };

  const handleIsActiveChange = (value: boolean) => {
    setForm((prev) => ({ ...prev, is_active: value }));
  };

  const closeDeactivateModal = () => {
    if (isDeactivating) return;
    setTenantToDeactivate(null);
  };

  const handleConfirmDeactivate = async () => {
    if (!token || !tenantToDeactivate) return;
    setIsDeactivating(true);
    setErrorMessage('');
    try {
      await tenantsService.update(tenantToDeactivate.id, { is_active: false }, token);
      await loadTenants();
      toast.success('Negocio desactivado correctamente.');
      setTenantToDeactivate(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo desactivar el negocio.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    const validationError = validateTenantCreateForm(form);
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    if (!editingId && inviteAdminEnabled) {
      const normalizedInviteName = inviteAdminName.trim();
      const normalizedInviteEmail = inviteAdminEmail.trim();

      if (normalizedInviteName.length < 1 || normalizedInviteName.length > 120) {
        const inviteValidationError =
          'El nombre del administrador debe tener entre 1 y 120 caracteres.';
        setFormError(inviteValidationError);
        toast.error(inviteValidationError);
        return;
      }

      if (!/^\S+@\S+\.\S+$/.test(normalizedInviteEmail)) {
        const inviteValidationError = 'Debes ingresar un correo válido para la invitación.';
        setFormError(inviteValidationError);
        toast.error(inviteValidationError);
        return;
      }
    }

    const normalizedSlug = normalizeSlug(form.slug);
    const createPayload: CreateTenantPayload = {
      name: form.name.trim(),
      slug: normalizedSlug,
    };

    setIsSaving(true);
    setFormError('');

    try {
      if (editingId) {
        const updatePayload: UpdateTenantPayload = {
          ...createPayload,
          is_active: form.is_active,
        };
        await tenantsService.update(editingId, updatePayload, token);
        toast.success('Negocio actualizado correctamente.');
      } else {
        const createdTenant = await tenantsService.create(createPayload, token);
        toast.success('Negocio creado correctamente.');

        if (inviteAdminEnabled) {
          try {
            await tenantAdminsService.create(
              {
                name: inviteAdminName.trim(),
                email: inviteAdminEmail.trim(),
                tenant_id: createdTenant.id,
              },
              token,
            );
            toast.success('Invitación del administrador enviada.');
          } catch (inviteError) {
            const inviteErrorMessage =
              inviteError instanceof Error
                ? inviteError.message
                : 'No se pudo enviar la invitación del administrador.';
            toast.error(`Negocio creado, pero la invitación falló: ${inviteErrorMessage}`);
          }
        }
      }

      await loadTenants();
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el negocio.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const viewStats = [
    {
      label: 'Negocios totales',
      value: tenants.length,
    },
    {
      label: 'Negocios activos',
      value: activeTenantsCount,
    },
  ];

  return (
    <section data-tour="tenants-page" className="space-y-4">
      <div data-tour="tenants-summary">
        <SectionHeader
          headerTitle="Negocios"
          headerDescription="Administra organizaciones, identificadores y estado general de cada negocio."
          stats={viewStats}
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div
          data-tour="tenants-list-panel"
          className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card"
        >
          <div data-tour="tenants-controls">
            <TableHeader
              title="Listado"
              subtitle="Vista operativa de negocios registrados en la plataforma."
              inputStateValue={searchQuery}
              inputOnchange={setSearchQuery}
              buttonOnOpen={openCreateModal}
              buttonLabel="Crear negocio"
            />
          </div>

          {errorMessage ? (
            <p className="mt-4 text-sm text-danger">{errorMessage}</p>
          ) : filteredTenants.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-border bg-surface px-6 py-10 text-center">
              <p className="text-base font-medium text-fg">
                {tenants.length === 0
                  ? 'No hay negocios registrados todavía.'
                  : 'No hay resultados para esa búsqueda.'}
              </p>
              <p className="mt-2 text-sm text-muted">
                {tenants.length === 0
                  ? 'Crea el primero para empezar a gestionar administradores.'
                  : 'Prueba otro término o limpia el filtro actual.'}
              </p>
            </div>
          ) : (
            <div data-tour="tenants-table">
              <TenantsTable
                tenants={filteredTenants}
                onEdit={openEditModal}
                onDeactivate={openDeactivateModal}
              />
            </div>
          )}
        </div>
      )}

      <TableEditModal
        isOpen={isModalOpen}
        badgeLabel={editingId ? 'Editar negocio' : 'Nuevo negocio'}
        badgeIcon={<Building2 className="h-3.5 w-3.5" />}
        title={editingId ? 'Editar negocio' : 'Crear negocio'}
        description="Define el nombre comercial y el slug técnico del negocio."
        helperText="Esta acción impacta el acceso y el contexto de usuarios del negocio."
        errorMessage={formError}
        submitText={
          isSaving
            ? 'Guardando...'
            : editingId
              ? 'Guardar cambios'
              : inviteAdminEnabled
                ? 'Crear negocio e invitar'
                : 'Crear negocio'
        }
        isSubmitting={isSaving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      >
        <TenantEditModalContent
          form={form}
          isEditing={!!editingId}
          inviteAdminEnabled={inviteAdminEnabled}
          inviteAdminName={inviteAdminName}
          inviteAdminEmail={inviteAdminEmail}
          onNameChange={handleNameChange}
          onIsActiveChange={handleIsActiveChange}
          onInviteAdminEnabledChange={setInviteAdminEnabled}
          onInviteAdminNameChange={setInviteAdminName}
          onInviteAdminEmailChange={setInviteAdminEmail}
        />
      </TableEditModal>

      <ConfirmActionModal
        isOpen={!!tenantToDeactivate}
        title="Desactivar negocio"
        description="El negocio quedará inactivo y se bloqueará el acceso de sus administradores y su enlace público de reservas."
        checkboxLabel="Confirmo que deseo desactivar este negocio."
        confirmText="Desactivar negocio"
        isConfirming={isDeactivating}
        onClose={closeDeactivateModal}
        onConfirm={() => void handleConfirmDeactivate()}
      />
    </section>
  );
}
