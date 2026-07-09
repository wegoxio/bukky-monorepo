'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTenantSettings } from '@/context/TenantSettingsContext';
import OnboardingSidebarEntry from '@/modules/onboarding/components/OnboardingSidebarEntry';
import Avatar from '@/modules/ui/Avatar';
import Image from 'next/image';

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navTourIdByHref: Record<string, string> = {
  '/dashboard': 'dashboard-nav-dashboard',
  '/reports': 'dashboard-nav-reports',
  '/tenants': 'dashboard-nav-tenants',
  '/users': 'dashboard-nav-users',
  '/services': 'dashboard-nav-services',
  '/employees': 'dashboard-nav-employees',
  '/bookings': 'dashboard-nav-bookings',
  '/audit-logs': 'dashboard-nav-audit-logs',
  '/settings': 'dashboard-nav-settings',
};

type DashboardSidebarProps = {
  items: DashboardNavItem[];
  isOpen: boolean;
  onClose: () => void;
};

export default function DashboardSidebar({ items, isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { settings } = useTenantSettings();
  const logoUrl = settings.branding.logoUrl.trim() || '/bukky-logo.svg';
  const appName = settings.branding.appName.trim() || 'Bukky';

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar navegacion lateral"
        className={`absolute inset-0 z-30 bg-overlay-soft lg:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      />

      <aside
        data-tour="dashboard-sidebar"
        className={`sidebar-gradient absolute inset-y-0 left-0 z-40 w-62.5 border-r border-inverse-15 text-sidebar-text shadow-theme-inset transition-transform duration-200 lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-5 rounded-xl bg-overlay-muted px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src={logoUrl}
                alt={`${appName} logo`}
                width={30}
                height={20}
                onError={(event) => {
                  event.currentTarget.src = '/bukky-logo.svg';
                }}
              />
              <span className="max-w-42.5 text-2xl font-semibold leading-none tracking-tight">
                {appName}
              </span>
            </Link>
          </div>

          <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {items.map((item) => {
              const itemHref = item.href || '/dashboard';
              const isActive = pathname === itemHref || pathname.startsWith(`${itemHref}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={itemHref}
                  onClick={onClose}
                  data-tour={navTourIdByHref[itemHref]}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-active text-sidebar-active-text'
                      : 'text-sidebar-text opacity-85 hover:bg-sidebar-hover'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? 'text-sidebar-active-text' : 'text-sidebar-text opacity-80'
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 space-y-2">
            <OnboardingSidebarEntry />

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg bg-overlay-muted px-2.5 py-2.5 text-left text-inverse-95"
            >
              <Avatar name={user?.name ?? 'Superadministrador'} className="h-8 w-8 text-[10px]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold leading-none">
                  {user?.name ?? 'Superadministrador'}
                </span>
                <span className="mt-1 block truncate text-[10px] text-inverse-60">
                  {user?.email ?? 'admin@bukky.com'}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-inverse-15 bg-overlay-muted px-3 py-2 text-xs font-semibold text-inverse-95 hover:bg-inverse-10"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
