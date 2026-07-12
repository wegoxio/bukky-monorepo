'use client';

import { useAuth } from '@/context/AuthContext';
import {
  getOnboardingModulesForRole,
  ONBOARDING_EMPTY_ICON,
  type OnboardingModule,
} from '@/modules/onboarding/config/onboarding-modules';
import { onboardingService } from '@/modules/onboarding/services/onboarding.service';
import type { OnboardingProgressItem } from '@/types/onboarding.types';
import type { Driver, DriveStep } from 'driver.js';
import {
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  LoaderCircle,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForAnyTourTarget(selectors: string[]): Promise<boolean> {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const hasTarget = selectors.some((selector) => Boolean(document.querySelector(selector)));
    if (hasTarget) return true;
    await wait(160);
  }

  return false;
}

function filterAvailableSteps(steps: DriveStep[]): DriveStep[] {
  return steps.filter((step) => {
    if (!step.element || typeof step.element !== 'string') return true;
    return Boolean(document.querySelector(step.element));
  });
}

function getProgressKey(module: OnboardingModule): string {
  return `${module.key}:${module.version}`;
}

export default function OnboardingGuidePanel() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [runningModuleKey, setRunningModuleKey] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<OnboardingProgressItem[]>([]);
  const driverRef = useRef<Driver | null>(null);
  const pendingModuleRef = useRef<OnboardingModule | null>(null);
  const runningModuleRef = useRef<OnboardingModule | null>(null);
  const pathnameRef = useRef(pathname);

  const modules = useMemo(() => {
    if (!user) return [];
    return getOnboardingModulesForRole(user.role);
  }, [user]);

  const completedKeys = useMemo(() => {
    return new Set(completedModules.map((item) => `${item.module_key}:${item.version}`));
  }, [completedModules]);

  const completedCount = modules.filter((module) =>
    completedKeys.has(getProgressKey(module)),
  ).length;
  const progressPercent = modules.length ? Math.round((completedCount / modules.length) * 100) : 0;
  const EmptyIcon = ONBOARDING_EMPTY_ICON;

  const loadProgress = useCallback(async () => {
    if (!token) return;
    setIsLoadingProgress(true);
    try {
      const response = await onboardingService.getProgress(token);
      setCompletedModules(response.modules);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar el progreso de la guía.';
      toast.error(message);
    } finally {
      setIsLoadingProgress(false);
    }
  }, [token]);

  const completeModuleLocally = useCallback((module: OnboardingModule, completedAt: string) => {
    setCompletedModules((current) => {
      const next = current.filter(
        (item) => !(item.module_key === module.key && item.version === module.version),
      );
      return [
        ...next,
        {
          module_key: module.key,
          version: module.version,
          completed_at: completedAt,
        },
      ];
    });
  }, []);

  const markModuleCompleted = useCallback(
    async (module: OnboardingModule) => {
      if (!token) return;
      try {
        const response = await onboardingService.completeModule(token, module.key, module.version);
        completeModuleLocally(module, response.completed_at);
        window.dispatchEvent(new CustomEvent('bukky-onboarding:progress-changed'));
      } catch {
        toast.error('El recorrido terminó, pero no se pudo guardar el progreso.');
      }
    },
    [completeModuleLocally, token],
  );

  const startDriverForModule = useCallback(
    async (module: OnboardingModule) => {
      if (!isDesktopViewport()) {
        toast('La guía interactiva está optimizada para escritorio.');
        return;
      }

      const hasTarget = await waitForAnyTourTarget(module.targetSelectors);
      if (!hasTarget) {
        toast.error('No se encontraron los elementos necesarios para iniciar este recorrido.');
        return;
      }

      const availableSteps = filterAvailableSteps(module.steps);
      if (availableSteps.length === 0) {
        toast.error('Este recorrido todavía no tiene elementos visibles en la vista actual.');
        return;
      }

      const { driver } = await import('driver.js');
      driverRef.current?.destroy();
      runningModuleRef.current = module;
      setRunningModuleKey(module.key);
      setIsOpen(false);
      let completedByDoneButton = false;

      const instance = driver({
        steps: availableSteps,
        animate: true,
        smoothScroll: true,
        allowClose: true,
        showProgress: true,
        stagePadding: 10,
        stageRadius: 18,
        overlayOpacity: 0.62,
        overlayColor: 'rgba(15, 23, 42, 0.86)',
        popoverClass: 'bukky-tour-popover',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Completar',
        onPopoverRender: (popover, options) => {
          const isLastStep = options.state.activeIndex === availableSteps.length - 1;
          popover.nextButton.onclick = () => {
            if (isLastStep) {
              completedByDoneButton = true;
            }
          };
        },
        onDestroyed: () => {
          const completedModule = runningModuleRef.current;
          driverRef.current = null;
          runningModuleRef.current = null;
          setRunningModuleKey(null);
          if (completedModule && completedByDoneButton) {
            void markModuleCompleted(completedModule);
          }
        },
      });

      driverRef.current = instance;
      instance.drive();
    },
    [markModuleCompleted],
  );

  const openModule = useCallback(
    async (module: OnboardingModule) => {
      if (!token) return;
      pendingModuleRef.current = module;

      if (pathnameRef.current !== module.route) {
        router.push(module.route);
        return;
      }

      await startDriverForModule(module);
      pendingModuleRef.current = null;
    },
    [router, startDriverForModule, token],
  );

  const resetProgress = useCallback(async () => {
    if (!token || isResetting) return;
    setIsResetting(true);
    try {
      await onboardingService.resetProgress(token);
      setCompletedModules([]);
      window.dispatchEvent(new CustomEvent('bukky-onboarding:progress-changed'));
      toast.success('Progreso de la guía reiniciado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo reiniciar el progreso.';
      toast.error(message);
    } finally {
      setIsResetting(false);
    }
  }, [isResetting, token]);

  useEffect(() => {
    pathnameRef.current = pathname;
    const pendingModule = pendingModuleRef.current;
    if (!pendingModule || pendingModule.route !== pathname) return;

    void (async () => {
      await wait(240);
      await startDriverForModule(pendingModule);
      pendingModuleRef.current = null;
    })();
  }, [pathname, startDriverForModule]);

  useEffect(() => {
    if (!token || !user) return;
    void loadProgress();
  }, [loadProgress, token, user]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('bukky-onboarding:open', handleOpen);
    return () => {
      window.removeEventListener('bukky-onboarding:open', handleOpen);
    };
  }, []);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  if (!user || modules.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] transition ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          aria-label="Cerrar guía interactiva"
          onClick={() => setIsOpen(false)}
          className={`absolute inset-0 bg-overlay-strong transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-[390px] flex-col border-l border-inverse-10 bg-[#09111f] text-white shadow-theme-modal-lg transition-transform duration-300 ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="border-b border-inverse-10 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-inverse-10 bg-inverse-10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-inverse-70">
                  <CircleHelp className="h-3.5 w-3.5 text-accent" />
                  Guía interactiva
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                  Onboarding por módulos
                </h2>
                <p className="mt-2 text-sm leading-6 text-inverse-70">
                  Abre solo la parte que quieras ver. Cada recorrido explica una zona concreta de
                  Bukky.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-inverse-10 bg-inverse-10 text-inverse-75 hover:bg-inverse-20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-inverse-10 bg-[#060c17] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {completedCount} de {modules.length} recorridos completados
                  </p>
                  <p className="mt-1 text-xs text-inverse-60">
                    Puedes completar los módulos en el orden que prefieras.
                  </p>
                </div>
                <span className="rounded-full border border-inverse-10 bg-inverse-10 px-2 py-1 text-xs font-bold text-accent">
                  {progressPercent}%
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-inverse-10">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {isLoadingProgress ? (
              <div className="flex items-center gap-2 rounded-3xl border border-inverse-10 bg-[#060c17] p-4 text-sm text-inverse-70">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Cargando progreso...
              </div>
            ) : null}

            {modules.length === 0 ? (
              <div className="rounded-3xl border border-inverse-10 bg-[#060c17] p-4 text-sm text-inverse-70">
                <EmptyIcon className="mb-3 h-5 w-5 text-accent" />
                No hay recorridos configurados para tu perfil.
              </div>
            ) : null}

            {modules.map((module) => {
              const Icon = module.icon;
              const isCompleted = completedKeys.has(getProgressKey(module));
              const isRunning = runningModuleKey === module.key;

              return (
                <article
                  key={getProgressKey(module)}
                  className="rounded-3xl border border-inverse-10 bg-[#060c17] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-inverse-50">
                        {module.eyebrow}
                      </p>
                      <h3 className="mt-2 flex items-center gap-2 text-lg font-semibold">
                        <Icon className="h-4 w-4 text-accent" />
                        {module.title}
                      </h3>
                    </div>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Hecho
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-inverse-70">{module.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {module.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-inverse-10 bg-inverse-10 px-2.5 py-1 text-[11px] text-inverse-70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-inverse-50">{module.durationLabel}</p>
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => {
                        void openModule(module);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-accent-text shadow-theme-accent-sm hover:bg-accent-hover disabled:opacity-60"
                    >
                      {isRunning ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : isCompleted ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      {isCompleted ? 'Repetir' : 'Abrir recorrido'}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="border-t border-inverse-10 px-5 py-4">
            <button
              type="button"
              disabled={isResetting}
              onClick={() => {
                void resetProgress();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-inverse-10 bg-inverse-10 px-4 py-3 text-sm font-semibold text-inverse-80 hover:bg-inverse-20 disabled:opacity-60"
            >
              {isResetting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reiniciar progreso
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
