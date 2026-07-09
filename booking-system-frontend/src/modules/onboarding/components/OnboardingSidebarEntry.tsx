'use client';

import { useAuth } from '@/context/AuthContext';
import { getOnboardingModulesForRole } from '@/modules/onboarding/config/onboarding-modules';
import { onboardingService } from '@/modules/onboarding/services/onboarding.service';
import type { OnboardingProgressItem } from '@/types/onboarding.types';
import { BookOpenCheck, ChevronRight, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function getProgressKey(item: OnboardingProgressItem): string {
  return `${item.module_key}:${item.version}`;
}

export default function OnboardingSidebarEntry() {
  const { token, user } = useAuth();
  const [completedModules, setCompletedModules] = useState<OnboardingProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const modules = useMemo(() => {
    if (!user) return [];
    return getOnboardingModulesForRole(user.role);
  }, [user]);

  const completedCount = useMemo(() => {
    const completedKeys = new Set(completedModules.map(getProgressKey));
    return modules.filter((module) => completedKeys.has(`${module.key}:${module.version}`)).length;
  }, [completedModules, modules]);

  const progressPercent = modules.length ? Math.round((completedCount / modules.length) * 100) : 0;

  useEffect(() => {
    if (!token || !user || modules.length === 0) return;

    let isMounted = true;
    setIsLoading(true);

    onboardingService
      .getProgress(token)
      .then((response) => {
        if (!isMounted) return;
        setCompletedModules(response.modules);
      })
      .catch(() => {
        if (!isMounted) return;
        setCompletedModules([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [modules.length, token, user]);

  useEffect(() => {
    const handleProgressChanged = () => {
      if (!token) return;
      onboardingService
        .getProgress(token)
        .then((response) => setCompletedModules(response.modules))
        .catch(() => setCompletedModules([]));
    };

    window.addEventListener('bukky-onboarding:progress-changed', handleProgressChanged);
    return () => {
      window.removeEventListener('bukky-onboarding:progress-changed', handleProgressChanged);
    };
  }, [token]);

  if (!user || modules.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('bukky-onboarding:open'))}
      className="group w-full rounded-2xl border border-inverse-10 bg-inverse-10 p-3 text-left text-inverse-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-inverse-15 hover:bg-inverse-15"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/18 text-accent">
          {isLoading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpenCheck className="h-4 w-4" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold leading-none">Guía interactiva</span>
            <span className="rounded-full bg-inverse-10 px-2 py-0.5 text-[10px] font-semibold text-inverse-75">
              {progressPercent}%
            </span>
          </span>

          <span className="mt-1.5 block text-[10px] text-inverse-60">
            {completedCount} de {modules.length} recorridos completados
          </span>

          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-inverse-10">
            <span
              className="block h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </span>
        </span>

        <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-inverse-60 transition group-hover:translate-x-0.5 group-hover:text-inverse-80" />
      </div>
    </button>
  );
}
