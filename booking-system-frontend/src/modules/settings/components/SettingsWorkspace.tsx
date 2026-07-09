'use client';

import BusinessGeneralSettingsPanel from '@/modules/settings/components/BusinessGeneralSettingsPanel';
import SecuritySettingsPanel from '@/modules/settings/components/SecuritySettingsPanel';
import TenantSettingsPanel from '@/modules/settings/components/TenantSettingsPanel';
import { Building2, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

type SettingsSection = 'general' | 'builder' | 'security';

type SettingsNavItem = {
  id: SettingsSection;
  title: string;
  description: string;
  icon: LucideIcon;
};

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Datos del negocio y cuenta',
    icon: Building2,
  },
  {
    id: 'builder',
    title: 'Theme builder',
    description: 'Marca, colores y recursos',
    icon: Sparkles,
  },
  {
    id: 'security',
    title: 'Seguridad',
    description: 'MFA y sesiones activas',
    icon: ShieldCheck,
  },
];

export default function SettingsWorkspace() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const activeItem =
    SETTINGS_NAV_ITEMS.find((item) => item.id === activeSection) ?? SETTINGS_NAV_ITEMS[0];

  return (
    <section data-tour="settings-page" className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
      <aside data-tour="settings-sidebar" className="xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-[28px] border border-card-border bg-card p-3 shadow-theme-card">
          <div className="px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Configuración
            </p>
            <h2 className="mt-1 text-lg font-semibold text-fg-strong">{activeItem.title}</h2>
          </div>

          <nav
            data-tour="settings-section-nav"
            className="mt-2 space-y-1.5"
            aria-label="Secciones de configuración"
          >
            {SETTINGS_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeSection;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition duration-300 ${
                    isActive
                      ? 'bg-accent text-accent-text shadow-theme-accent'
                      : 'text-fg-secondary hover:bg-surface-soft hover:text-fg-strong'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition duration-300 ${
                      isActive
                        ? 'border-inverse-20 bg-inverse-15 text-accent-text'
                        : 'border-card-border bg-surface text-fg-secondary group-hover:text-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span
                      className={`mt-0.5 block truncate text-xs ${
                        isActive ? 'text-accent-text/75' : 'text-muted'
                      }`}
                    >
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div
        key={activeSection}
        data-tour="settings-active-section"
        className="min-w-0 animate-[settingsFadeIn_260ms_ease-out]"
      >
        {activeSection === 'general' ? <BusinessGeneralSettingsPanel /> : null}

        {activeSection === 'builder' ? (
          <div className="space-y-4">
            <div
              data-tour="theme-builder-intro"
              className="rounded-[28px] border border-card-border bg-card p-6 shadow-theme-card"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-fg-secondary">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Theme builder
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-fg-strong">
                Constructor visual del tema
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-fg-secondary">
                Ajusta colores, marca, logo, favicon y vista previa completa antes de aplicar
                cambios.
              </p>
            </div>
            <TenantSettingsPanel />
          </div>
        ) : null}

        {activeSection === 'security' ? <SecuritySettingsPanel /> : null}
      </div>

      <style jsx global>{`
        @keyframes settingsFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
