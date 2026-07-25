'use client';

import { bookingsService } from '@/modules/bookings/services/bookings.service';
import CalendarDatePicker from '@/modules/ui/CalendarDatePicker';
import SelectField, { type SelectOption } from '@/modules/ui/SelectField';
import TimePickerSelect from '@/modules/ui/TimePickerSelect';
import type { EmployeeScheduleResponse, ScheduleIntervalPayload } from '@/types/booking.types';
import type { Employee } from '@/types/employee.types';
import {
  CalendarClock,
  CircleAlert,
  Coffee,
  Clock3,
  LoaderCircle,
  Plus,
  Save,
  ScissorsLineDashed,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

type IntervalRow = {
  row_id: string;
  day_of_week: number;
  start_time_local: string;
  end_time_local: string;
};

type TimeOffFormState = {
  start_local: string;
  end_local: string;
  reason: string;
};

type BookingsSchedulePanelProps = {
  token: string | null;
  employees: Employee[];
  selectedEmployeeId: string;
  onSelectEmployee: (employeeId: string) => void;
  onScheduleChanged?: (employeeId: string) => void;
  showEmployeeSelector?: boolean;
};

const DAY_OPTIONS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
] as const;

const DAY_SELECT_OPTIONS: SelectOption[] = DAY_OPTIONS.map((day) => ({
  value: String(day.value),
  label: day.label,
}));

const WEEKDAY_VALUES = [1, 2, 3, 4, 5];

const INITIAL_TIME_OFF_FORM: TimeOffFormState = {
  start_local: '',
  end_local: '',
  reason: '',
};

const FALLBACK_SCHEDULE_TIMEZONE = 'UTC';
const COMMON_SCHEDULE_TIMEZONES = [
  'Europe/Paris',
  'Europe/Madrid',
  'America/Caracas',
  'America/Santo_Domingo',
  'America/Bogota',
  'America/Mexico_City',
  'America/New_York',
  FALLBACK_SCHEDULE_TIMEZONE,
];

function getBrowserTimezone() {
  if (typeof Intl === 'undefined') return FALLBACK_SCHEDULE_TIMEZONE;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_SCHEDULE_TIMEZONE;
}

function getScheduleTimezoneOptions(currentTimezone: string): string[] {
  return [
    ...new Set(
      [currentTimezone, getBrowserTimezone(), ...COMMON_SCHEDULE_TIMEZONES].filter(Boolean),
    ),
  ];
}

function createRow(partial?: Partial<IntervalRow>): IntervalRow {
  return {
    row_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    day_of_week: partial?.day_of_week ?? 1,
    start_time_local: partial?.start_time_local ?? '09:00',
    end_time_local: partial?.end_time_local ?? '18:00',
  };
}

function normalizeTime(value: string) {
  return value.trim().slice(0, 5);
}

function normalizeRows(rows: IntervalRow[]): ScheduleIntervalPayload[] {
  return rows.map((row) => ({
    day_of_week: row.day_of_week,
    start_time_local: normalizeTime(row.start_time_local),
    end_time_local: normalizeTime(row.end_time_local),
  }));
}

function parseLocalInputToIso(localInput: string) {
  const parsed = new Date(localInput);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function getTodayDateInput() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function splitLocalDateTime(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '09:00' };
  const [date, rawTime = '09:00'] = value.split('T');
  return {
    date,
    time: rawTime.slice(0, 5),
  };
}

function buildLocalDateTime(date: string, time: string): string {
  if (!date) return '';
  return `${date}T${time}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type ScheduleIntervalLike = Pick<
  ScheduleIntervalPayload,
  'day_of_week' | 'start_time_local' | 'end_time_local'
>;

function getDayLabel(dayOfWeek: number): string {
  const day = DAY_OPTIONS.find((option) => option.value === dayOfWeek);
  return day?.label ?? `Día ${dayOfWeek}`;
}

function groupIntervalsByDay(intervals: ScheduleIntervalLike[]) {
  const grouped = new Map<number, string[]>();
  for (const interval of intervals) {
    const existing = grouped.get(interval.day_of_week) ?? [];
    existing.push(
      `${normalizeTime(interval.start_time_local)} - ${normalizeTime(interval.end_time_local)}`,
    );
    grouped.set(interval.day_of_week, existing);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([dayOfWeek, ranges]) => ({
      day_of_week: dayOfWeek,
      day_label: getDayLabel(dayOfWeek),
      ranges,
    }));
}

function validateIntervals(rows: IntervalRow[]): string | null {
  if (rows.length === 0) return 'Debes definir al menos un bloque de horario laboral.';

  for (const row of rows) {
    const start = normalizeTime(row.start_time_local);
    const end = normalizeTime(row.end_time_local);
    if (!start || !end) {
      return 'Todos los bloques deben tener hora de inicio y fin.';
    }
    if (end <= start) {
      return 'La hora de fin debe ser mayor que la hora de inicio en cada bloque.';
    }
  }
  return null;
}

export default function BookingsSchedulePanel({
  token,
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  onScheduleChanged,
  showEmployeeSelector = true,
}: BookingsSchedulePanelProps): React.ReactNode {
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isCreatingTimeOff, setIsCreatingTimeOff] = useState(false);
  const [deletingTimeOffId, setDeletingTimeOffId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [scheduleTimezone, setScheduleTimezone] = useState(getBrowserTimezone);
  const [workingRows, setWorkingRows] = useState<IntervalRow[]>([createRow()]);
  const [breakRows, setBreakRows] = useState<IntervalRow[]>([]);
  const [scheduleSnapshot, setScheduleSnapshot] = useState<EmployeeScheduleResponse | null>(null);
  const [timeOffForm, setTimeOffForm] = useState<TimeOffFormState>(INITIAL_TIME_OFF_FORM);
  const [weekdayWorkingTemplate, setWeekdayWorkingTemplate] = useState({
    start_time_local: '09:00',
    end_time_local: '18:00',
  });
  const [weekdayBreakTemplate, setWeekdayBreakTemplate] = useState({
    start_time_local: '13:00',
    end_time_local: '14:00',
  });

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active || employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );
  const savedWorkingByDay = useMemo(
    () => groupIntervalsByDay(scheduleSnapshot?.working_hours ?? []),
    [scheduleSnapshot],
  );
  const savedBreaksByDay = useMemo(
    () => groupIntervalsByDay(scheduleSnapshot?.breaks ?? []),
    [scheduleSnapshot],
  );
  const hasSavedWorkingHours = savedWorkingByDay.length > 0;
  const hasSavedBreaks = savedBreaksByDay.length > 0;
  const scheduleTimezoneOptions = useMemo(
    () => getScheduleTimezoneOptions(scheduleTimezone),
    [scheduleTimezone],
  );

  const loadSchedule = useCallback(async () => {
    if (!token || !selectedEmployeeId) return;
    setIsLoadingSchedule(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const schedule = await bookingsService.getEmployeeSchedule(selectedEmployeeId, token);
      setScheduleSnapshot(schedule);
      setScheduleTimezone(schedule.schedule_timezone || getBrowserTimezone());
      setWorkingRows(
        schedule.working_hours.length > 0
          ? schedule.working_hours.map((interval) =>
              createRow({
                day_of_week: interval.day_of_week,
                start_time_local: normalizeTime(interval.start_time_local),
                end_time_local: normalizeTime(interval.end_time_local),
              }),
            )
          : [createRow()],
      );
      setBreakRows(
        schedule.breaks.map((interval) =>
          createRow({
            day_of_week: interval.day_of_week,
            start_time_local: normalizeTime(interval.start_time_local),
            end_time_local: normalizeTime(interval.end_time_local),
          }),
        ),
      );
      const firstWeekdayWorking = schedule.working_hours.find((interval) =>
        WEEKDAY_VALUES.includes(interval.day_of_week),
      );
      if (firstWeekdayWorking) {
        setWeekdayWorkingTemplate({
          start_time_local: normalizeTime(firstWeekdayWorking.start_time_local),
          end_time_local: normalizeTime(firstWeekdayWorking.end_time_local),
        });
      }
      const firstWeekdayBreak = schedule.breaks.find((interval) =>
        WEEKDAY_VALUES.includes(interval.day_of_week),
      );
      if (firstWeekdayBreak) {
        setWeekdayBreakTemplate({
          start_time_local: normalizeTime(firstWeekdayBreak.start_time_local),
          end_time_local: normalizeTime(firstWeekdayBreak.end_time_local),
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar el horario del empleado.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, [selectedEmployeeId, token]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setScheduleSnapshot(null);
      setWorkingRows([createRow()]);
      setBreakRows([]);
      setScheduleTimezone(getBrowserTimezone());
      setTimeOffForm(INITIAL_TIME_OFF_FORM);
      setErrorMessage('');
      setSuccessMessage('');
      return;
    }
    void loadSchedule();
  }, [selectedEmployeeId, loadSchedule]);

  const handleRowChange = (
    type: 'working' | 'break',
    rowId: string,
    field: 'day_of_week' | 'start_time_local' | 'end_time_local',
    value: string,
  ) => {
    const setter = type === 'working' ? setWorkingRows : setBreakRows;
    setter((prev) =>
      prev.map((row) =>
        row.row_id === rowId
          ? {
              ...row,
              [field]: field === 'day_of_week' ? Number(value) : value,
            }
          : row,
      ),
    );
  };

  const addRow = (type: 'working' | 'break') => {
    const setter = type === 'working' ? setWorkingRows : setBreakRows;
    setter((prev) => [...prev, createRow()]);
  };

  const removeRow = (type: 'working' | 'break', rowId: string) => {
    const setter = type === 'working' ? setWorkingRows : setBreakRows;
    setter((prev) => {
      const next = prev.filter((row) => row.row_id !== rowId);
      if (type === 'working' && next.length === 0) {
        return [createRow()];
      }
      return next;
    });
  };

  const handleSaveSchedule = async () => {
    if (!token || !selectedEmployeeId) return;

    const workingValidation = validateIntervals(workingRows);
    if (workingValidation) {
      setErrorMessage(workingValidation);
      setSuccessMessage('');
      toast.error(workingValidation);
      return;
    }

    const breaksValidation = breakRows.length > 0 ? validateIntervals(breakRows) : null;
    if (breaksValidation) {
      setErrorMessage(breaksValidation);
      setSuccessMessage('');
      toast.error(breaksValidation);
      return;
    }

    setIsSavingSchedule(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const updated = await bookingsService.setEmployeeSchedule(
        selectedEmployeeId,
        {
          schedule_timezone: scheduleTimezone.trim(),
          working_hours: normalizeRows(workingRows),
          breaks: normalizeRows(breakRows),
        },
        token,
      );
      setScheduleSnapshot(updated);
      setSuccessMessage('Horario guardado correctamente.');
      toast.success('Horario guardado correctamente.');
      onScheduleChanged?.(selectedEmployeeId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el horario.';
      setErrorMessage(message);
      toast.error(message);
      setSuccessMessage('');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const applyWeekdayTemplate = (type: 'working' | 'break') => {
    const template = type === 'working' ? weekdayWorkingTemplate : weekdayBreakTemplate;
    const baseStart = normalizeTime(template.start_time_local);
    const baseEnd = normalizeTime(template.end_time_local);

    if (!baseStart || !baseEnd) {
      setErrorMessage('Define hora de inicio y fin para aplicar el atajo L-V.');
      setSuccessMessage('');
      toast.error('Define hora de inicio y fin para aplicar el atajo L-V.');
      return;
    }

    if (baseEnd <= baseStart) {
      setErrorMessage('La hora final del atajo debe ser mayor que la hora inicial.');
      setSuccessMessage('');
      toast.error('La hora final del atajo debe ser mayor que la hora inicial.');
      return;
    }

    const setter = type === 'working' ? setWorkingRows : setBreakRows;

    setter(
      WEEKDAY_VALUES.map((day) =>
        createRow({
          day_of_week: day,
          start_time_local: baseStart,
          end_time_local: baseEnd,
        }),
      ),
    );
    setErrorMessage('');
    setSuccessMessage(
      type === 'working'
        ? 'Horario L-V aplicado. Revisa y guarda.'
        : 'Descanso L-V aplicado. Revisa y guarda.',
    );
    toast.success(
      type === 'working'
        ? 'Plantilla L-V aplicada al horario laboral.'
        : 'Plantilla L-V aplicada a los descansos.',
    );
  };

  const startLocalParts = splitLocalDateTime(timeOffForm.start_local);
  const endLocalParts = splitLocalDateTime(timeOffForm.end_local);

  const handleTimeOffDateChange = (field: 'start_local' | 'end_local', date: string) => {
    setTimeOffForm((prev) => {
      const current = splitLocalDateTime(prev[field]);
      return {
        ...prev,
        [field]: buildLocalDateTime(date, current.time || '09:00'),
      };
    });
  };

  const handleTimeOffTimeChange = (field: 'start_local' | 'end_local', time: string) => {
    setTimeOffForm((prev) => {
      const current = splitLocalDateTime(prev[field]);
      const date = current.date || getTodayDateInput();
      return {
        ...prev,
        [field]: buildLocalDateTime(date, time),
      };
    });
  };

  const handleCreateTimeOff = async () => {
    if (!token || !selectedEmployeeId) return;

    const startIso = parseLocalInputToIso(timeOffForm.start_local);
    const endIso = parseLocalInputToIso(timeOffForm.end_local);
    if (!startIso || !endIso) {
      setErrorMessage('Debes definir una fecha/hora válida para el bloqueo.');
      toast.error('Debes definir una fecha/hora válida para el bloqueo.');
      return;
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setErrorMessage('La fecha/hora de fin debe ser mayor que inicio.');
      toast.error('La fecha/hora de fin debe ser mayor que inicio.');
      return;
    }

    setIsCreatingTimeOff(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await bookingsService.createEmployeeTimeOff(
        selectedEmployeeId,
        {
          start_at_utc: startIso,
          end_at_utc: endIso,
          reason: timeOffForm.reason.trim() || undefined,
        },
        token,
      );
      setTimeOffForm(INITIAL_TIME_OFF_FORM);
      await loadSchedule();
      setSuccessMessage('Bloqueo creado correctamente.');
      toast.success('Bloqueo creado correctamente.');
      onScheduleChanged?.(selectedEmployeeId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el bloqueo.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsCreatingTimeOff(false);
    }
  };

  const handleDeleteTimeOff = async (timeOffId: string) => {
    if (!token || !selectedEmployeeId) return;
    setDeletingTimeOffId(timeOffId);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await bookingsService.removeEmployeeTimeOff(selectedEmployeeId, timeOffId, token);
      await loadSchedule();
      setSuccessMessage('Bloqueo eliminado.');
      toast.success('Bloqueo eliminado correctamente.');
      onScheduleChanged?.(selectedEmployeeId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el bloqueo.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setDeletingTimeOffId(null);
    }
  };

  return (
    <div className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-fg-strong">Configuración de horarios</h3>
          <p className="text-sm text-muted">
            Define agenda por profesional: horas de trabajo, descansos y bloqueos.
          </p>
        </div>

        {showEmployeeSelector ? (
          <div className="w-full max-w-sm">
            <label className="mb-1 block text-xs font-medium text-fg-label">Profesional</label>
            <select
              value={selectedEmployeeId}
              onChange={(event) => onSelectEmployee(event.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm text-fg"
            >
              <option value="">Selecciona un profesional</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {!selectedEmployeeId ? (
        <div className="mt-4 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-muted">
          Selecciona un profesional para configurar su horario.
        </div>
      ) : isLoadingSchedule ? (
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Cargando horario...
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="rounded-2xl border border-border-soft bg-surface p-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-fg-strong">Zona horaria</span>
              <select
                value={scheduleTimezone}
                onChange={(event) => setScheduleTimezone(event.target.value)}
                className="w-full rounded-2xl border border-border bg-surface-soft px-3 py-2.5 text-sm text-fg"
              >
                {scheduleTimezoneOptions.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
              <span className="block text-xs text-muted">
                Las horas laborales, descansos y bloqueos de este profesional se interpretan en esta
                zona.
              </span>
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-border-soft bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-fg-strong">Agenda guardada actualmente</p>
                <p className="text-xs text-muted">
                  Resumen de lo que está activo para este profesional antes de guardar cambios.
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  hasSavedWorkingHours
                    ? 'border-border-success bg-surface-success text-success'
                    : 'border-border-warning bg-surface-warning-soft text-warning'
                }`}
              >
                {hasSavedWorkingHours ? 'Agenda configurada' : 'Sin agenda guardada'}
              </span>
            </div>

            {hasSavedWorkingHours ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-border-soft bg-surface-soft p-3">
                  <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-fg-label">
                    <Clock3 className="h-3.5 w-3.5 text-fg-icon" />
                    Horario laboral
                  </div>
                  <div className="space-y-2">
                    {savedWorkingByDay.map((entry) => (
                      <div
                        key={`saved-working-${entry.day_of_week}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface px-2.5 py-2"
                      >
                        <span className="text-xs font-medium text-fg">{entry.day_label}</span>
                        <span className="text-xs text-fg-secondary">
                          {entry.ranges.join(' · ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border-soft bg-surface-soft p-3">
                  <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-fg-label">
                    <Coffee className="h-3.5 w-3.5 text-fg-icon" />
                    Descansos
                  </div>
                  {hasSavedBreaks ? (
                    <div className="space-y-2">
                      {savedBreaksByDay.map((entry) => (
                        <div
                          key={`saved-break-${entry.day_of_week}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface px-2.5 py-2"
                        >
                          <span className="text-xs font-medium text-fg">{entry.day_label}</span>
                          <span className="text-xs text-fg-secondary">
                            {entry.ranges.join(' · ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-xs text-muted">
                      No hay descansos guardados.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border-warning bg-surface-warning-soft px-3 py-2.5 text-xs text-warning">
                Este profesional aún no tiene horario guardado. Usa la sección de abajo para crear
                la agenda y pulsa Guardar horario.
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border-soft bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-fg-strong">Horario laboral semanal</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addRow('working')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-neutral"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar bloque
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-border-soft bg-surface-soft px-3 py-2 text-xs text-muted">
              {hasSavedWorkingHours
                ? 'Edita los bloques y guarda para reemplazar la agenda actual.'
                : 'Plantilla inicial: define al menos un bloque y guarda para activar el horario.'}
            </div>

            <div className="grid gap-2 rounded-xl border border-border-soft bg-surface-soft p-2 sm:grid-cols-[1fr_1fr_auto]">
              <TimePickerSelect
                value={weekdayWorkingTemplate.start_time_local}
                onChange={(value) =>
                  setWeekdayWorkingTemplate((prev) => ({
                    ...prev,
                    start_time_local: value,
                  }))
                }
                triggerClassName="h-9 text-xs"
              />
              <TimePickerSelect
                value={weekdayWorkingTemplate.end_time_local}
                onChange={(value) =>
                  setWeekdayWorkingTemplate((prev) => ({
                    ...prev,
                    end_time_local: value,
                  }))
                }
                triggerClassName="h-9 text-xs"
              />
              <button
                type="button"
                onClick={() => applyWeekdayTemplate('working')}
                className="inline-flex items-center justify-center rounded-lg border border-border-warning bg-surface-warning-soft px-3 py-2 text-xs font-medium text-warning"
              >
                Aplicar L-V
              </button>
            </div>

            <div className="space-y-2">
              {workingRows.map((row) => (
                <div
                  key={row.row_id}
                  className="grid gap-2 rounded-xl border border-border-soft bg-surface-soft p-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <SelectField
                    value={String(row.day_of_week)}
                    onValueChange={(value) =>
                      handleRowChange('working', row.row_id, 'day_of_week', value)
                    }
                    options={DAY_SELECT_OPTIONS}
                    triggerClassName="h-9 text-xs"
                  />
                  <TimePickerSelect
                    value={normalizeTime(row.start_time_local)}
                    onChange={(value) =>
                      handleRowChange('working', row.row_id, 'start_time_local', value)
                    }
                    triggerClassName="h-9 text-xs"
                  />
                  <TimePickerSelect
                    value={normalizeTime(row.end_time_local)}
                    onChange={(value) =>
                      handleRowChange('working', row.row_id, 'end_time_local', value)
                    }
                    triggerClassName="h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow('working', row.row_id)}
                    className="inline-flex items-center justify-center rounded-lg border border-border-danger bg-surface-danger px-2 py-2 text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border-soft bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-fg-strong">Descansos</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addRow('break')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-neutral"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar descanso
                </button>
              </div>
            </div>

            <div className="grid gap-2 rounded-xl border border-border-soft bg-surface-soft p-2 sm:grid-cols-[1fr_1fr_auto]">
              <TimePickerSelect
                value={weekdayBreakTemplate.start_time_local}
                onChange={(value) =>
                  setWeekdayBreakTemplate((prev) => ({
                    ...prev,
                    start_time_local: value,
                  }))
                }
                triggerClassName="h-9 text-xs"
              />
              <TimePickerSelect
                value={weekdayBreakTemplate.end_time_local}
                onChange={(value) =>
                  setWeekdayBreakTemplate((prev) => ({
                    ...prev,
                    end_time_local: value,
                  }))
                }
                triggerClassName="h-9 text-xs"
              />
              <button
                type="button"
                onClick={() => applyWeekdayTemplate('break')}
                className="inline-flex items-center justify-center rounded-lg border border-border-warning bg-surface-warning-soft px-3 py-2 text-xs font-medium text-warning"
              >
                Aplicar L-V
              </button>
            </div>

            {breakRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-soft bg-surface-soft px-3 py-3">
                <div className="inline-flex items-start gap-2">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 text-fg-icon" />
                  <div>
                    <p className="text-xs font-medium text-fg">Sin descansos en edicion</p>
                    <p className="text-xs text-muted">
                      Si el profesional no hace pausas, puedes dejarlo vacío. Si tiene descanso
                      fijo, agrega al menos un bloque.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {breakRows.map((row) => (
                  <div
                    key={row.row_id}
                    className="grid gap-2 rounded-xl border border-border-soft bg-surface-soft p-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <SelectField
                      value={String(row.day_of_week)}
                      onValueChange={(value) =>
                        handleRowChange('break', row.row_id, 'day_of_week', value)
                      }
                      options={DAY_SELECT_OPTIONS}
                      triggerClassName="h-9 text-xs"
                    />
                    <TimePickerSelect
                      value={normalizeTime(row.start_time_local)}
                      onChange={(value) =>
                        handleRowChange('break', row.row_id, 'start_time_local', value)
                      }
                      triggerClassName="h-9 text-xs"
                    />
                    <TimePickerSelect
                      value={normalizeTime(row.end_time_local)}
                      onChange={(value) =>
                        handleRowChange('break', row.row_id, 'end_time_local', value)
                      }
                      triggerClassName="h-9 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow('break', row.row_id)}
                      className="inline-flex items-center justify-center rounded-lg border border-border-danger bg-surface-danger px-2 py-2 text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border-soft bg-surface p-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-fg-icon" />
              <p className="text-sm font-semibold text-fg-strong">Bloqueos y ausencias</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-xs text-fg-label">Inicio</span>
                <div className="grid gap-2 sm:grid-cols-[1.25fr_0.75fr]">
                  <CalendarDatePicker
                    value={startLocalParts.date}
                    onChange={(date) => handleTimeOffDateChange('start_local', date)}
                    placeholder="Selecciona fecha"
                    buttonClassName="h-10 text-sm"
                  />
                  <TimePickerSelect
                    value={startLocalParts.time}
                    onChange={(time) => handleTimeOffTimeChange('start_local', time)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs text-fg-label">Fin</span>
                <div className="grid gap-2 sm:grid-cols-[1.25fr_0.75fr]">
                  <CalendarDatePicker
                    value={endLocalParts.date}
                    onChange={(date) => handleTimeOffDateChange('end_local', date)}
                    placeholder="Selecciona fecha"
                    buttonClassName="h-10 text-sm"
                  />
                  <TimePickerSelect
                    value={endLocalParts.time}
                    onChange={(time) => handleTimeOffTimeChange('end_local', time)}
                  />
                </div>
              </div>
            </div>

            <label className="space-y-1.5">
              <span className="text-xs text-fg-label">Motivo</span>
              <input
                value={timeOffForm.reason}
                onChange={(event) =>
                  setTimeOffForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-fg"
                placeholder="Vacaciones, reunion, bloqueo manual..."
              />
            </label>

            <button
              type="button"
              onClick={() => void handleCreateTimeOff()}
              disabled={isCreatingTimeOff}
              className="inline-flex items-center mt-4 gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-neutral disabled:opacity-60"
            >
              {isCreatingTimeOff ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ScissorsLineDashed className="h-4 w-4" />
              )}
              Crear bloqueo
            </button>

            <div className="space-y-2">
              {scheduleSnapshot?.active_time_off?.length ? (
                scheduleSnapshot.active_time_off.map((timeOff) => (
                  <div
                    key={timeOff.id}
                    className="flex flex-col gap-2 rounded-xl border border-border-soft bg-surface-soft p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="text-xs text-fg-secondary">
                      <p className="font-medium text-fg">
                        {formatDateTime(timeOff.start_at_utc)} -{' '}
                        {formatDateTime(timeOff.end_at_utc)}
                      </p>
                      <p>{timeOff.reason || 'Sin motivo'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteTimeOff(timeOff.id)}
                      disabled={deletingTimeOffId === timeOff.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border-danger bg-surface-danger px-2.5 py-1.5 text-xs font-medium text-danger disabled:opacity-60"
                    >
                      {deletingTimeOffId === timeOff.id ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Eliminar
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted">No hay bloqueos activos para este profesional.</p>
              )}
            </div>
          </div>

          {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
          {successMessage ? <p className="text-sm text-success">{successMessage}</p> : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSaveSchedule()}
              disabled={isSavingSchedule}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent disabled:opacity-60"
            >
              {isSavingSchedule ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar horario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
