import { defaultFeatureFlags, getFeatureFlags } from '../server/config/feature-flags';
import { testRunner } from './setup/test-runner';

testRunner.registerSuite('AI UX Feature Flags', {
  tests: [
    {
      name: 'default flags disable experimental functionality',
      fn: async () => {
        expect(defaultFeatureFlags.aiUx.improvePrompt).toBe(false);
        expect(defaultFeatureFlags.aiUx.extendedThinking).toBe(false);
        expect(defaultFeatureFlags.aiUx.highPowerMode).toBe(false);
        expect(defaultFeatureFlags.aiUx.progressTab).toBe(false);
        expect(defaultFeatureFlags.aiUx.pauseResume).toBe(false);
      },
    },
    {
      name: 'environment variables enable individual flags',
      fn: async () => {
        const keys = [
          'FEATURE_AI_UX_IMPROVE_PROMPT',
          'FEATURE_AI_UX_EXTENDED_THINKING',
          'FEATURE_AI_UX_HIGH_POWER_MODE',
          'FEATURE_AI_UX_PROGRESS_TAB',
          'FEATURE_AI_UX_PAUSE_RESUME',
        ] as const;

        const originalValues = keys.map((key) => process.env[key]);

        try {
          keys.forEach((key) => {
            process.env[key] = 'true';
          });

          const flags = getFeatureFlags();
          expect(flags.aiUx.improvePrompt).toBe(true);
          expect(flags.aiUx.extendedThinking).toBe(true);
          expect(flags.aiUx.highPowerMode).toBe(true);
          expect(flags.aiUx.progressTab).toBe(true);
          expect(flags.aiUx.pauseResume).toBe(true);
        } finally {
          keys.forEach((key, index) => {
            const value = originalValues[index];
            if (value === undefined) {
              delete process.env[key];
            } else {
              process.env[key] = value;
            }
          });
        }
      },
    },
  ],
});
