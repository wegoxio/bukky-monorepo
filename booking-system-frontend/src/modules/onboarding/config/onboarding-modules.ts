import type { User } from '@/types/user.types';
import type { DriveStep } from 'driver.js';
import {
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type OnboardingModule = {
  key: string;
  version: string;
  role: User['role'];
  title: string;
  eyebrow: string;
  description: string;
  route: string;
  durationLabel: string;
  tags: string[];
  icon: LucideIcon;
  targetSelectors: string[];
  steps: DriveStep[];
};

const sharedDriverPopover = {
  side: 'bottom' as const,
  align: 'start' as const,
};

function step(
  element: string,
  title: string,
  description: string,
  popover?: Partial<NonNullable<DriveStep['popover']>>,
): DriveStep {
  return {
    element,
    popover: {
      title,
      description,
      ...sharedDriverPopover,
      ...popover,
    },
  };
}

export const ONBOARDING_MODULES: OnboardingModule[] = [
  {
    key: 'tenant-dashboard',
    version: 'v2',
    role: 'TENANT_ADMIN',
    title: 'Panel',
    eyebrow: 'Onboarding 1 · Panel',
    description: 'Resumen diario del negocio, métricas principales y actividad reciente.',
    route: '/dashboard',
    durationLabel: '4 min aprox.',
    tags: ['métricas', 'actividad', 'resumen'],
    icon: LayoutDashboard,
    targetSelectors: [
      "[data-tour='dashboard-header']",
      "[data-tour='dashboard-kpis']",
      "[data-tour='dashboard-chart']",
      "[data-tour='dashboard-currency']",
      "[data-tour='dashboard-recent-logs']",
      "[data-tour='dashboard-main-table']",
    ],
    steps: [
      step(
        "[data-tour='dashboard-header']",
        'Lectura diaria del negocio',
        'Esta cabecera confirma el contexto del negocio y sirve como punto de entrada para revisar la operación del día.',
      ),
      step(
        "[data-tour='dashboard-kpis']",
        'Indicadores principales',
        'Aquí ves servicios activos, profesionales, citas e ingresos. Si algo importante cambia, normalmente se detecta primero en estos KPIs.',
      ),
      step(
        "[data-tour='dashboard-chart']",
        'Rendimiento mensual',
        'El gráfico cruza ingresos, citas y cancelaciones para entender tendencia sin entrar al reporte completo.',
      ),
      step(
        "[data-tour='dashboard-currency']",
        'Moneda de lectura',
        'Cambia la divisa solo para visualizar ingresos. Esto no modifica precios ni configuración real de los servicios.',
        { side: 'left', align: 'center' },
      ),
      step(
        "[data-tour='dashboard-recent-logs']",
        'Bitácora reciente',
        'Resume acciones críticas recientes: sesiones, cambios de configuración, citas y operaciones relevantes.',
        { side: 'left', align: 'center' },
      ),
      step(
        "[data-tour='dashboard-main-table']",
        'Tabla operativa',
        'En negocios muestra profesionales y rendimiento; en plataforma muestra comercios. Es el puente entre resumen y gestión detallada.',
      ),
    ],
  },
  {
    key: 'tenant-reports',
    version: 'v2',
    role: 'TENANT_ADMIN',
    title: 'Reportes',
    eyebrow: 'Onboarding 2 · Reportes',
    description: 'Filtros, exportación, tendencias y lectura de rendimiento del negocio.',
    route: '/reports',
    durationLabel: '5 min aprox.',
    tags: ['ingresos', 'filtros', 'excel'],
    icon: BarChart3,
    targetSelectors: [
      "[data-tour='reports-header']",
      "[data-tour='reports-actions']",
      "[data-tour='reports-filters']",
      "[data-tour='reports-summary']",
      "[data-tour='reports-trend-chart']",
      "[data-tour='reports-rankings']",
      "[data-tour='reports-channels-reminders']",
    ],
    steps: [
      step(
        "[data-tour='reports-header']",
        'Reportes operativos',
        'Esta vista responde preguntas de negocio: cuántas citas hubo, cuánto se generó, qué canal funciona mejor y qué servicios/profesionales destacan.',
      ),
      step(
        "[data-tour='reports-actions']",
        'Actualizar y exportar',
        'Usa actualizar para traer datos recientes y exportar Excel cuando necesites análisis externo o compartir resultados.',
        { side: 'left', align: 'center' },
      ),
      step(
        "[data-tour='reports-filters']",
        'Filtros persistentes',
        'Puedes ajustar fechas, agrupación, estado, canal, moneda, profesional y servicio. La vista conserva filtros para volver sin perder contexto.',
      ),
      step(
        "[data-tour='reports-summary']",
        'Resumen numérico',
        'Estas tarjetas dan la lectura rápida: citas, ingresos, completadas, cancelaciones, asistencia y ticket promedio.',
      ),
      step(
        "[data-tour='reports-trend-chart']",
        'Tendencia temporal',
        'El gráfico muestra evolución en el tiempo. Úsalo para detectar días, semanas o meses con cambios fuertes.',
      ),
      step(
        "[data-tour='reports-rankings']",
        'Top servicios y profesionales',
        'Estos rankings ayudan a decidir qué promocionar, qué profesional está produciendo más y dónde revisar capacidad.',
      ),
      step(
        "[data-tour='reports-channels-reminders']",
        'Canales y recordatorios',
        'Esta zona conecta performance comercial con operación: origen de reservas y estado de recordatorios enviados.',
      ),
    ],
  },
  {
    key: 'tenant-services',
    version: 'v2',
    role: 'TENANT_ADMIN',
    title: 'Servicios',
    eyebrow: 'Onboarding 3 · Servicios',
    description: 'Crea servicios con duración, precio, capacidad, buffers y equipo asignado.',
    route: '/services',
    durationLabel: '4 min aprox.',
    tags: ['precio', 'capacidad', 'equipo'],
    icon: BriefcaseBusiness,
    targetSelectors: [
      "[data-tour='services-summary']",
      "[data-tour='services-list-panel']",
      "[data-tour='services-controls']",
      "[data-tour='services-table']",
    ],
    steps: [
      step(
        "[data-tour='services-summary']",
        'Estado del catálogo',
        'El resumen confirma cuántos servicios existen, cuántos están activos y si tienes empleados disponibles para asignarlos.',
      ),
      step(
        "[data-tour='services-controls']",
        'Buscar o crear servicios',
        'Desde aquí encuentras servicios por nombre, descripción o equipo, y abres el formulario para crear uno nuevo.',
      ),
      step(
        "[data-tour='services-table']",
        'Servicio como regla operativa',
        'Cada fila define duración, precio, moneda, capacidad, buffers e instrucciones. Esto impacta directamente la disponibilidad pública.',
      ),
      step(
        "[data-tour='services-list-panel']",
        'Activación y edición',
        'Mantén inactivos los servicios que no deben reservarse. Edita asignaciones cuando un profesional cambie su oferta.',
      ),
    ],
  },
  {
    key: 'tenant-employees',
    version: 'v2',
    role: 'TENANT_ADMIN',
    title: 'Empleados',
    eyebrow: 'Onboarding 4 · Empleados',
    description: 'Gestiona profesionales, contacto, disponibilidad y horarios publicados.',
    route: '/employees',
    durationLabel: '4 min aprox.',
    tags: ['equipo', 'horarios', 'agenda'],
    icon: Users,
    targetSelectors: [
      "[data-tour='employees-summary']",
      "[data-tour='employees-controls']",
      "[data-tour='employees-table']",
    ],
    steps: [
      step(
        "[data-tour='employees-summary']",
        'Equipo disponible',
        'El resumen indica cuántos profesionales existen y cuántos están activos para recibir servicios y citas.',
      ),
      step(
        "[data-tour='employees-controls']",
        'Crear y buscar profesionales',
        'Usa la búsqueda para ubicar al equipo rápidamente o crea un profesional con email, teléfono y avatar.',
      ),
      step(
        "[data-tour='employees-table']",
        'Horarios y disponibilidad',
        'La tabla permite editar datos y abrir horarios. Sin horarios publicados, el cliente no verá disponibilidad real para reservar.',
      ),
    ],
  },
  {
    key: 'tenant-bookings',
    version: 'v2',
    role: 'TENANT_ADMIN',
    title: 'Citas',
    eyebrow: 'Onboarding 5 · Citas',
    description: 'Tabla, calendario, acciones rápidas, detalle, estados y reprogramaciones.',
    route: '/bookings',
    durationLabel: '6 min aprox.',
    tags: ['calendario', 'estados', 'reservas'],
    icon: CalendarClock,
    targetSelectors: [
      "[data-tour='bookings-summary']",
      "[data-tour='bookings-workspace']",
      "[data-tour='bookings-view-switch']",
      "[data-tour='bookings-create-button']",
      "[data-tour='bookings-filters']",
      "[data-tour='bookings-table']",
      "[data-tour='bookings-calendar']",
      "[data-tour='calendar-board']",
      "[data-tour='calendar-day-detail']",
    ],
    steps: [
      step(
        "[data-tour='bookings-summary']",
        'Salud de la agenda',
        'El resumen muestra volumen total, citas de hoy y activas. Úsalo para saber si la operación está cargada.',
      ),
      step(
        "[data-tour='bookings-workspace']",
        'Centro de operación diaria',
        'Aquí se controla la agenda: búsqueda, filtros, tabla, calendario, creación manual y acciones de estado.',
      ),
      step(
        "[data-tour='bookings-view-switch']",
        'Tabla o calendario',
        'La tabla es mejor para operar rápido. El calendario es mejor para entender ocupación, huecos y carga por día.',
        { side: 'left', align: 'center' },
      ),
      step(
        "[data-tour='bookings-create-button']",
        'Registrar cita manual',
        'Úsalo cuando el cliente escribe por WhatsApp, llama o el negocio necesita bloquear una cita directamente.',
        { side: 'left', align: 'center' },
      ),
      step(
        "[data-tour='bookings-filters']",
        'Filtros de agenda',
        'Filtra por búsqueda, estado, profesional y día. Los filtros ayudan a separar pendientes, confirmadas o citas de un empleado específico.',
      ),
      step(
        "[data-tour='bookings-table']",
        'Acciones por cita',
        'Desde la tabla puedes ver detalle, confirmar, cancelar, completar o reprogramar. Es la vista de trabajo rápido.',
      ),
      step(
        "[data-tour='bookings-calendar']",
        'Agenda visual',
        'Cuando cambies a calendario, verás mes, semana o día con colores por estado y capacidad visual.',
      ),
      step(
        "[data-tour='calendar-board']",
        'Bloques del calendario',
        'Cada bloque representa citas agrupadas por fecha u hora. Si filtras por profesional, también lees disponibilidad y reprogramación por arrastre.',
      ),
      step(
        "[data-tour='calendar-day-detail']",
        'Detalle del día seleccionado',
        'Este panel resume citas activas, personas atendidas y lista de reservas del día. Desde aquí puedes abrir detalle o crear una nueva cita.',
        { side: 'left', align: 'center' },
      ),
    ],
  },
  {
    key: 'tenant-logs',
    version: 'v2',
    role: 'TENANT_ADMIN',
    title: 'Logs',
    eyebrow: 'Onboarding 6 · Logs',
    description: 'Trazabilidad clara de cambios, sesiones y acciones críticas del negocio.',
    route: '/audit-logs',
    durationLabel: '4 min aprox.',
    tags: ['auditoría', 'seguridad', 'historial'],
    icon: ReceiptText,
    targetSelectors: [
      "[data-tour='audit-logs-header']",
      "[data-tour='audit-logs-filters']",
      "[data-tour='audit-logs-results']",
      "[data-tour='audit-logs-table']",
      "[data-tour='audit-logs-pagination']",
    ],
    steps: [
      step(
        "[data-tour='audit-logs-header']",
        'Trazabilidad del negocio',
        'Los logs muestran acciones importantes: sesiones, cambios, citas, configuración y eventos de seguridad.',
      ),
      step(
        "[data-tour='audit-logs-filters']",
        'Búsqueda y filtros',
        'Filtra por texto, acción, entidad, fecha, negocio o empleado. Es útil para investigar qué pasó y cuándo.',
      ),
      step(
        "[data-tour='audit-logs-results']",
        'Resultados legibles',
        'Cada evento se muestra con mensaje entendible, actor, negocio y entidad afectada. Se evita exponer detalles técnicos innecesarios.',
      ),
      step(
        "[data-tour='audit-logs-table']",
        'Columnas clave',
        'Fecha, evento, actor, negocio y entidad permiten reconstruir una operación sin revisar base de datos.',
      ),
      step(
        "[data-tour='audit-logs-pagination']",
        'Paginación',
        'Los logs pueden crecer mucho; por eso se navegan por páginas para mantener la vista rápida.',
      ),
    ],
  },
  {
    key: 'tenant-settings',
    version: 'v2',
    role: 'TENANT_ADMIN',
    title: 'Configuración',
    eyebrow: 'Onboarding 7 · Configuración',
    description: 'Datos del negocio, theme builder, seguridad, MFA y sesiones activas.',
    route: '/settings',
    durationLabel: '6 min aprox.',
    tags: ['marca', 'seguridad', 'MFA'],
    icon: Settings,
    targetSelectors: [
      "[data-tour='settings-sidebar']",
      "[data-tour='settings-section-nav']",
      "[data-tour='settings-active-section']",
      "[data-tour='settings-general-header']",
      "[data-tour='settings-business-info']",
      "[data-tour='settings-public-booking-link']",
      "[data-tour='settings-admin-access']",
      "[data-tour='theme-builder-header']",
      "[data-tour='theme-builder-controls']",
      "[data-tour='settings-mfa-card']",
      "[data-tour='settings-sessions-card']",
    ],
    steps: [
      step(
        "[data-tour='settings-sidebar']",
        'Configuración organizada por secciones',
        'El sidebar reduce ruido visual y separa datos generales, identidad visual y seguridad.',
      ),
      step(
        "[data-tour='settings-section-nav']",
        'General, Theme builder y Seguridad',
        'Cambia de sección según el trabajo: datos del negocio, personalización visual o protección de la cuenta.',
      ),
      step(
        "[data-tour='settings-general-header']",
        'Datos del negocio',
        'Desde General se mantienen nombre, contacto, dirección y datos administrativos que impactan correos y reserva pública.',
      ),
      step(
        "[data-tour='settings-business-info']",
        'Información pública y operativa',
        'Estos campos alimentan comunicaciones al cliente, dirección, teléfono, ciudad y datos de contacto del negocio.',
      ),
      step(
        "[data-tour='settings-public-booking-link']",
        'Enlace público y QR',
        'Aquí puedes copiar el enlace de reservas, ver la vista pública y descargar QR para mostrador, WhatsApp o redes.',
      ),
      step(
        "[data-tour='settings-admin-access']",
        'Cambios sensibles',
        'Contraseña y email administrativo requieren un flujo más protegido porque afectan control de la cuenta y sesiones.',
      ),
      step(
        "[data-tour='settings-active-section']",
        'Contenido activo',
        'La zona derecha cambia según la sección seleccionada. Si entras a Theme builder o Seguridad, el recorrido encontrará sus bloques visibles.',
      ),
    ],
  },
  {
    key: 'super-dashboard',
    version: 'v2',
    role: 'SUPER_ADMIN',
    title: 'Panel plataforma',
    eyebrow: 'Onboarding 1 · Plataforma',
    description: 'Resumen global de negocios, administradores, citas e ingresos.',
    route: '/dashboard',
    durationLabel: '4 min aprox.',
    tags: ['plataforma', 'KPIs', 'actividad'],
    icon: LayoutDashboard,
    targetSelectors: [
      "[data-tour='dashboard-header']",
      "[data-tour='dashboard-kpis']",
      "[data-tour='dashboard-chart']",
      "[data-tour='dashboard-recent-logs']",
      "[data-tour='dashboard-main-table']",
    ],
    steps: [
      step(
        "[data-tour='dashboard-header']",
        'Panel de plataforma',
        'Esta vista resume salud general de Bukky: negocios, administradores, citas e ingresos.',
      ),
      step(
        "[data-tour='dashboard-kpis']",
        'KPIs globales',
        'Los indicadores muestran volumen de plataforma y ayudan a detectar crecimiento, caída o actividad anormal.',
      ),
      step(
        "[data-tour='dashboard-chart']",
        'Tendencia global',
        'Cruza ingresos y citas para entender evolución agregada de todos los negocios.',
      ),
      step(
        "[data-tour='dashboard-recent-logs']",
        'Actividad reciente',
        'Sirve para revisar acciones críticas sin entrar primero a Logs.',
        { side: 'left', align: 'center' },
      ),
      step(
        "[data-tour='dashboard-main-table']",
        'Negocios destacados',
        'La tabla ayuda a revisar comercios, administradores, personal, citas, ingresos y estado.',
      ),
    ],
  },
  {
    key: 'super-reports',
    version: 'v1',
    role: 'SUPER_ADMIN',
    title: 'Reportes plataforma',
    eyebrow: 'Onboarding 2 · Reportes',
    description: 'Lectura global de rendimiento, canales y actividad de la plataforma.',
    route: '/reports',
    durationLabel: '5 min aprox.',
    tags: ['plataforma', 'reportes', 'excel'],
    icon: BarChart3,
    targetSelectors: [
      "[data-tour='reports-header']",
      "[data-tour='reports-actions']",
      "[data-tour='reports-filters']",
      "[data-tour='reports-summary']",
      "[data-tour='reports-trend-chart']",
      "[data-tour='reports-rankings']",
    ],
    steps: [
      step(
        "[data-tour='reports-header']",
        'Reportes globales',
        'Permite revisar rendimiento agregado de la plataforma y exportar análisis operativo.',
      ),
      step(
        "[data-tour='reports-filters']",
        'Filtros globales',
        'Ajusta rangos, estado, canal y moneda. En plataforma, la lectura ayuda a comparar actividad general.',
      ),
      step(
        "[data-tour='reports-summary']",
        'Resumen ejecutivo',
        'KPIs rápidos para medir citas, ingresos, cancelaciones y asistencia.',
      ),
      step(
        "[data-tour='reports-rankings']",
        'Rankings',
        'Identifica servicios, profesionales o negocios que concentran mayor actividad.',
      ),
    ],
  },
  {
    key: 'super-businesses',
    version: 'v2',
    role: 'SUPER_ADMIN',
    title: 'Negocios',
    eyebrow: 'Onboarding 3 · Negocios',
    description: 'Alta, edición y control operativo de comercios dentro de Bukky.',
    route: '/tenants',
    durationLabel: '4 min aprox.',
    tags: ['comercios', 'estado', 'admins'],
    icon: Building2,
    targetSelectors: [
      "[data-tour='tenants-summary']",
      "[data-tour='tenants-controls']",
      "[data-tour='tenants-table']",
    ],
    steps: [
      step(
        "[data-tour='tenants-summary']",
        'Estado de negocios',
        'El resumen indica cuántos comercios existen y cuántos están activos.',
      ),
      step(
        "[data-tour='tenants-controls']",
        'Crear o buscar negocio',
        'Crea comercios, define slug y opcionalmente invita un administrador inicial.',
      ),
      step(
        "[data-tour='tenants-table']",
        'Operación por comercio',
        'La tabla permite editar datos y desactivar negocios cuando sea necesario bloquear su operación.',
      ),
    ],
  },
  {
    key: 'super-admins',
    version: 'v1',
    role: 'SUPER_ADMIN',
    title: 'Admins de negocio',
    eyebrow: 'Onboarding 4 · Admins',
    description: 'Invitación, edición y control de administradores por comercio.',
    route: '/users',
    durationLabel: '4 min aprox.',
    tags: ['usuarios', 'invitaciones', 'acceso'],
    icon: UserRound,
    targetSelectors: [
      "[data-tour='tenant-admins-summary']",
      "[data-tour='tenant-admins-controls']",
      "[data-tour='tenant-admins-table']",
    ],
    steps: [
      step(
        "[data-tour='tenant-admins-summary']",
        'Cobertura administrativa',
        'Revisa cuántos administradores existen, cuántos están activos y cuántos negocios tienen responsable.',
      ),
      step(
        "[data-tour='tenant-admins-controls']",
        'Invitar administrador',
        'El alta envía una invitación segura: el usuario define su contraseña desde enlace, no manualmente.',
      ),
      step(
        "[data-tour='tenant-admins-table']",
        'Control de acceso',
        'Edita datos, cambia estado y desactiva cuentas cuando una persona ya no deba acceder al negocio.',
      ),
    ],
  },
  {
    key: 'super-logs',
    version: 'v1',
    role: 'SUPER_ADMIN',
    title: 'Logs',
    eyebrow: 'Onboarding 5 · Logs',
    description: 'Auditoría global de acciones, accesos y cambios importantes.',
    route: '/audit-logs',
    durationLabel: '4 min aprox.',
    tags: ['auditoría', 'seguridad', 'trazabilidad'],
    icon: ReceiptText,
    targetSelectors: [
      "[data-tour='audit-logs-header']",
      "[data-tour='audit-logs-filters']",
      "[data-tour='audit-logs-table']",
      "[data-tour='audit-logs-pagination']",
    ],
    steps: [
      step(
        "[data-tour='audit-logs-header']",
        'Auditoría global',
        'Permite revisar acciones críticas de plataforma y negocios desde una sola vista.',
      ),
      step(
        "[data-tour='audit-logs-filters']",
        'Investigación por filtros',
        'Filtra por acción, entidad, negocio, fechas o texto para encontrar eventos concretos.',
      ),
      step(
        "[data-tour='audit-logs-table']",
        'Lectura del evento',
        'Cada fila muestra fecha, evento, actor, negocio y entidad afectada sin exponer detalles técnicos innecesarios.',
      ),
      step(
        "[data-tour='audit-logs-pagination']",
        'Historial paginado',
        'La paginación evita renderizar demasiados registros y mantiene la vista estable.',
      ),
    ],
  },
  {
    key: 'super-security',
    version: 'v2',
    role: 'SUPER_ADMIN',
    title: 'Configuración y seguridad',
    eyebrow: 'Onboarding 6 · Seguridad',
    description: 'Datos de cuenta, seguridad, MFA, sesiones y personalización global.',
    route: '/settings',
    durationLabel: '5 min aprox.',
    tags: ['MFA', 'sesiones', 'marca'],
    icon: ShieldCheck,
    targetSelectors: [
      "[data-tour='settings-sidebar']",
      "[data-tour='settings-section-nav']",
      "[data-tour='settings-active-section']",
      "[data-tour='settings-mfa-card']",
      "[data-tour='settings-sessions-card']",
      "[data-tour='theme-builder-header']",
    ],
    steps: [
      step(
        "[data-tour='settings-sidebar']",
        'Configuración de plataforma',
        'Desde este sidebar accedes a datos generales, theme builder y seguridad.',
      ),
      step(
        "[data-tour='settings-section-nav']",
        'Secciones sensibles',
        'General gestiona datos, Theme builder la marca global y Seguridad protege acceso administrativo.',
      ),
      step(
        "[data-tour='settings-active-section']",
        'Contenido activo',
        'La sección derecha cambia según el módulo seleccionado. Usa Seguridad para MFA y sesiones.',
      ),
    ],
  },
];

export function getOnboardingModulesForRole(role: User['role']): OnboardingModule[] {
  return ONBOARDING_MODULES.filter((module) => module.role === role);
}

export const ONBOARDING_EMPTY_ICON = BookOpenCheck;
