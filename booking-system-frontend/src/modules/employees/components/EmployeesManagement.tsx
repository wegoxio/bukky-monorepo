'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import EmployeeEditModalContent from '@/modules/employees/components/EmployeeEditModalContent';
import EmployeesTable from '@/modules/employees/components/EmployeesTable';
import EmployeeScheduleModal from '@/modules/employees/components/EmployeeScheduleModal';
import { employeesService } from '@/modules/employees/services/employees.service';
import SectionHeader from '@/modules/ui/SectionHeader';
import TableEditModal from '@/modules/ui/TableEditModal';
import TableHeader from '@/modules/ui/TableHeader';
import TableSkeleton from '@/modules/ui/TableSkeleton';
import {
  getPhoneSearchValue,
  hasStructuredPhoneValue,
  normalizePhoneCountryIso2,
  normalizePhoneDigits,
} from '@/modules/phone/utils/phone';
import type {
  CreateEmployeePayload,
  Employee,
  EmployeeFormState,
  UpdateEmployeePayload,
} from '@/types/employee.types';
import { wait } from '@/utils/delay';
import { validateEmployeeCreateForm } from '@/utils/validation';
import { toast } from 'react-hot-toast';

const emptyForm: EmployeeFormState = {
  name: '',
  email: '',
  phone_country_iso2: '',
  phone_national_number: '',
  phone_legacy: '',
  avatar_url: null,
  avatar_file: null,
  is_active: true,
};

const EMPLOYEE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const EMPLOYEE_AVATAR_ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export default function EmployeesManagement() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedScheduleEmployeeId, setSelectedScheduleEmployeeId] = useState('');

  const activeEmployeesCount = useMemo(
    () => employees.filter((employee) => employee.is_active).length,
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return employees;
    }

    return employees.filter((employee) => {
      const haystack = `${employee.name} ${employee.email} ${getPhoneSearchValue({
        display: employee.phone,
        nationalNumber: employee.phone_national_number,
        e164: employee.phone_e164,
      })}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [employees, searchQuery]);

  const loadEmployees = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await employeesService.findAll(token);
      await wait(600);
      setEmployees(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar empleados.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const openCreateModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      phone_country_iso2: employee.phone_country_iso2 ?? '',
      phone_national_number: employee.phone_national_number ?? '',
      phone_legacy:
        employee.phone_country_iso2 || employee.phone_national_number ? '' : (employee.phone ?? ''),
      avatar_url: employee.avatar_url ?? null,
      avatar_file: null,
      is_active: employee.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
  }, []);

  const openScheduleModal = useCallback((employee: Employee) => {
    setSelectedScheduleEmployeeId(employee.id);
    setIsScheduleModalOpen(true);
  }, []);

  const closeScheduleModal = useCallback(() => {
    setIsScheduleModalOpen(false);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!token) return;

    const validationError = validateEmployeeCreateForm(form);
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    const hasStructuredPhone = hasStructuredPhoneValue(
      form.phone_country_iso2,
      form.phone_national_number,
    );
    const normalizedLegacyPhone = form.phone_legacy.trim();

    const basePayload: CreateEmployeePayload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
    };

    if (hasStructuredPhone) {
      basePayload.phone = null;
      basePayload.phone_country_iso2 = normalizePhoneCountryIso2(form.phone_country_iso2);
      basePayload.phone_national_number = normalizePhoneDigits(form.phone_national_number);
    } else if (normalizedLegacyPhone) {
      basePayload.phone = normalizedLegacyPhone;
      basePayload.phone_country_iso2 = null;
      basePayload.phone_national_number = null;
    } else if (editingId) {
      basePayload.phone = null;
      basePayload.phone_country_iso2 = null;
      basePayload.phone_national_number = null;
    }

    setIsSaving(true);
    setFormError('');

    try {
      let savedEmployee: Employee;
      if (editingId) {
        const payload: UpdateEmployeePayload = {
          ...basePayload,
          is_active: form.is_active,
        };
        savedEmployee = await employeesService.update(editingId, payload, token);
        toast.success('Empleado actualizado correctamente.');
      } else {
        savedEmployee = await employeesService.create(basePayload, token);
        toast.success('Empleado creado correctamente.');
      }

      if (form.avatar_file) {
        await employeesService.uploadAvatar(savedEmployee.id, form.avatar_file, token);
      }

      await loadEmployees();
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el empleado.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const employeesStats = [
    {
      label: 'Empleados',
      value: employees.length,
    },
    {
      label: 'Activos',
      value: activeEmployeesCount,
    },
  ];

  return (
    <section data-tour="employees-page" className="space-y-4">
      <div data-tour="employees-summary">
        <SectionHeader
          headerTitle="Empleados"
          headerDescription="Gestiona el personal que atiende servicios y mantiene operativa la agenda."
          stats={employeesStats}
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div
          data-tour="employees-list-panel"
          className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card"
        >
          <div data-tour="employees-controls">
            <TableHeader
              title="Listado"
              subtitle="Vista del equipo, disponibilidad y datos de contacto."
              inputStateValue={searchQuery}
              inputOnchange={setSearchQuery}
              buttonOnOpen={openCreateModal}
              buttonLabel="Crear empleado"
              searchPlaceholder="Buscar por nombre, correo o teléfono"
            />
          </div>

          {errorMessage ? (
            <p className="mt-4 text-sm text-danger">{errorMessage}</p>
          ) : filteredEmployees.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-border bg-surface px-6 py-10 text-center">
              <p className="text-base font-medium text-fg">
                {employees.length === 0
                  ? 'No hay empleados registrados todavía.'
                  : 'No hay resultados para esa búsqueda.'}
              </p>
              <p className="mt-2 text-sm text-muted">
                {employees.length === 0
                  ? 'Crea el primero para comenzar a asignar servicios.'
                  : 'Prueba otro término o limpia el filtro actual.'}
              </p>
            </div>
          ) : (
            <div data-tour="employees-table">
              <EmployeesTable
                employees={filteredEmployees}
                onEdit={openEditModal}
                onOpenSchedule={openScheduleModal}
              />
            </div>
          )}
        </div>
      )}

      <TableEditModal
        isOpen={isModalOpen}
        badgeLabel={editingId ? 'Editar empleado' : 'Nuevo empleado'}
        badgeIcon={<UserRound className="h-3.5 w-3.5" />}
        title={editingId ? 'Editar empleado' : 'Crear empleado'}
        description="Mantén actualizada la información del equipo desde un flujo simple."
        helperText="Esta acción editará la información del usuario permanentemente."
        errorMessage={formError}
        submitText={isSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear empleado'}
        isSubmitting={isSaving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      >
        <EmployeeEditModalContent
          form={form}
          isEditing={!!editingId}
          onNameChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
          onEmailChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
          onPhoneCountryChange={(value) =>
            setForm((prev) => ({ ...prev, phone_country_iso2: value }))
          }
          onPhoneNationalNumberChange={(value) =>
            setForm((prev) => ({ ...prev, phone_national_number: value }))
          }
          onClearPhone={() =>
            setForm((prev) => ({
              ...prev,
              phone_country_iso2: '',
              phone_national_number: '',
              phone_legacy: '',
            }))
          }
          onAvatarFileChange={(file) => {
            if (!file) {
              setForm((prev) => ({ ...prev, avatar_file: null }));
              return;
            }

            if (!EMPLOYEE_AVATAR_ALLOWED_TYPES.has(file.type)) {
              const message = 'La foto debe ser PNG, JPG o WEBP.';
              setFormError(message);
              toast.error(message);
              return;
            }

            if (file.size > EMPLOYEE_AVATAR_MAX_BYTES) {
              const message = 'La foto no puede superar 2 MB.';
              setFormError(message);
              toast.error(message);
              return;
            }

            setForm((prev) => ({ ...prev, avatar_file: file }));
            setFormError('');
          }}
          onIsActiveChange={(value) => setForm((prev) => ({ ...prev, is_active: value }))}
        />
      </TableEditModal>

      <EmployeeScheduleModal
        isOpen={isScheduleModalOpen}
        token={token}
        employees={employees}
        selectedEmployeeId={selectedScheduleEmployeeId}
        onSelectEmployee={setSelectedScheduleEmployeeId}
        onClose={closeScheduleModal}
      />
    </section>
  );
}
