'use client';

import Avatar from '@/modules/ui/Avatar';
import type { Booking, BookingStatus, EmployeeScheduleResponse } from '@/types/booking.types';
import type { Employee } from '@/types/employee.types';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Columns3,
  GripVertical,
  LayoutGrid,
  List,
  Plus,
  ShieldAlert,
  UsersRound,
} from 'lucide-react';

type CalendarMode = 'month' | 'week' | 'day';

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

const STATUS_DOT_CLASS: Record<BookingStatus, string> = {
  PENDING: 'bg-warning',
  CONFIRMED: 'bg-info',
  IN_PROGRESS: 'bg-warning',
  COMPLETED: 'bg-success',
  CANCELLED: 'bg-danger',
  NO_SHOW: 'bg-neutral',
};

const STATUS_CARD_CLASS: Record<BookingStatus, string> = {
  PENDING: 'border-border-warning bg-surface-warning-soft text-warning',
  CONFIRMED: 'border-border-info bg-surface-info text-info',
  IN_PROGRESS: 'border-border-warning bg-surface-warning text-warning',
  COMPLETED: 'border-border-success bg-surface-success text-success',
  CANCELLED: 'border-border-danger bg-surface-danger text-danger',
  NO_SHOW: 'border-border bg-surface-muted text-neutral',
};

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_HOURS = Array.from({ length: 15 }, (_, index) => index + 7);

function toDateInput(date: Date) {
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

function buildMonthDays(cursorDate: Date) {
  const firstOfMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
  const start = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function buildWeekDays(cursorDate: Date) {
  const start = startOfWeek(cursorDate);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function formatCalendarTitle(date: Date, mode: CalendarMode) {
  if (mode === 'day') {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  if (mode === 'week') {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    })} - ${end.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }

  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBookingsForDate(bookings: Booking[], date: Date) {
  const dateKey = toDateInput(date);
  return bookings
    .filter((booking) => toDateInput(new Date(booking.start_at_utc)) === dateKey)
    .sort(
      (left, right) =>
        new Date(left.start_at_utc).getTime() - new Date(right.start_at_utc).getTime(),
    );
}

function getBookingsForHour(bookings: Booking[], date: Date, hour: number) {
  const dateKey = toDateInput(date);
  return bookings.filter((booking) => {
    const start = new Date(booking.start_at_utc);
    return toDateInput(start) === dateKey && start.getHours() === hour;
  });
}

function getDayOccupancy(bookings: Booking[]) {
  const active = bookings.filter((booking) =>
    ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status),
  );
  const people = active.reduce((sum, booking) => sum + booking.party_size, 0);
  return { active: active.length, people };
}

function canDragBooking(booking: Booking) {
  return booking.status === 'PENDING' || booking.status === 'CONFIRMED';
}

function buildLocalIso(date: Date, hour: number, minute = 0) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
}

function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function isWithinLocalInterval(date: Date, startTime: string, endTime: string) {
  const [startHour = 0, startMinute = 0] = startTime.split(':').map(Number);
  const [endHour = 0, endMinute = 0] = endTime.split(':').map(Number);
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= startHour * 60 + startMinute && minutes < endHour * 60 + endMinute;
}

function isWorkingHour(schedule: EmployeeScheduleResponse | null, date: Date, hour: number) {
  if (!schedule) return true;
  const day = getWeekdayIndex(date);
  const hourDate = new Date(date);
  hourDate.setHours(hour, 0, 0, 0);
  return schedule.working_hours.some(
    (interval) =>
      interval.is_active &&
      interval.day_of_week === day &&
      isWithinLocalInterval(hourDate, interval.start_time_local, interval.end_time_local),
  );
}

function isBreakHour(schedule: EmployeeScheduleResponse | null, date: Date, hour: number) {
  if (!schedule) return false;
  const day = getWeekdayIndex(date);
  const hourDate = new Date(date);
  hourDate.setHours(hour, 0, 0, 0);
  return schedule.breaks.some(
    (interval) =>
      interval.is_active &&
      interval.day_of_week === day &&
      isWithinLocalInterval(hourDate, interval.start_time_local, interval.end_time_local),
  );
}

function isTimeOffHour(schedule: EmployeeScheduleResponse | null, date: Date, hour: number) {
  if (!schedule) return false;
  const start = new Date(date);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(date);
  end.setHours(hour + 1, 0, 0, 0);
  return schedule.active_time_off.some((timeOff) => {
    if (!timeOff.is_active) return false;
    const timeOffStart = new Date(timeOff.start_at_utc);
    const timeOffEnd = new Date(timeOff.end_at_utc);
    return timeOffStart < end && timeOffEnd > start;
  });
}

type BookingCalendarViewProps = {
  bookings: Booking[];
  employees: Employee[];
  selectedEmployeeId: string;
  selectedEmployeeSchedule: EmployeeScheduleResponse | null;
  mode: CalendarMode;
  cursorDate: Date;
  selectedDate: Date;
  isLoading: boolean;
  reschedulingBookingId?: string | null;
  onModeChange: (mode: CalendarMode) => void;
  onCursorDateChange: (date: Date) => void;
  onSelectedDateChange: (date: Date) => void;
  onOpenDetail: (booking: Booking) => void;
  onCreateBooking: () => void;
  onDropReschedule: (booking: Booking, startAtUtc: string) => void;
};

export default function BookingCalendarView({
  bookings,
  employees,
  selectedEmployeeId,
  selectedEmployeeSchedule,
  mode,
  cursorDate,
  selectedDate,
  isLoading,
  reschedulingBookingId,
  onModeChange,
  onCursorDateChange,
  onSelectedDateChange,
  onOpenDetail,
  onCreateBooking,
  onDropReschedule,
}: BookingCalendarViewProps) {
  const days =
    mode === 'month'
      ? buildMonthDays(cursorDate)
      : mode === 'week'
        ? buildWeekDays(cursorDate)
        : [selectedDate];
  const selectedBookings = getBookingsForDate(bookings, selectedDate);
  const selectedOccupancy = getDayOccupancy(selectedBookings);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const todayKey = toDateInput(new Date());
  const selectedKey = toDateInput(selectedDate);

  const handlePrevious = () => {
    const next = new Date(cursorDate);
    if (mode === 'month') next.setMonth(next.getMonth() - 1);
    if (mode === 'week') next.setDate(next.getDate() - 7);
    if (mode === 'day') next.setDate(next.getDate() - 1);
    onCursorDateChange(next);
    onSelectedDateChange(next);
  };

  const handleNext = () => {
    const next = new Date(cursorDate);
    if (mode === 'month') next.setMonth(next.getMonth() + 1);
    if (mode === 'week') next.setDate(next.getDate() + 7);
    if (mode === 'day') next.setDate(next.getDate() + 1);
    onCursorDateChange(next);
    onSelectedDateChange(next);
  };

  const handleToday = () => {
    const today = new Date();
    onCursorDateChange(today);
    onSelectedDateChange(today);
  };

  const handleDragStart = (event: React.DragEvent<HTMLElement>, booking: Booking) => {
    if (!canDragBooking(booking)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', booking.id);
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>, date: Date, hour?: number) => {
    event.preventDefault();
    const bookingId = event.dataTransfer.getData('text/plain');
    const booking = bookings.find((item) => item.id === bookingId);
    if (!booking || !canDragBooking(booking)) return;

    const currentStart = new Date(booking.start_at_utc);
    const targetStart =
      typeof hour === 'number'
        ? buildLocalIso(date, hour, currentStart.getMinutes())
        : buildLocalIso(date, currentStart.getHours(), currentStart.getMinutes());

    if (targetStart === booking.start_at_utc) return;
    onDropReschedule(booking, targetStart);
  };

  const renderBookingPill = (booking: Booking, compact = false) => (
    <button
      key={booking.id}
      type="button"
      draggable={canDragBooking(booking)}
      onDragStart={(event) => handleDragStart(event, booking)}
      onClick={(event) => {
        event.stopPropagation();
        onOpenDetail(booking);
      }}
      className={`group/booking flex w-full items-center gap-1.5 truncate rounded-xl border px-2 py-1 text-left text-[11px] font-semibold transition hover:brightness-95 ${STATUS_CARD_CLASS[booking.status]} ${
        reschedulingBookingId === booking.id ? 'opacity-60' : ''
      }`}
      title={`${formatTime(booking.start_at_utc)} · ${booking.customer_name}`}
    >
      {canDragBooking(booking) ? <GripVertical className="h-3 w-3 shrink-0 opacity-60" /> : null}
      <span className="truncate">
        {formatTime(booking.start_at_utc)}
        {compact ? '' : ` · ${booking.customer_name}`}
      </span>
    </button>
  );

  const renderDayGrid = () => (
    <div className="overflow-hidden rounded-b-4xl border-t border-border-soft">
      <div
        className={`grid ${mode === 'week' ? 'grid-cols-[74px_repeat(7,minmax(128px,1fr))]' : 'grid-cols-[74px_minmax(0,1fr)]'}`}
      >
        <div className="border-b border-border-soft bg-surface-soft" />
        {days.map((day) => (
          <button
            key={toDateInput(day)}
            type="button"
            onClick={() => onSelectedDateChange(day)}
            className={`border-b border-l border-border-soft bg-surface-soft px-3 py-3 text-left transition hover:bg-surface-muted ${
              toDateInput(day) === selectedKey ? 'text-accent' : 'text-fg'
            }`}
          >
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {WEEKDAY_LABELS[getWeekdayIndex(day)]}
            </span>
            <span className="mt-1 block text-lg font-semibold">{day.getDate()}</span>
          </button>
        ))}

        {DAY_HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-border-soft bg-surface-soft px-3 py-3 text-xs font-semibold text-muted">
              {String(hour).padStart(2, '0')}:00
            </div>
            {days.map((day) => {
              const hourBookings = getBookingsForHour(bookings, day, hour);
              const blockedBySchedule =
                !isWorkingHour(selectedEmployeeSchedule, day, hour) ||
                isBreakHour(selectedEmployeeSchedule, day, hour) ||
                isTimeOffHour(selectedEmployeeSchedule, day, hour);

              return (
                <div
                  key={`${toDateInput(day)}-${hour}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, day, hour)}
                  className={`min-h-24 border-b border-l border-border-soft p-2 transition ${
                    blockedBySchedule ? 'bg-surface-muted/60' : 'bg-surface hover:bg-accent/5'
                  }`}
                >
                  {blockedBySchedule ? (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[10px] font-semibold text-muted">
                      <ShieldAlert className="h-3 w-3" />
                      No disponible
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    {hourBookings.map((booking) => renderBookingPill(booking))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <section
        data-tour="calendar-board"
        className="overflow-hidden rounded-4xl border border-border-soft bg-gradient-to-br from-surface to-surface-soft shadow-theme-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Agenda visual
            </p>
            <h3 className="mt-1 text-2xl font-semibold capitalize tracking-[-0.03em] text-fg-strong">
              {formatCalendarTitle(cursorDate, mode)}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {selectedEmployee
                ? `Mostrando agenda de ${selectedEmployee.name}. Puedes arrastrar citas pendientes o confirmadas.`
                : 'Filtra por profesional para ver horarios, descansos y ausencias.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              data-tour="calendar-mode-controls"
              className="rounded-2xl border border-border bg-surface p-1"
            >
              <button
                type="button"
                onClick={() => onModeChange('month')}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  mode === 'month'
                    ? 'bg-accent text-accent-text shadow-theme-accent'
                    : 'text-fg-secondary hover:bg-surface-soft'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Mes
              </button>
              <button
                type="button"
                onClick={() => onModeChange('week')}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  mode === 'week'
                    ? 'bg-accent text-accent-text shadow-theme-accent'
                    : 'text-fg-secondary hover:bg-surface-soft'
                }`}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Semana
              </button>
              <button
                type="button"
                onClick={() => onModeChange('day')}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  mode === 'day'
                    ? 'bg-accent text-accent-text shadow-theme-accent'
                    : 'text-fg-secondary hover:bg-surface-soft'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Día
              </button>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg transition hover:bg-surface-soft"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={handlePrevious}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-fg transition hover:bg-surface-soft"
              aria-label="Periodo anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-fg transition hover:bg-surface-soft"
              aria-label="Periodo siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {mode === 'month' ? (
          <>
            <div className="px-4 pt-4">
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAY_LABELS.map((label) => (
                  <p
                    key={label}
                    className="px-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
                  >
                    {label}
                  </p>
                ))}
              </div>
            </div>

            <div
              data-tour="calendar-month-grid"
              className={`grid grid-cols-7 gap-2 p-4 ${isLoading ? 'opacity-60' : ''}`}
            >
              {days.map((day) => {
                const dayKey = toDateInput(day);
                const dayBookings = getBookingsForDate(bookings, day);
                const occupancy = getDayOccupancy(dayBookings);
                const isToday = dayKey === todayKey;
                const isSelected = dayKey === selectedKey;
                const isOutsideMonth = day.getMonth() !== cursorDate.getMonth();

                return (
                  <div
                    key={dayKey}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, day)}
                    className={`group min-h-32 rounded-3xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-accent bg-accent/10 shadow-theme-accent'
                        : 'border-border-soft bg-surface hover:border-accent/60 hover:bg-surface-soft'
                    } ${isOutsideMonth ? 'opacity-45' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectedDateChange(day)}
                      className="flex w-full items-start justify-between gap-2 text-left"
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-2xl text-sm font-bold ${
                          isToday ? 'bg-accent text-accent-text' : 'bg-surface-muted text-fg'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {occupancy.active > 0 ? (
                        <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold text-muted">
                          {occupancy.active}
                        </span>
                      ) : null}
                    </button>

                    <div className="mt-3 space-y-1.5">
                      {dayBookings.slice(0, 3).map((booking) => renderBookingPill(booking))}
                      {dayBookings.length > 3 ? (
                        <span className="block text-[11px] font-medium text-muted">
                          +{dayBookings.length - 3} más
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          renderDayGrid()
        )}
      </section>

      <aside
        data-tour="calendar-day-detail"
        className="rounded-4xl border border-border-soft bg-gradient-to-b from-surface to-surface-soft p-5 shadow-theme-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Día seleccionado
            </p>
            <h3 className="mt-1 text-xl font-semibold capitalize text-fg-strong">
              {formatSelectedDate(selectedDate)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCreateBooking}
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-accent-text shadow-theme-accent transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-border-soft bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Citas activas
            </p>
            <p className="mt-2 text-3xl font-semibold text-fg-strong">{selectedOccupancy.active}</p>
          </div>
          <div className="rounded-3xl border border-border-soft bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Personas</p>
            <p className="mt-2 text-3xl font-semibold text-fg-strong">{selectedOccupancy.people}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted"
            >
              <span
                className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[status as BookingStatus]}`}
              />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {selectedBookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-surface p-5 text-sm text-muted">
              No hay citas para este día. Puedes crear una cita manual o compartir el enlace público
              de reservas desde Configuración.
            </div>
          ) : (
            selectedBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                draggable={canDragBooking(booking)}
                onDragStart={(event) => handleDragStart(event, booking)}
                onClick={() => onOpenDetail(booking)}
                className="w-full rounded-3xl border border-border-soft bg-surface p-4 text-left shadow-theme-row transition hover:border-accent/60 hover:bg-surface-soft"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={booking.customer_name} className="h-10 w-10 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-fg-strong">
                          {booking.customer_name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {booking.items[0]?.service_name_snapshot ?? 'Servicio'}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${STATUS_CARD_CLASS[booking.status]}`}
                      >
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-fg-secondary">
                      <p className="inline-flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-fg-icon" />
                        {formatTime(booking.start_at_utc)} - {formatTime(booking.end_at_utc)}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <UsersRound className="h-3.5 w-3.5 text-fg-icon" />
                        {booking.employee?.name ?? 'Profesional'} · {booking.party_size} persona(s)
                      </p>
                      {canDragBooking(booking) ? (
                        <p className="inline-flex items-center gap-2 text-muted">
                          <GripVertical className="h-3.5 w-3.5" />
                          Arrastra para reprogramar
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
