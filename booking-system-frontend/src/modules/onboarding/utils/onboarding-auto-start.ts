const ONBOARDING_AUTO_START_SESSION_KEY = 'bukky:onboarding:auto-start-user';

export function queueOnboardingAutoStart(userId: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(ONBOARDING_AUTO_START_SESSION_KEY, userId);
}

export function consumeOnboardingAutoStart(userId: string): boolean {
  if (typeof window === 'undefined') return false;

  const queuedUserId = window.sessionStorage.getItem(ONBOARDING_AUTO_START_SESSION_KEY);
  if (queuedUserId !== userId) return false;

  window.sessionStorage.removeItem(ONBOARDING_AUTO_START_SESSION_KEY);
  return true;
}
