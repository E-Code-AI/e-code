import { testRunner } from './setup/test-runner';

const ORIGINAL_ENV = { ...process.env } as Record<string, string | undefined>;

const resetEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
};

testRunner.registerSuite('AI UX Feature Flags', {
  afterAll: resetEnv,
  tests: [
    {
      name: 'defaultFeatureFlags disable all AI UX toggles',
      fn: async () => {
        const module = await import('../server/config/feature-flags.ts?base');
        const { defaultFeatureFlags } = module;

        expect(defaultFeatureFlags.aiUx.improvePrompt).toBe(false);
        expect(defaultFeatureFlags.aiUx.extendedThinking).toBe(false);
        expect(defaultFeatureFlags.aiUx.highPowerMode).toBe(false);
        expect(defaultFeatureFlags.aiUx.progressTab).toBe(false);
        expect(defaultFeatureFlags.aiUx.pauseResume).toBe(false);
      },
    },
    {
      name: 'getFeatureFlags reads environment overrides',
      fn: async () => {
        process.env.FEATURE_AI_UX_IMPROVE_PROMPT = 'true';
        process.env.FEATURE_AI_UX_EXTENDED_THINKING = 'true';
        process.env.FEATURE_AI_UX_HIGH_POWER_MODE = 'true';
        process.env.FEATURE_AI_UX_PROGRESS_TAB = 'false';
        process.env.FEATURE_AI_UX_PAUSE_RESUME = 'true';

        const module = await import(`../server/config/feature-flags.ts?env=${Date.now()}`);
        const flags = module.getFeatureFlags();

        expect(flags.aiUx.improvePrompt).toBe(true);
        expect(flags.aiUx.extendedThinking).toBe(true);
        expect(flags.aiUx.highPowerMode).toBe(true);
        expect(flags.aiUx.progressTab).toBe(false);
        expect(flags.aiUx.pauseResume).toBe(true);
      },
    },
    {
      name: 'featureFlags snapshot reflects current environment on import',
      fn: async () => {
        process.env.FEATURE_AI_UX_IMPROVE_PROMPT = 'true';
        process.env.FEATURE_AI_UX_EXTENDED_THINKING = 'false';
        process.env.FEATURE_AI_UX_HIGH_POWER_MODE = 'true';
        process.env.FEATURE_AI_UX_PROGRESS_TAB = 'true';
        process.env.FEATURE_AI_UX_PAUSE_RESUME = 'false';

        const module = await import(`../server/config/feature-flags.ts?snapshot=${Date.now()}`);
        const { featureFlags } = module;

        expect(featureFlags.aiUx).toEqual({
          improvePrompt: true,
          extendedThinking: false,
          highPowerMode: true,
          progressTab: true,
          pauseResume: false,
        });
      },
    },
    {
      name: 'getFeatureFlags falls back to false when env not provided',
      fn: async () => {
        delete process.env.FEATURE_AI_UX_IMPROVE_PROMPT;
        delete process.env.FEATURE_AI_UX_EXTENDED_THINKING;
        delete process.env.FEATURE_AI_UX_HIGH_POWER_MODE;
        delete process.env.FEATURE_AI_UX_PROGRESS_TAB;
        delete process.env.FEATURE_AI_UX_PAUSE_RESUME;

        const module = await import(`../server/config/feature-flags.ts?fallback=${Date.now()}`);
        const flags = module.getFeatureFlags();

        expect(flags.aiUx.improvePrompt).toBe(false);
        expect(flags.aiUx.extendedThinking).toBe(false);
        expect(flags.aiUx.highPowerMode).toBe(false);
        expect(flags.aiUx.progressTab).toBe(false);
        expect(flags.aiUx.pauseResume).toBe(false);
      },
    },
  ],
});
