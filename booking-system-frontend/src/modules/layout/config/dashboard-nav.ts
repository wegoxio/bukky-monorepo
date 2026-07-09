import {
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Users,
  BriefcaseBusiness,
} from 'lucide-react';
import type { DashboardNavItem } from '@/modules/layout/components/DashboardSidebar';
import type { User } from '@/types/user.types';

type Role = User['role'];

const superAdminItems: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/reports', label: 'Reportes', icon: ChartNoAxesCombined },
  { href: '/tenants', label: 'Negocios', icon: Building2 },
  { href: '/users', label: 'Admins de negocio', icon: Users },
  { href: '/audit-logs', label: 'Logs', icon: ReceiptText },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

const tenantAdminItems: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/reports', label: 'Reportes', icon: ChartNoAxesCombined },
  { href: '/services', label: 'Servicios', icon: BriefcaseBusiness },
  { href: '/employees', label: 'Empleados', icon: Users },
  { href: '/bookings', label: 'Citas', icon: CalendarClock },
  { href: '/audit-logs', label: 'Logs', icon: ReceiptText },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

const allowedPathsByRole: Record<Role, string[]> = {
  SUPER_ADMIN: [
    '/dashboard',
    '/profile',
    '/reports',
    '/tenants',
    '/users',
    '/audit-logs',
    '/settings',
  ],
  TENANT_ADMIN: [
    '/dashboard',
    '/profile',
    '/reports',
    '/services',
    '/employees',
    '/bookings',
    '/audit-logs',
    '/settings',
  ],
};

export function getDashboardNavItems(role: Role): DashboardNavItem[] {
  return role === 'SUPER_ADMIN' ? superAdminItems : tenantAdminItems;
}

export function isRoleAllowedPath(role: Role, pathname: string): boolean {
  const allowedPaths = allowedPathsByRole[role];
  return allowedPaths.some(
    (allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`),
  );
}
