export type OnboardingProgressItem = {
  module_key: string;
  version: string;
  completed_at: string;
};

export type OnboardingProgressResponse = {
  modules: OnboardingProgressItem[];
};

export type CompleteOnboardingModuleResponse = {
  success: true;
  module_key: string;
  version: string;
  completed_at: string;
};
