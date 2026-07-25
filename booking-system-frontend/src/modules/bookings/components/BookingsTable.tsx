import * as Popover from '@radix-ui/react-popover';
import { AnimatePresence, motion } from 'framer-motion';
import type { Booking, BookingStatus } from '@/types/booking.types';
import { getPhoneDisplay } from '@/modules/phone/utils/phone';
import Avatar from '@/modules/ui/Avatar';
import type { SelectOption } from '@/modules/ui/SelectField';
import { useState } from 'react';
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Eye,
  MoreVertical,
  Scissors,
  TimerReset,
  UserRound,
  XCircle,
} from 'lucide-react';

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: 'bg-surface-warning-soft text-warning',
  CONFIRMED: 'bg-surface-info text-info',
  IN_PROGRESS: 'bg-surface-warning text-warning',
  COMPLETED: 'bg-surface-success text-success',
  CANCELLED: 'bg-surface-danger text-danger',
  NO_SHOW: 'bg-surface-muted text-neutral',
};

type BookingsTableProps = {
  bookings: Booking[];
  updatingBookingId: string | null;
  onStatusChange: (booking: Booking, status: BookingStatus) => void;
  onReschedule: (booking: Booking) => void;
  onOpenDetail: (booking: Booking) => void;
};

const BOOKING_SOURCE_LABELS: Record<Booking['source'], string> = {
  ADMIN: 'Panel',
  WEB: 'Web',
  API: 'API',
  MANUAL: 'Manual',
};

const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED'],
  NO_SHOW: ['NO_SHOW'],
};

const BOOKING_STATUS_OPTION_DETAILS: Record<
  BookingStatus,
  Pick<SelectOption, 'label' | 'description' | 'icon'>
> = {
  PENDING: { label: 'Pendiente', description: 'aún sin confirmar', icon: Clock3 },
  CONFIRMED: { label: 'Confirmada', description: 'Cita aceptada', icon: CheckCircle2 },
  IN_PROGRESS: { label: 'En progreso', description: 'Servicio en curso', icon: TimerReset },
  COMPLETED: { label: 'Completada', description: 'Servicio realizado', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelada', description: 'Cita cancelada', icon: XCircle },
  NO_SHOW: { label: 'No asistió', description: 'Cliente ausente', icon: XCircle },
};

function buildStatusOptions(currentStatus: BookingStatus): SelectOption[] {
  return BOOKING_STATUS_TRANSITIONS[currentStatus].map((status) => ({
    value: status,
    ...BOOKING_STATUS_OPTION_DETAILS[status],
  }));
}

function buildQuickActions(status: BookingStatus): Array<{
  status: BookingStatus;
  label: string;
  toneClass: string;
}> {
  switch (status) {
    case 'PENDING':
      return [
        { status: 'CONFIRMED', label: 'Confirmar', toneClass: 'border-border bg-surface text-fg' },
        {
          status: 'CANCELLED',
          label: 'Cancelar',
          toneClass: 'border-border-danger bg-surface-danger text-danger',
        },
      ];
    case 'CONFIRMED':
      return [
        {
          status: 'COMPLETED',
          label: 'Completar',
          toneClass: 'border-border-success bg-surface-success text-success',
        },
        {
          status: 'CANCELLED',
          label: 'Cancelar',
          toneClass: 'border-border-danger bg-surface-danger text-danger',
        },
      ];
    case 'IN_PROGRESS':
      return [
        {
          status: 'COMPLETED',
          label: 'Completar',
          toneClass: 'border-border-success bg-surface-success text-success',
        },
        {
          status: 'NO_SHOW',
          label: 'No asistió',
          toneClass: 'border-border bg-surface-muted text-fg',
        },
      ];
    default:
      return [];
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

type BookingActionsMenuProps = {
  booking: Booking;
  updatingBookingId: string | null;
  triggerClassName: string;
  onStatusChange: (booking: Booking, status: BookingStatus) => void;
  onReschedule: (booking: Booking) => void;
};

function BookingActionsMenu({
  booking,
  updatingBookingId,
  triggerClassName,
  onStatusChange,
  onReschedule,
}: BookingActionsMenuProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const quickActions = buildQuickActions(booking.status);
  const isUpdating = updatingBookingId === booking.id;

  const handleReschedule = () => {
    if (isUpdating) return;
    setIsOpen(false);
    onReschedule(booking);
  };

  const handleStatusChange = (status: BookingStatus) => {
    if (isUpdating) return;
    setIsOpen(false);
    onStatusChange(booking, status);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={triggerClassName}>
          <MoreVertical className="h-3 w-3" />
          Gestionar
        </button>
      </Popover.Trigger>

      <AnimatePresence>
        {isOpen ? (
          <Popover.Portal forceMount>
            <Popover.Content
              asChild
              forceMount
              side="bottom"
              align="end"
              sideOffset={8}
              collisionPadding={12}
            >
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{
                  type: 'spring',
                  stiffness: 520,
                  damping: 34,
                  mass: 0.7,
                }}
                style={{ transformOrigin: 'var(--radix-popover-content-transform-origin)' }}
                className="z-[95] max-h-[min(22rem,var(--radix-popover-content-available-height))] w-56 overflow-y-auto rounded-2xl border border-border-soft bg-surface p-2 shadow-theme-card outline-none"
              >
                {booking.status === 'CONFIRMED' ? (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleReschedule}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-fg hover:bg-surface-soft disabled:opacity-50"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Reprogramar
                  </button>
                ) : null}

                {quickActions.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(action.status)}
                    className={`mt-1 w-full rounded-xl border px-3 py-2 text-left text-xs font-medium disabled:opacity-50 ${action.toneClass}`}
                  >
                    {action.label}
                  </button>
                ))}

                {buildStatusOptions(booking.status)
                  .filter(
                    (option) =>
                      booking.status !== 'PENDING' &&
                      option.value !== booking.status &&
                      !quickActions.some((action) => action.status === option.value),
                  )
                  .map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(option.value as BookingStatus)}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-fg hover:bg-surface-soft disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        ) : null}
      </AnimatePresence>
    </Popover.Root>
  );
}

export default function BookingsTable({
  bookings,
  updatingBookingId,
  onStatusChange,
  onReschedule,
  onOpenDetail,
}: BookingsTableProps): React.ReactNode {
  return (
    <div className="mt-4">
      <div className="space-y-3 md:hidden">
        {bookings.map((booking) => {
          const customerPhoneDisplay = getPhoneDisplay({
            display: booking.customer_phone,
            countryIso2: booking.customer_phone_country_iso2,
            nationalNumber: booking.customer_phone_national_number,
            e164: booking.customer_phone_e164,
          });
          const contactDisplay = booking.customer_email ?? customerPhoneDisplay ?? 'Sin contacto';

          return (
            <article
              key={booking.id}
              className="rounded-3xl border border-border-soft bg-surface p-4 shadow-theme-row"
            >
              <div className="flex items-center gap-3">
                <Avatar name={booking.customer_name} className="h-10 w-10 text-xs" />
                <div className="space-y-1">
                  <p className="font-semibold text-fg-strong">{booking.customer_name}</p>
                  <p className="text-xs text-muted">{contactDisplay}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs text-fg-secondary">
                <p className="inline-flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5" />
                  {booking.employee?.name ?? 'Profesional'}
                </p>
                <p className="inline-flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDateTime(booking.start_at_utc)}
                </p>
                <p className="text-muted">
                  Fin:{' '}
                  {new Date(booking.end_at_utc).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {booking.items.slice(0, 2).map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-fg-secondary"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    {item.service_name_snapshot}
                  </span>
                ))}
                {booking.items.length > 2 ? (
                  <p className="text-xs text-muted">+{booking.items.length - 2} servicios</p>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-fg-secondary">
                  {formatMinutes(booking.total_duration_minutes)}
                </span>
                <span className="text-muted">
                  {booking.total_price} {booking.currency}
                </span>
                <span className="text-muted">{BOOKING_SOURCE_LABELS[booking.source]}</span>
                <span
                  className={`rounded-full px-3 py-1.5 font-medium ${BOOKING_STATUS_STYLES[booking.status]}`}
                >
                  {BOOKING_STATUS_LABELS[booking.status]}
                </span>
              </div>

              {booking.cancellation_reason ? (
                <p className="mt-2 text-xs text-muted">Motivo: {booking.cancellation_reason}</p>
              ) : null}

              <div className="mt-3 rounded-2xl border border-border-soft bg-surface-soft px-3 py-2 text-xs text-muted">
                <p>
                  Creada:{' '}
                  <span className="font-medium text-fg">{formatDateTime(booking.created_at)}</span>
                </p>
                <p className="mt-1">
                  Estado actual:{' '}
                  <span className="font-medium text-fg">
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </span>
                </p>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenDetail(booking)}
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg"
                >
                  <Eye className="h-3 w-3" />
                  Ver detalle
                </button>
                <BookingActionsMenu
                  booking={booking}
                  updatingBookingId={updatingBookingId}
                  triggerClassName="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg"
                  onReschedule={onReschedule}
                  onStatusChange={onStatusChange}
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1160px] border-separate border-spacing-y-3 text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="px-4 pb-2 font-medium">Cliente</th>
              <th className="px-4 pb-2 font-medium">Servicios</th>
              <th className="px-4 pb-2 font-medium">Profesional</th>
              <th className="px-4 pb-2 font-medium">Fecha y hora</th>
              <th className="px-4 pb-2 font-medium">Resumen</th>
              <th className="px-4 pb-2 font-medium">Estado</th>
              <th className="px-4 pb-2 font-medium">Acción</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((booking) => {
              const customerPhoneDisplay = getPhoneDisplay({
                display: booking.customer_phone,
                countryIso2: booking.customer_phone_country_iso2,
                nationalNumber: booking.customer_phone_national_number,
                e164: booking.customer_phone_e164,
              });
              const contactDisplay =
                booking.customer_email ?? customerPhoneDisplay ?? 'Sin contacto';

              return (
                <tr key={booking.id} className="text-primary shadow-theme-row">
                  <td className="rounded-l-3xl border-y border-l border-border-soft bg-surface px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={booking.customer_name} />
                      <div>
                        <p className="font-semibold text-fg-strong">{booking.customer_name}</p>
                        <p className="mt-1 text-xs text-muted">{contactDisplay}</p>
                      </div>
                    </div>
                  </td>

                  <td className="border-y border-border-soft bg-surface px-4 py-4">
                    <div className="space-y-1.5">
                      {booking.items.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-fg-secondary"
                        >
                          <Scissors className="h-3.5 w-3.5" />
                          {item.service_name_snapshot}
                        </div>
                      ))}
                      {booking.items.length > 2 ? (
                        <p className="text-xs text-muted">+{booking.items.length - 2} servicios</p>
                      ) : null}
                    </div>
                  </td>

                  <td className="border-y border-border-soft bg-surface px-4 py-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-fg-secondary">
                      <UserRound className="h-3.5 w-3.5" />
                      {booking.employee?.name ?? 'Profesional'}
                    </div>
                  </td>

                  <td className="border-y border-border-soft bg-surface px-4 py-4">
                    <div className="inline-flex items-center gap-2 text-fg-secondary">
                      <CalendarClock className="h-4 w-4 text-fg-icon" />
                      <div>
                        <p className="text-xs font-medium text-fg">
                          {formatDateTime(booking.start_at_utc)}
                        </p>
                        <p className="text-xs text-muted">
                          Fin:{' '}
                          {new Date(booking.end_at_utc).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="border-y border-border-soft bg-surface px-4 py-4">
                    <p className="text-xs font-medium text-fg-secondary">
                      {formatMinutes(booking.total_duration_minutes)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {booking.total_price} {booking.currency}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {BOOKING_SOURCE_LABELS[booking.source]}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Creada: {formatDateTime(booking.created_at)}
                    </p>
                  </td>

                  <td className="border-y border-border-soft bg-surface px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${BOOKING_STATUS_STYLES[booking.status]}`}
                    >
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </span>
                    {booking.cancellation_reason ? (
                      <p className="mt-2 max-w-[220px] text-xs text-muted">
                        Motivo: {booking.cancellation_reason}
                      </p>
                    ) : null}
                  </td>

                  <td className="rounded-r-3xl border-y border-r border-border-soft bg-surface px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(booking)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-fg transition hover:bg-surface-soft"
                      >
                        <Eye className="h-3 w-3" />
                        Detalle
                      </button>
                      <BookingActionsMenu
                        booking={booking}
                        updatingBookingId={updatingBookingId}
                        triggerClassName="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-fg transition hover:bg-surface-soft"
                        onReschedule={onReschedule}
                        onStatusChange={onStatusChange}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
