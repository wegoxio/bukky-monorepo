'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { employeesService } from '@/modules/employees/services/employees.service';
import { servicesService } from '@/modules/services/services/services.service';
import ServiceEditModalContent from '@/modules/services/components/ServiceEditModalContent';
import { ServicesList } from '@/modules/services/components/ServicesList';
import { getPhoneSearchValue } from '@/modules/phone/utils/phone';
import SectionHeader from '@/modules/ui/SectionHeader';
import TableEditModal from '@/modules/ui/TableEditModal';
import TableHeader from '@/modules/ui/TableHeader';
import TableSkeleton from '@/modules/ui/TableSkeleton';
import type { Employee } from '@/types/employee.types';
import type { Service, ServiceFormState } from '@/types/service.types';
import { wait } from '@/utils/delay';
import { validateServiceForm } from '@/utils/validation';
import {
  emptyServiceForm,
  serviceToFormState,
  toCreateServicePayload,
  toUpdateServicePayload,
} from '../utils/service-form.utils';
import { toast } from 'react-hot-toast';

export default function ServicesManagement() {
  const { token } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ServiceFormState>(emptyServiceForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active),
    [employees],
  );

  const activeServicesCount = useMemo(
    () => services.filter((service) => service.is_active).length,
    [services],
  );

  const filteredServices = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return services;

    return services.filter((service) => {
      const employeeNames = service.employees.map((employee) => employee.name).join(' ');
      const haystack =
        `${service.name} ${service.description ?? ''} ${service.instructions ?? ''} ${employeeNames} ${service.currency}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [searchQuery, services]);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = employeeSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return activeEmployees;
    }

    return activeEmployees.filter((employee) => {
      const haystack = `${employee.name} ${employee.email} ${getPhoneSearchValue({
        display: employee.phone,
        nationalNumber: employee.phone_national_number,
        e164: employee.phone_e164,
      })}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeEmployees, employeeSearch]);

  const selectedEmployees = useMemo(
    () => activeEmployees.filter((employee) => form.employee_ids.includes(employee.id)),
    [activeEmployees, form.employee_ids],
  );

  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [servicesData, employeesData] = await Promise.all([
        servicesService.findAll(token),
        employeesService.findAll(token),
      ]);
      await wait(600);
      setServices(servicesData);
      setEmployees(employeesData);
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
    setForm(emptyServiceForm);
    setFormError('');
    setEmployeeSearch('');
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingId(service.id);
    setForm(serviceToFormState(service));
    setFormError('');
    setEmployeeSearch('');
    setIsModalOpen(true);
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setForm((prev) => {
      const selected = new Set(prev.employee_ids);
      if (selected.has(employeeId)) {
        selected.delete(employeeId);
      } else {
        selected.add(employeeId);
      }
      return { ...prev, employee_ids: Array.from(selected) };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    const validationError = validateServiceForm(form);
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await servicesService.update(editingId, toUpdateServicePayload(form), token);
        toast.success('Servicio actualizado correctamente.');
      } else {
        await servicesService.create(toCreateServicePayload(form), token);
        toast.success('Servicio creado correctamente.');
      }
      await loadData();
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el servicio.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleServiceStatus = async (service: Service) => {
    if (!token) return;
    setIsTogglingId(service.id);
    setErrorMessage('');
    try {
      await servicesService.toggleStatus(service.id, { is_active: !service.is_active }, token);
      await loadData();
      toast.success(
        service.is_active
          ? 'Servicio desactivado correctamente.'
          : 'Servicio activado correctamente.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar el estado.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsTogglingId(null);
    }
  };

  const servicesStats = [
    { label: 'Servicios', value: services.length },
    { label: 'Activos', value: activeServicesCount },
    { label: 'Empleados activos', value: activeEmployees.length },
  ];

  return (
    <section data-tour="services-page" className="space-y-4">
      <div data-tour="services-summary">
        <SectionHeader
          headerTitle="Servicios"
          headerDescription="Crea y edita servicios del negocio. Cada servicio debe tener al menos un empleado asignado."
          stats={servicesStats}
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div
          data-tour="services-list-panel"
          className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card"
        >
          <div data-tour="services-controls">
            <TableHeader
              title="Listado"
              subtitle="Vista operativa de precios, tiempos y equipo asignado."
              inputStateValue={searchQuery}
              inputOnchange={setSearchQuery}
              buttonOnOpen={openCreateModal}
              buttonLabel="Crear servicio"
              searchPlaceholder="Buscar por nombre, descripción o equipo"
            />
          </div>

          {errorMessage ? (
            <p className="mt-4 text-sm text-danger">{errorMessage}</p>
          ) : filteredServices.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-border bg-surface px-6 py-10 text-center">
              <p className="text-base font-medium text-fg">
                {services.length === 0
                  ? 'No hay servicios registrados.'
                  : 'No hay resultados para esa búsqueda.'}
              </p>
              <p className="mt-2 text-sm text-muted">
                {services.length === 0
                  ? 'Crea el primero para empezar a configurar reservas.'
                  : 'Prueba otro termino o limpia el filtro actual.'}
              </p>
            </div>
          ) : (
            <div data-tour="services-table">
              <ServicesList
                services={filteredServices}
                isTogglingId={isTogglingId}
                onEdit={openEditModal}
                onToggleStatus={(service) => void handleToggleServiceStatus(service)}
              />
            </div>
          )}
        </div>
      )}

      <TableEditModal
        isOpen={isModalOpen}
        badgeLabel={editingId ? 'Editar servicio' : 'Nuevo servicio'}
        badgeIcon={<Sparkles className="h-3.5 w-3.5" />}
        title={editingId ? 'Editar servicio' : 'Crear servicio'}
        description="Configura nombre, precio, duración y el equipo asignado desde un solo lugar."
        helperText="Los cambios se guardan en el mismo flujo actual."
        errorMessage={formError}
        submitText={isSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear servicio'}
        isSubmitting={isSaving}
        maxWidthClassName="max-w-4xl"
        onClose={closeModal}
        onSubmit={handleSubmit}
      >
        <ServiceEditModalContent
          form={form}
          isEditing={!!editingId}
          activeEmployees={activeEmployees}
          filteredEmployees={filteredEmployees}
          selectedEmployees={selectedEmployees}
          employeeSearch={employeeSearch}
          onFormChange={setForm}
          onEmployeeSearchChange={setEmployeeSearch}
          onEmployeeToggle={handleEmployeeToggle}
        />
      </TableEditModal>
    </section>
  );
}
