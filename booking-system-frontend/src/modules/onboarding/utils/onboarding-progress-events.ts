import type { OnboardingProgressItem } from '@/types/onboarding.types';

export const ONBOARDING_PROGRESS_CHANGED_EVENT = 'bukky-onboarding:progress-changed';

export type OnboardingProgressChangedDetail = {
  completedModule?: OnboardingProgressItem;
  reset?: boolean;
};

export function emitOnboardingProgressChanged(detail: OnboardingProgressChangedDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_PROGRESS_CHANGED_EVENT, { detail }));
}

export function getOnboardingProgressChangedDetail(
  event: Event,
): OnboardingProgressChangedDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  return event.detail && typeof event.detail === 'object'
    ? (event.detail as OnboardingProgressChangedDetail)
    : null;
}
