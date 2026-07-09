import { apiFetch } from '@/modules/http/services/api';
import type {
  CompleteOnboardingModuleResponse,
  OnboardingProgressResponse,
} from '@/types/onboarding.types';

export const onboardingService = {
  getProgress: async (token: string): Promise<OnboardingProgressResponse> => {
    return apiFetch<OnboardingProgressResponse>('/auth/me/onboarding/progress', {
      method: 'GET',
      token,
    });
  },

  completeModule: async (
    token: string,
    moduleKey: string,
    version: string,
  ): Promise<CompleteOnboardingModuleResponse> => {
    return apiFetch<CompleteOnboardingModuleResponse>(
      `/auth/me/onboarding/modules/${encodeURIComponent(moduleKey)}/complete`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ version }),
      },
    );
  },

  resetProgress: async (token: string): Promise<{ success: true }> => {
    return apiFetch<{ success: true }>('/auth/me/onboarding/reset', {
      method: 'POST',
      token,
    });
  },
};
