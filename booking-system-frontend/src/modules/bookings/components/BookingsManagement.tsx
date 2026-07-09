'use client';

import { useAuth } from '@/context/AuthContext';
import BookingCalendarView from '@/modules/bookings/components/BookingCalendarView';
import BookingDetailModal from '@/modules/bookings/components/BookingDetailModal';
import BookingsCreateModal from '@/modules/bookings/components/BookingsCreateModal';
import BookingsTable from '@/modules/bookings/components/BookingsTable';
import { bookingsService } from '@/modules/bookings/services/bookings.service';
import { employeesService } from '@/modules/employees/services/employees.service';
import CalendarDatePicker from '@/modules/ui/CalendarDatePicker';
import SelectField, { type SelectOption } from '@/modules/ui/SelectField';
import SectionHeader from '@/modules/ui/SectionHeader';
import TableEditModal from '@/modules/ui/TableEditModal';
import TableSkeleton from '@/modules/ui/TableSkeleton';
import type {
  Booking,
  BookingSlot,
  BookingStatus,
  EmployeeScheduleResponse,
  ListBookingsQuery,
} from '@/types/booking.types';
import type { Employee } from '@/types/employee.types';
import {
  CalendarPlus,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Copy,
  Download,
  ExternalLink,
  ListFilter,
  Plus,
  QrCode,
  Search,
  Table2,
  TimerReset,
  UserRound,
  XCircle,
  Clock3,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  {
    value: '',
    label: 'Todos los estados',
    description: 'Cualquier cita',
    icon: ListFilter,
  },
  {
    value: 'PENDING',
    label: 'Pendiente',
    description: 'Aún sin confirmar',
    icon: Clock3,
  },
  {
    value: 'CONFIRMED',
    label: 'Confirmada',
    description: 'Cita aceptada',
    icon: CheckCircle2,
  },
  {
    value: 'IN_PROGRESS',
    label: 'En progreso',
    description: 'Servicio en curso',
    icon: TimerReset,
  },
  {
    value: 'COMPLETED',
    label: 'Completada',
    description: 'Servicio realizado',
    icon: CheckCircle2,
  },
  {
    value: 'CANCELLED',
    label: 'Cancelada',
    description: 'Cita cancelada',
    icon: XCircle,
  },
  {
    value: 'NO_SHOW',
    label: 'No asistió',
    description: 'Cliente ausente',
    icon: XCircle,
  },
];

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim() ?? '';
const PUBLIC_BOOKING_PREFIX = '/book';
const BOOKINGS_FILTERS_STORAGE_KEY = 'bukky:bookings:filters:v1';

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}

function buildTenantBookingUrl(baseDomain: string, tenantSlug: string) {
  const normalizedDomain = trimTrailingSlashes(baseDomain.trim());
  const normalizedSlug = tenantSlug.trim();

  if (!normalizedDomain || !normalizedSlug) return '';

  return `${normalizedDomain}${PUBLIC_BOOKING_PREFIX}/${encodeURIComponent(normalizedSlug)}`;
}

type PendingStatusChange = {
  booking: Booking;
  status: BookingStatus;
};

type PendingReschedule = {
  booking: Booking;
  date: string;
  selectedSlotStartAt: string;
  slots: BookingSlot[];
  isLoadingSlots: boolean;
  errorMessage: string;
};

type BookingsPresentationMode = 'table' | 'calendar';
type BookingCalendarMode = 'month' | 'week' | 'day';

function isCancellationStatus(status: BookingStatus) {
  return status === 'CANCELLED' || status === 'NO_SHOW';
}

function getTodayDateInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateInputFromIso(value: string) {
  const date = new Date(value);
  return getDateInputFromDate(date);
}

function getDateInputFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const mondayBasedDay = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayBasedDay);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getCalendarQueryRange(cursorDate: Date, mode: BookingCalendarMode) {
  if (mode === 'day') {
    return {
      date_from: getDateInputFromDate(cursorDate),
      date_to: getDateInputFromDate(cursorDate),
    };
  }

  if (mode === 'week') {
    const start = startOfWeek(cursorDate);
    return {
      date_from: getDateInputFromDate(start),
      date_to: getDateInputFromDate(addDays(start, 6)),
    };
  }

  const firstOfMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
  const calendarStart = startOfWeek(firstOfMonth);
  const calendarEnd = addDays(calendarStart, 41);

  return {
    date_from: getDateInputFromDate(calendarStart),
    date_to: getDateInputFromDate(calendarEnd),
  };
}

function formatSlotRange(slot: BookingSlot) {
  const start = new Date(slot.start_at_utc);
  const end = new Date(slot.end_at_utc);
  return `${start.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${end.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function loadStoredBookingFilters(): {
  searchQuery: string;
  statusFilter: '' | BookingStatus;
  employeeFilter: string;
  dateFilter: string;
} {
  if (typeof window === 'undefined') {
    return { searchQuery: '', statusFilter: '', employeeFilter: '', dateFilter: '' };
  }

  try {
    const raw = window.localStorage.getItem(BOOKINGS_FILTERS_STORAGE_KEY);
    if (!raw) return { searchQuery: '', statusFilter: '', employeeFilter: '', dateFilter: '' };
    const parsed = JSON.parse(raw) as Partial<{
      searchQuery: string;
      statusFilter: BookingStatus | '';
      employeeFilter: string;
      dateFilter: string;
    }>;
    return {
      searchQuery: parsed.searchQuery ?? '',
      statusFilter: parsed.statusFilter ?? '',
      employeeFilter: parsed.employeeFilter ?? '',
      dateFilter: parsed.dateFilter ?? '',
    };
  } catch {
    return { searchQuery: '', statusFilter: '', employeeFilter: '', dateFilter: '' };
  }
}

type LoadBookingsOverrides = Partial<{
  searchQuery: string;
  statusFilter: '' | BookingStatus;
  employeeFilter: string;
  dateFilter: string;
  page: number;
  sort: ListBookingsQuery['sort'];
}>;

export default function BookingsManagement() {
  const bookingsRequestIdRef = useRef(0);
  const { token, user } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedEmployeeSchedule, setSelectedEmployeeSchedule] =
    useState<EmployeeScheduleResponse | null>(null);

  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isLoadingCalendarSchedule, setIsLoadingCalendarSchedule] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [dragReschedulingBookingId, setDragReschedulingBookingId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [modalError, setModalError] = useState('');

  const storedFilters = useMemo(() => loadStoredBookingFilters(), []);
  const [searchQuery, setSearchQuery] = useState(storedFilters.searchQuery);
  const [statusFilter, setStatusFilter] = useState<'' | BookingStatus>(storedFilters.statusFilter);
  const [employeeFilter, setEmployeeFilter] = useState(storedFilters.employeeFilter);
  const [dateFilter, setDateFilter] = useState(storedFilters.dateFilter);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<PendingReschedule | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [runtimeAppDomain, setRuntimeAppDomain] = useState('');
  const [isBookingLinkCopied, setIsBookingLinkCopied] = useState(false);
  const bookingQrDataUrl = '';
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [presentationMode, setPresentationMode] = useState<BookingsPresentationMode>('table');
  const [calendarMode, setCalendarMode] = useState<BookingCalendarMode>('month');
  const [calendarCursorDate, setCalendarCursorDate] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [bookingsTodayCount, setBookingsTodayCount] = useState(0);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active),
    [employees],
  );
  const employeeFilterOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: '',
        label: 'Todos los profesionales',
        description: 'Cualquier profesional',
        icon: UserRound,
      },
      ...activeEmployees.map((employee) => ({
        value: employee.id,
        label: employee.name,
        description: employee.email,
        imageUrl: employee.avatar_url,
        initials: employee.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((word) => word.charAt(0).toUpperCase())
          .join(''),
      })),
    ],
    [activeEmployees],
  );
  const isTenantAdmin = user?.role === 'TENANT_ADMIN';
  const tenantSlug = user?.tenant?.slug?.trim() ?? '';
  const bookingAppDomain = APP_DOMAIN || runtimeAppDomain;
  const tenantBookingPublicUrl = useMemo(
    () => buildTenantBookingUrl(bookingAppDomain, tenantSlug),
    [bookingAppDomain, tenantSlug],
  );
  useEffect(() => {
    if (APP_DOMAIN) return;
    if (typeof window === 'undefined') return;
    setRuntimeAppDomain(window.location.origin);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      BOOKINGS_FILTERS_STORAGE_KEY,
      JSON.stringify({ searchQuery, statusFilter, employeeFilter, dateFilter }),
    );
  }, [dateFilter, employeeFilter, searchQuery, statusFilter]);

  const loadMeta = useCallback(async () => {
    if (!token) return;
    setIsLoadingMeta(true);
    setErrorMessage('');
    try {
      const employeesData = await employeesService.findAll(token);
      setEmployees(employeesData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar empleados.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoadingMeta(false);
    }
  }, [token]);

  const loadBookings = useCallback(
    async (overrides: LoadBookingsOverrides = {}) => {
      if (!token) return;
      const requestId = ++bookingsRequestIdRef.current;
      setIsLoadingBookings(true);
      setErrorMessage('');

      try {
        const queryStatus = overrides.statusFilter ?? statusFilter;
        const queryEmployeeId = overrides.employeeFilter ?? employeeFilter;
        const queryDate = overrides.dateFilter ?? dateFilter;
        const querySearch = overrides.searchQuery ?? debouncedSearchQuery;
        const queryPage = overrides.page ?? (presentationMode === 'calendar' ? 1 : page);
        const querySort =
          overrides.sort ?? (presentationMode === 'calendar' ? 'start_asc' : 'created_desc');
        const calendarRange =
          presentationMode === 'calendar'
            ? getCalendarQueryRange(calendarCursorDate, calendarMode)
            : null;
        const response = await bookingsService.findAll(
          {
            status: queryStatus || undefined,
            employee_id: queryEmployeeId || undefined,
            date: presentationMode === 'table' ? queryDate || undefined : undefined,
            date_from: calendarRange?.date_from,
            date_to: calendarRange?.date_to,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            q: querySearch || undefined,
            sort: querySort,
            page: queryPage,
            limit: presentationMode === 'calendar' ? 100 : limit,
          },
          token,
        );
        if (requestId !== bookingsRequestIdRef.current) return;
        setBookings(response.data);
        setTotalBookings(response.pagination.total);
        setTotalPages(response.pagination.total_pages);
        setBookingsTodayCount(response.summary.today_count);

        if (presentationMode === 'table' && queryPage > response.pagination.total_pages) {
          setPage(response.pagination.total_pages);
        }
      } catch (error) {
        if (requestId !== bookingsRequestIdRef.current) return;
        const message = error instanceof Error ? error.message : 'No se pudieron cargar las citas.';
        setBookings([]);
        setTotalBookings(0);
        setTotalPages(1);
        setBookingsTodayCount(0);
        setErrorMessage(message);
        toast.error(message);
      } finally {
        if (requestId === bookingsRequestIdRef.current) setIsLoadingBookings(false);
      }
    },
    [
      dateFilter,
      debouncedSearchQuery,
      employeeFilter,
      limit,
      page,
      calendarCursorDate,
      calendarMode,
      presentationMode,
      statusFilter,
      token,
    ],
  );

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, employeeFilter, dateFilter, debouncedSearchQuery]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    let isCancelled = false;

    async function loadCalendarSchedule() {
      if (!token || presentationMode !== 'calendar' || !employeeFilter) {
        setSelectedEmployeeSchedule(null);
        setIsLoadingCalendarSchedule(false);
        return;
      }

      setIsLoadingCalendarSchedule(true);
      try {
        const schedule = await bookingsService.getEmployeeSchedule(employeeFilter, token);
        if (!isCancelled) setSelectedEmployeeSchedule(schedule);
      } catch {
        if (!isCancelled) setSelectedEmployeeSchedule(null);
      } finally {
        if (!isCancelled) setIsLoadingCalendarSchedule(false);
      }
    }

    void loadCalendarSchedule();

    return () => {
      isCancelled = true;
    };
  }, [employeeFilter, presentationMode, token]);

  const pendingBookingsCount = useMemo(
    () =>
      bookings.filter((booking) => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status))
        .length,
    [bookings],
  );

  const bookingsStats = [
    { label: 'Citas', value: totalBookings },
    { label: 'Hoy', value: bookingsTodayCount },
    { label: 'Activos', value: pendingBookingsCount },
  ];
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter.length > 0 ||
    employeeFilter.length > 0 ||
    (presentationMode === 'table' && dateFilter.length > 0);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setStatusFilter('');
    setEmployeeFilter('');
    setDateFilter('');
    setPage(1);
  }, []);

  const handleBookingCreated = useCallback(
    async (createdBooking: Booking) => {
      const nextEmployeeFilter =
        employeeFilter && createdBooking.employee_id === employeeFilter ? employeeFilter : '';

      setSearchQuery('');
      setDebouncedSearchQuery('');
      setStatusFilter('');
      setEmployeeFilter(nextEmployeeFilter);
      setDateFilter('');
      setPage(1);

      await loadBookings({
        searchQuery: '',
        statusFilter: '',
        employeeFilter: nextEmployeeFilter,
        dateFilter: '',
        page: 1,
        sort: presentationMode === 'calendar' ? 'start_asc' : 'created_desc',
      });
    },
    [employeeFilter, loadBookings, presentationMode],
  );

  const handleCopyTenantBookingUrl = useCallback(async () => {
    if (!tenantBookingPublicUrl) {
      toast.error('No se pudo construir el enlace público para compartir.');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast.error('Tu navegador no permite copiar al portapapeles.');
      return;
    }

    try {
      await navigator.clipboard.writeText(tenantBookingPublicUrl);
      setIsBookingLinkCopied(true);
      toast.success('Enlace de reservas copiado.');
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  }, [tenantBookingPublicUrl]);

  const handleDownloadTenantBookingQr = useCallback(() => {
    toast.error('El QR se gestiona desde Configuración.');
  }, []);

  useEffect(() => {
    if (!isBookingLinkCopied) return;

    const timeout = window.setTimeout(() => {
      setIsBookingLinkCopied(false);
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isBookingLinkCopied]);

  const handleBookingStatusChange = async (booking: Booking, status: BookingStatus) => {
    if (!token) return;
    if (booking.status === status) return;

    if (status === 'COMPLETED' || isCancellationStatus(status)) {
      setPendingStatusChange({ booking, status });
      setCancellationReason(
        isCancellationStatus(status) ? (booking.cancellation_reason ?? '') : '',
      );
      setModalError('');
      return;
    }

    setUpdatingBookingId(booking.id);
    setErrorMessage('');
    try {
      await bookingsService.updateStatus(booking.id, { status }, token);
      await loadBookings();
      toast.success('Estado de cita actualizado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el estado.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleCalendarDropReschedule = useCallback(
    async (booking: Booking, startAtUtc: string) => {
      if (!token) return;

      setDragReschedulingBookingId(booking.id);
      setErrorMessage('');
      try {
        await bookingsService.reschedule(
          booking.id,
          {
            start_at_utc: startAtUtc,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          token,
        );
        await loadBookings();
        toast.success('Cita reprogramada.');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo reprogramar la cita en ese horario.';
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setDragReschedulingBookingId(null);
      }
    },
    [loadBookings, token],
  );

  const closeStatusModal = useCallback(() => {
    if (updatingBookingId) return;
    setPendingStatusChange(null);
    setCancellationReason('');
    setModalError('');
  }, [updatingBookingId]);

  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const openBookingDetail = useCallback((booking: Booking) => {
    setSelectedBookingDetail(booking);
  }, []);

  const closeBookingDetail = useCallback(() => {
    setSelectedBookingDetail(null);
  }, []);

  const loadRescheduleSlots = useCallback(
    async (booking: Booking, date: string) => {
      if (!token) return;

      const serviceIds = booking.items.map((item) => item.service_id);
      if (serviceIds.length === 0) {
        setPendingReschedule((current) =>
          current && current.booking.id === booking.id
            ? {
                ...current,
                slots: [],
                isLoadingSlots: false,
                errorMessage: 'Esta cita no tiene un servicio asociado.',
              }
            : current,
        );
        return;
      }

      setPendingReschedule((current) =>
        current && current.booking.id === booking.id
          ? { ...current, date, selectedSlotStartAt: '', isLoadingSlots: true, errorMessage: '' }
          : current,
      );

      try {
        const availability = await bookingsService.getAvailability(
          {
            employee_id: booking.employee_id,
            service_ids: serviceIds,
            date,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            party_size: booking.party_size,
          },
          token,
        );
        setPendingReschedule((current) =>
          current && current.booking.id === booking.id
            ? {
                ...current,
                date,
                slots: availability.slots,
                isLoadingSlots: false,
                errorMessage:
                  availability.slots.length === 0
                    ? 'No hay horarios disponibles para ese día.'
                    : '',
              }
            : current,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudieron cargar horarios disponibles.';
        setPendingReschedule((current) =>
          current && current.booking.id === booking.id
            ? { ...current, slots: [], isLoadingSlots: false, errorMessage: message }
            : current,
        );
      }
    },
    [token],
  );

  const openRescheduleModal = useCallback(
    (booking: Booking) => {
      const initialDate = getDateInputFromIso(booking.start_at_utc);
      setPendingReschedule({
        booking,
        date: initialDate,
        selectedSlotStartAt: '',
        slots: [],
        isLoadingSlots: true,
        errorMessage: '',
      });
      setModalError('');
      void loadRescheduleSlots(booking, initialDate);
    },
    [loadRescheduleSlots],
  );

  const closeRescheduleModal = useCallback(() => {
    if (isRescheduling) return;
    setPendingReschedule(null);
    setModalError('');
  }, [isRescheduling]);

  const handleRescheduleDateChange = useCallback(
    (date: string) => {
      if (!pendingReschedule) return;
      void loadRescheduleSlots(pendingReschedule.booking, date);
    },
    [loadRescheduleSlots, pendingReschedule],
  );

  const handleRescheduleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !pendingReschedule) return;

    if (!pendingReschedule.selectedSlotStartAt) {
      setModalError('Selecciona un horario disponible para reprogramar la cita.');
      return;
    }

    setIsRescheduling(true);
    setModalError('');
    setErrorMessage('');

    try {
      await bookingsService.reschedule(
        pendingReschedule.booking.id,
        {
          start_at_utc: pendingReschedule.selectedSlotStartAt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        token,
      );
      await loadBookings();
      toast.success('Cita reprogramada correctamente.');
      setPendingReschedule(null);
      setModalError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo reprogramar la cita.';
      setModalError(message);
      toast.error(message);
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleStatusModalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || !pendingStatusChange) return;

    if (
      isCancellationStatus(pendingStatusChange.status) &&
      cancellationReason.trim().length === 0
    ) {
      setModalError('Debes indicar un motivo para cancelar o marcar como no asistió.');
      return;
    }

    setUpdatingBookingId(pendingStatusChange.booking.id);
    setModalError('');
    setErrorMessage('');

    try {
      await bookingsService.updateStatus(
        pendingStatusChange.booking.id,
        {
          status: pendingStatusChange.status,
          cancellation_reason: isCancellationStatus(pendingStatusChange.status)
            ? cancellationReason.trim()
            : undefined,
        },
        token,
      );
      await loadBookings();
      toast.success(
        pendingStatusChange.status === 'COMPLETED'
          ? 'Cita marcada como completada.'
          : 'Estado de cita actualizado.',
      );
      closeStatusModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el estado.';
      setModalError(message);
      toast.error(message);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  return (
    <section data-tour="bookings-page" className="space-y-4">
      <div data-tour="bookings-summary">
        <SectionHeader
          headerTitle="Citas"
          headerDescription="Agenda citas por profesional con horarios reales según servicios y disponibilidad."
          stats={bookingsStats}
        />
      </div>

      {false && isTenantAdmin ? (
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] border border-card-border bg-surface-panel p-4 shadow-theme-soft">
            <p className="text-sm font-semibold text-fg-strong">Checklist operativo</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-border-soft bg-surface px-3 py-3">
                <p className="text-xs font-medium text-muted">Profesionales</p>
                <p className="mt-1 text-sm font-semibold text-fg">
                  {activeEmployees.length > 0 ? 'Listos' : 'Faltan profesionales'}
                </p>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface px-3 py-3">
                <p className="text-xs font-medium text-muted">Enlace público</p>
                <p className="mt-1 text-sm font-semibold text-fg">
                  {tenantBookingPublicUrl ? 'Disponible' : 'Falta dominio público'}
                </p>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface px-3 py-3">
                <p className="text-xs font-medium text-muted">Citas de hoy</p>
                <p className="mt-1 text-sm font-semibold text-fg">{bookingsTodayCount}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Para recibir reservas online, el negocio necesita al menos un servicio activo, un
              profesional activo y horarios publicados para ese profesional.
            </p>
          </div>

          <div className="rounded-[24px] border border-card-border bg-surface-panel p-4 shadow-theme-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-fg-strong">Enlace público de reservas</p>
                <p className="mt-1 text-xs text-muted">
                  Compártelo como enlace o QR para que tus clientes reserven.
                </p>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-accent">
                <QrCode className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-1 break-all rounded-2xl border border-border-soft bg-surface px-3 py-2 text-xs text-muted">
              {tenantBookingPublicUrl || 'Configura el dominio público para generar el enlace.'}
            </p>
            <div className="mt-3 rounded-3xl border border-border-soft bg-surface px-4 py-4">
              {bookingQrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bookingQrDataUrl}
                  alt="QR del enlace público de reservas"
                  className="mx-auto h-40 w-40 rounded-2xl bg-white p-2"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border text-center text-xs text-muted">
                  El QR aparecerá cuando exista un enlace público.
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!tenantBookingPublicUrl}
                onClick={() => {
                  void handleCopyTenantBookingUrl();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-fg disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar enlace
              </button>
              <button
                type="button"
                disabled={!bookingQrDataUrl}
                onClick={handleDownloadTenantBookingQr}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-fg disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar QR
              </button>
              <a
                href={tenantBookingPublicUrl || undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!tenantBookingPublicUrl}
                className={`inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-fg ${
                  tenantBookingPublicUrl ? '' : 'pointer-events-none opacity-50'
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver vista pública
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div
        data-tour="bookings-workspace"
        className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-fg-strong">Citas agendadas</h3>
            <p className="text-sm text-muted">Controla estados, profesionales y agenda diaria.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            <div
              data-tour="bookings-view-switch"
              className="rounded-2xl border border-border bg-surface p-1"
            >
              <button
                type="button"
                onClick={() => setPresentationMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  presentationMode === 'table'
                    ? 'bg-accent text-accent-text shadow-theme-accent'
                    : 'text-fg-secondary hover:bg-surface-soft'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                Tabla
              </button>
              <button
                type="button"
                onClick={() => setPresentationMode('calendar')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  presentationMode === 'calendar'
                    ? 'bg-accent text-accent-text shadow-theme-accent'
                    : 'text-fg-secondary hover:bg-surface-soft'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendario
              </button>
            </div>
            <button
              type="button"
              data-tour="bookings-create-button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent transition hover:brightness-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Registrar cita
            </button>
          </div>
        </div>

        <div
          data-tour="bookings-filters"
          className={`mt-4 grid gap-2 sm:grid-cols-2 ${
            presentationMode === 'table' ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
          }`}
        >
          <label className="relative min-w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-placeholder" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-fg outline-none transition focus:border-accent"
              placeholder="Buscar cita..."
            />
          </label>

          <SelectField
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as '' | BookingStatus)}
            options={STATUS_FILTER_OPTIONS}
            triggerClassName="h-11 rounded-2xl"
          />

          <SelectField
            value={employeeFilter}
            onValueChange={setEmployeeFilter}
            options={employeeFilterOptions}
            triggerClassName="h-11 rounded-2xl"
            disabled={isLoadingMeta}
          />

          {presentationMode === 'table' ? (
            <CalendarDatePicker
              value={dateFilter}
              onChange={setDateFilter}
              placeholder="Filtrar por día"
              buttonClassName="h-11 rounded-2xl"
            />
          ) : null}
        </div>

        {hasActiveFilters ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-fg transition hover:bg-surface-soft"
            >
              <ListFilter className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          </div>
        ) : null}

        {errorMessage ? <p className="mt-4 text-sm text-danger">{errorMessage}</p> : null}

        {isLoadingMeta || isLoadingBookings ? (
          <TableSkeleton />
        ) : presentationMode === 'calendar' ? (
          <div data-tour="bookings-calendar" className="mt-6">
            <BookingCalendarView
              bookings={bookings}
              employees={activeEmployees}
              selectedEmployeeId={employeeFilter}
              selectedEmployeeSchedule={selectedEmployeeSchedule}
              mode={calendarMode}
              cursorDate={calendarCursorDate}
              selectedDate={selectedCalendarDate}
              isLoading={isLoadingBookings || isLoadingCalendarSchedule}
              reschedulingBookingId={dragReschedulingBookingId}
              onModeChange={setCalendarMode}
              onCursorDateChange={setCalendarCursorDate}
              onSelectedDateChange={setSelectedCalendarDate}
              onOpenDetail={openBookingDetail}
              onCreateBooking={openCreateModal}
              onDropReschedule={(booking, startAtUtc) => {
                void handleCalendarDropReschedule(booking, startAtUtc);
              }}
            />
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-base font-medium text-fg">
              {hasActiveFilters
                ? 'No hay resultados para los filtros actuales.'
                : bookingsTodayCount === 0
                  ? 'No hay citas hoy.'
                  : 'No hay citas registradas todavía.'}
            </p>
            <p className="mt-2 text-sm text-muted">
              {hasActiveFilters
                ? 'Limpia los filtros o ajusta la búsqueda para ver más resultados.'
                : 'Crea una cita manual o comparte el enlace de reservas con tus clientes.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-xl border border-border bg-surface-soft px-4 py-2 text-sm font-medium text-fg"
                >
                  Limpiar filtros
                </button>
              ) : null}
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-text shadow-theme-accent"
              >
                Crear cita
              </button>
              {tenantBookingPublicUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyTenantBookingUrl();
                  }}
                  className="rounded-xl border border-border bg-surface-soft px-4 py-2 text-sm font-medium text-fg"
                >
                  Compartir enlace
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div data-tour="bookings-table">
            <BookingsTable
              bookings={bookings}
              updatingBookingId={updatingBookingId}
              onReschedule={openRescheduleModal}
              onOpenDetail={openBookingDetail}
              onStatusChange={(booking, status) => {
                void handleBookingStatusChange(booking, status);
              }}
            />
          </div>
        )}

        {!isLoadingBookings && presentationMode === 'table' && totalBookings > 0 ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted">
              Mostrando {(page - 1) * limit + 1}-{(page - 1) * limit + bookings.length} de{' '}
              {totalBookings} citas.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || isLoadingBookings}
                className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || isLoadingBookings}
                className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <BookingsCreateModal
        isOpen={isCreateModalOpen}
        token={token}
        onClose={closeCreateModal}
        onBookingCreated={handleBookingCreated}
      />

      <BookingDetailModal
        isOpen={selectedBookingDetail !== null}
        booking={
          selectedBookingDetail
            ? (bookings.find((booking) => booking.id === selectedBookingDetail.id) ??
              selectedBookingDetail)
            : null
        }
        onClose={closeBookingDetail}
        onReschedule={(booking) => {
          closeBookingDetail();
          openRescheduleModal(booking);
        }}
        onStatusChange={(booking, status) => {
          closeBookingDetail();
          void handleBookingStatusChange(booking, status);
        }}
      />

      <TableEditModal
        isOpen={pendingReschedule !== null}
        badgeLabel="Reprogramar"
        badgeIcon={<CalendarPlus className="h-3.5 w-3.5" />}
        title="Reprogramar cita"
        description={
          pendingReschedule
            ? `Cliente: ${pendingReschedule.booking.customer_name}. Profesional: ${pendingReschedule.booking.employee?.name ?? 'N/A'}.`
            : ''
        }
        helperText="Solo se muestran horarios disponibles para el mismo servicio y profesional."
        errorMessage={modalError || pendingReschedule?.errorMessage}
        submitText={isRescheduling ? 'Reprogramando...' : 'Guardar nueva fecha'}
        isSubmitting={isRescheduling}
        maxWidthClassName="max-w-3xl"
        onClose={closeRescheduleModal}
        onSubmit={handleRescheduleSubmit}
      >
        {pendingReschedule ? (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border-soft bg-surface px-4 py-4">
              <p className="text-sm font-medium text-fg-strong">
                Cita actual:{' '}
                {new Date(pendingReschedule.booking.start_at_utc).toLocaleString('es-ES', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
              <p className="mt-1 text-sm text-muted">
                Servicio:{' '}
                {pendingReschedule.booking.items
                  .map((item) => item.service_name_snapshot)
                  .join(', ')}
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-fg-label">Nueva fecha</span>
              <CalendarDatePicker
                value={pendingReschedule.date}
                onChange={handleRescheduleDateChange}
                minDate={getTodayDateInput()}
                placeholder="Selecciona una fecha"
                buttonClassName="h-11 rounded-2xl"
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-fg-label">Horarios disponibles</p>
              {pendingReschedule.isLoadingSlots ? (
                <div className="rounded-3xl border border-border-soft bg-surface px-4 py-6 text-sm text-muted">
                  Cargando horarios...
                </div>
              ) : pendingReschedule.slots.length === 0 ? (
                <div className="rounded-3xl border border-border-soft bg-surface px-4 py-6 text-sm text-muted">
                  No hay horarios disponibles para esta fecha.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingReschedule.slots.map((slot) => {
                    const isSelected = pendingReschedule.selectedSlotStartAt === slot.start_at_utc;
                    return (
                      <button
                        key={slot.start_at_utc}
                        type="button"
                        onClick={() => {
                          setPendingReschedule((current) =>
                            current
                              ? { ...current, selectedSlotStartAt: slot.start_at_utc }
                              : current,
                          );
                          setModalError('');
                        }}
                        className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                          isSelected
                            ? 'border-accent bg-accent text-accent-text'
                            : 'border-border bg-surface text-fg hover:border-accent'
                        }`}
                      >
                        <span className="block font-semibold">{formatSlotRange(slot)}</span>
                        <span className="mt-1 block text-xs text-muted">
                          Cupos disponibles: {slot.available_capacity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </TableEditModal>

      <TableEditModal
        isOpen={pendingStatusChange !== null}
        badgeLabel={
          pendingStatusChange?.status === 'COMPLETED' ? 'Cerrar cita' : 'Actualizar estado'
        }
        badgeIcon={
          pendingStatusChange?.status === 'COMPLETED' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <CircleAlert className="h-3.5 w-3.5" />
          )
        }
        title={
          pendingStatusChange?.status === 'COMPLETED'
            ? 'Marcar cita como completada'
            : pendingStatusChange?.status === 'NO_SHOW'
              ? 'Marcar cita como no asistió'
              : 'Cancelar cita'
        }
        description={
          pendingStatusChange
            ? `Cliente: ${pendingStatusChange.booking.customer_name}. Profesional: ${pendingStatusChange.booking.employee?.name ?? 'N/A'}.`
            : ''
        }
        helperText={
          pendingStatusChange?.status === 'COMPLETED'
            ? 'Confirma solo cuando el servicio ya fue realizado.'
            : 'Este motivo quedará guardado y visible en la gestión de citas.'
        }
        errorMessage={modalError}
        submitText={
          updatingBookingId
            ? 'Guardando...'
            : pendingStatusChange?.status === 'COMPLETED'
              ? 'Confirmar completada'
              : 'Guardar motivo'
        }
        isSubmitting={updatingBookingId !== null}
        maxWidthClassName="max-w-2xl"
        onClose={closeStatusModal}
        onSubmit={handleStatusModalSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-3xl border border-border-soft bg-surface px-4 py-4">
            <p className="text-sm font-medium text-fg-strong">
              Nuevo estado:
              <span className="ml-2 inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-fg-secondary">
                {pendingStatusChange?.status === 'COMPLETED'
                  ? 'Completada'
                  : pendingStatusChange?.status === 'NO_SHOW'
                    ? 'No asistió'
                    : 'Cancelada'}
              </span>
            </p>
            <p className="mt-2 text-sm text-muted">
              {pendingStatusChange?.status === 'COMPLETED'
                ? 'Esta cita dejará de estar activa y contará como atendida.'
                : 'La cita dejará de bloquear agenda y el motivo quedará trazado.'}
            </p>
          </div>

          {pendingStatusChange && isCancellationStatus(pendingStatusChange.status) ? (
            <label className="block space-y-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-fg-label">
                <XCircle className="h-4 w-4 text-danger" />
                Motivo
              </span>
              <textarea
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                rows={5}
                maxLength={500}
                className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none transition focus:border-accent"
                placeholder={
                  pendingStatusChange.status === 'NO_SHOW'
                    ? 'Ej: el cliente no se presentó a la cita.'
                    : 'Ej: el cliente canceló, hubo un problema operativo, reagendado, etc.'
                }
              />
              <p className="text-xs text-muted">
                {cancellationReason.trim().length}/500 caracteres
              </p>
            </label>
          ) : null}
        </div>
      </TableEditModal>
    </section>
  );
}
