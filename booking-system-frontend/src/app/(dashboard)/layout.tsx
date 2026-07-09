import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { TenantSettingsProvider } from '@/context/TenantSettingsContext';
import DashboardShell from '@/modules/layout/components/DashboardShell';

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthProvider>
      <TenantSettingsProvider>
        <DashboardShell>{children}</DashboardShell>
      </TenantSettingsProvider>
    </AuthProvider>
  );
}
