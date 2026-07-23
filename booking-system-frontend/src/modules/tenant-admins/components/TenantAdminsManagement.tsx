'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Users2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import TenantAdminModalContent from '@/modules/tenant-admins/components/TenantAdminModalContent';
import { tenantAdminsService } from '@/modules/tenant-admins/services/tenant-admins.service';
import { tenantsService } from '@/modules/tenants/services/tenants.service';
import ConfirmActionModal from '@/modules/ui/ConfirmActionModal';
import TableEditModal from '@/modules/ui/TableEditModal';
import type {
  CreateTenantAdminPayload,
  TenantAdmin,
  TenantAdminFormState,
  UpdateTenantAdminPayload,
} from '@/types/tenant-admin.types';
import type { Tenant } from '@/types/tenant.types';
import TableSkeleton from '@/modules/ui/TableSkeleton';
import { validateTenantAdminCreateForm } from '@/utils/validation';
import SectionHeader from '@/modules/ui/SectionHeader';
import TableHeader from '@/modules/ui/TableHeader';
import TenantsAdminsTable from './TenantAdminsTable';
import { wait } from '@/utils/delay';
import { toast } from 'react-hot-toast';

const emptyForm: TenantAdminFormState = {
  name: '',
  email: '',
  tenant_id: '',
  is_active: true,
};

export default function TenantAdminsManagement() {
  const { token } = useAuth();
  const [tenantAdmins, setTenantAdmins] = useState<TenantAdmin[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<TenantAdminFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantAdminToDeactivate, setTenantAdminToDeactivate] = useState<TenantAdmin | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [tenantAdminToResendInvitation, setTenantAdminToResendInvitation] =
    useState<TenantAdmin | null>(null);
  const [isResendingInvitation, setIsResendingInvitation] = useState(false);

  const activeTenantAdminsCount = useMemo(
    () => tenantAdmins.filter((tenantAdmin) => tenantAdmin.is_active).length,
    [tenantAdmins],
  );

  const managedTenantsCount = useMemo(
    () => new Set(tenantAdmins.map((tenantAdmin) => tenantAdmin.tenant_id)).size,
    [tenantAdmins],
  );

  const filteredTenantAdmins = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return tenantAdmins;
    }

    return tenantAdmins.filter((tenantAdmin) => {
      const haystack =
        `${tenantAdmin.name} ${tenantAdmin.email} ${tenantAdmin.tenant?.name ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [tenantAdmins, searchQuery]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [tenantAdminsData, tenantsData] = await Promise.all([
        tenantAdminsService.findAll(token),
        tenantsService.findAll(token),
      ]);
      await wait(600);
      setTenantAdmins(tenantAdminsData);
      setTenants(tenantsData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar información.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const openCreateModal = () => {
    resetForm();
    if (tenants.length > 0) {
      setForm((prev) => ({ ...prev, tenant_id: tenants[0].id }));
    }
    setIsModalOpen(true);
  };

  const openEditModal = (tenantAdmin: TenantAdmin) => {
    setEditingId(tenantAdmin.id);
    setForm({
      name: tenantAdmin.name,
      email: tenantAdmin.email,
      tenant_id: tenantAdmin.tenant_id,
      is_active: tenantAdmin.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openDeactivateModal = (tenantAdmin: TenantAdmin) => {
    if (!tenantAdmin.is_active) return;
    setTenantAdminToDeactivate(tenantAdmin);
  };

  const openResendInvitationModal = (tenantAdmin: TenantAdmin) => {
    if (!tenantAdmin.is_active || tenantAdmin.access_state === 'ACTIVE') return;
    setTenantAdminToResendInvitation(tenantAdmin);
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
  };

  const handleEmailChange = (value: string) => {
    setForm((prev) => ({ ...prev, email: value }));
  };

  const handleTenantChange = (value: string) => {
    setForm((prev) => ({ ...prev, tenant_id: value }));
  };

  const handleIsActiveChange = (value: boolean) => {
    setForm((prev) => ({ ...prev, is_active: value }));
  };

  const closeDeactivateModal = () => {
    if (isDeactivating) return;
    setTenantAdminToDeactivate(null);
  };

  const closeResendInvitationModal = () => {
    if (isResendingInvitation) return;
    setTenantAdminToResendInvitation(null);
  };

  const handleConfirmDeactivate = async () => {
    if (!token || !tenantAdminToDeactivate) return;
    setIsDeactivating(true);
    setErrorMessage('');
    try {
      await tenantAdminsService.update(tenantAdminToDeactivate.id, { is_active: false }, token);
      await loadData();
      toast.success('Administrador desactivado correctamente.');
      setTenantAdminToDeactivate(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo desactivar el administrador.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleConfirmResendInvitation = async () => {
    if (!token || !tenantAdminToResendInvitation) return;
    setIsResendingInvitation(true);
    setErrorMessage('');
    try {
      await tenantAdminsService.resendInvitation(tenantAdminToResendInvitation.id, token);
      await loadData();
      toast.success('Invitación reenviada correctamente.');
      setTenantAdminToResendInvitation(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo reenviar la invitación.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsResendingInvitation(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    const validationError = validateTenantAdminCreateForm(form, !!editingId);
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    const basePayload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
    };

    setIsSaving(true);
    setFormError('');

    try {
      if (editingId) {
        const payload: UpdateTenantAdminPayload = {
          ...basePayload,
          is_active: form.is_active,
        };

        await tenantAdminsService.update(editingId, payload, token);
        toast.success('Administrador actualizado correctamente.');
      } else {
        const payload: CreateTenantAdminPayload = {
          ...basePayload,
          tenant_id: form.tenant_id,
        };
        await tenantAdminsService.create(payload, token);
        toast.success('Invitación enviada correctamente.');
      }

      await loadData();
      closeModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo guardar el administrador.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const TenantsAdminStats = [
    {
      label: 'Admins',
      value: tenantAdmins.length,
    },
    {
      label: 'Activos',
      value: activeTenantAdminsCount,
    },
    {
      label: 'Negocios cubiertos',
      value: managedTenantsCount,
    },
  ];

  return (
    <section data-tour="tenant-admins-page" className="space-y-4">
      <div data-tour="tenant-admins-summary">
        <SectionHeader
          headerTitle="Administradores de negocio"
          headerDescription="Gestiona cuentas administrativas por negocio y su estado de acceso."
          stats={TenantsAdminStats}
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div
          data-tour="tenant-admins-list-panel"
          className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card"
        >
          <div data-tour="tenant-admins-controls">
            <TableHeader
              title="Listado"
              subtitle="Usuarios con rol administrador y negocio asignado."
              inputStateValue={searchQuery}
              inputOnchange={setSearchQuery}
              buttonOnOpen={openCreateModal}
              buttonLabel="Invitar administrador"
            />
          </div>

          {errorMessage ? (
            <p className="mt-4 text-sm text-danger">{errorMessage}</p>
          ) : filteredTenantAdmins.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-border bg-surface px-6 py-10 text-center">
              <p className="text-base font-medium text-fg">
                {tenantAdmins.length === 0
                  ? 'No hay administradores registrados todavía.'
                  : 'No hay resultados para esa búsqueda.'}
              </p>
              <p className="mt-2 text-sm text-muted">
                {tenants.length === 0
                  ? 'Primero debes crear al menos un negocio.'
                  : tenantAdmins.length === 0
                    ? 'Crea el primero para delegar administración por negocio.'
                    : 'Prueba otro término o limpia el filtro actual.'}
              </p>
            </div>
          ) : (
            <div data-tour="tenant-admins-table">
              <TenantsAdminsTable
                tenantsAdmin={filteredTenantAdmins}
                onEdit={openEditModal}
                onDeactivate={openDeactivateModal}
                onResendInvitation={openResendInvitationModal}
              />
            </div>
          )}
        </div>
      )}

      <TableEditModal
        isOpen={isModalOpen}
        badgeLabel={editingId ? 'Editar administrador' : 'Nuevo administrador'}
        badgeIcon={<Users2 className="h-3.5 w-3.5" />}
        title={editingId ? 'Editar administrador' : 'Crear administrador'}
        description="Asigna el negocio y el correo desde el que el cliente activará su acceso."
        helperText="La contraseña inicial no la define Bukky: el cliente la crea desde un enlace seguro."
        errorMessage={formError}
        submitText={isSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Enviar invitación'}
        isSubmitting={isSaving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      >
        <TenantAdminModalContent
          form={form}
          tenants={tenants}
          isEditing={!!editingId}
          onNameChange={handleNameChange}
          onEmailChange={handleEmailChange}
          onTenantChange={handleTenantChange}
          onIsActiveChange={handleIsActiveChange}
        />
      </TableEditModal>

      <ConfirmActionModal
        isOpen={!!tenantAdminToDeactivate}
        title="Desactivar administrador"
        description="El administrador quedará inactivo y no podrá acceder al panel del negocio."
        checkboxLabel="Confirmo que deseo desactivar este administrador."
        confirmText="Desactivar administrador"
        isConfirming={isDeactivating}
        onClose={closeDeactivateModal}
        onConfirm={() => void handleConfirmDeactivate()}
      />

      <ConfirmActionModal
        isOpen={!!tenantAdminToResendInvitation}
        title="Reenviar invitación"
        description={`Se invalidarán las invitaciones anteriores de ${tenantAdminToResendInvitation?.email ?? 'este administrador'} y se enviará un nuevo enlace. Solo el enlace nuevo quedará válido.`}
        checkboxLabel="Confirmo que deseo invalidar invitaciones anteriores y enviar una nueva."
        confirmText="Reenviar invitación"
        isConfirming={isResendingInvitation}
        onClose={closeResendInvitationModal}
        onConfirm={() => void handleConfirmResendInvitation()}
      />
    </section>
  );
}
