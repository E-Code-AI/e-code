/**
 * AI UX Feature Flag Tests
 */

import { defaultFeatureFlags, getFeatureFlags } from '../server/config/feature-flags';
import { testRunner } from './setup/test-runner';

const originalEnv = { ...process.env };
const overrideKeys = [
  'FEATURE_AI_UX_IMPROVE_PROMPT',
  'FEATURE_AI_UX_EXTENDED_THINKING',
  'FEATURE_AI_UX_HIGH_POWER_MODE',
  'FEATURE_AI_UX_PROGRESS_TAB',
  'FEATURE_AI_UX_PAUSE_RESUME'
];

const resetEnv = () => {
  for (const key of overrideKeys) {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    } else {
      delete process.env[key];
    }
  }
};

testRunner.registerSuite('AI UX Feature Flags', {
  setup: async () => {
    resetEnv();
  },
  teardown: async () => {
    resetEnv();
  },
  tests: [
    {
      name: 'should have default feature flags disabled',
      fn: async () => {
        expect(defaultFeatureFlags.aiUx.improvePrompt).toBe(false);
        expect(defaultFeatureFlags.aiUx.extendedThinking).toBe(false);
        expect(defaultFeatureFlags.aiUx.highPowerMode).toBe(false);
        expect(defaultFeatureFlags.aiUx.progressTab).toBe(false);
        expect(defaultFeatureFlags.aiUx.pauseResume).toBe(false);
      }
    },
    {
      name: 'should respect environment variable overrides',
      fn: async () => {
        process.env.FEATURE_AI_UX_IMPROVE_PROMPT = 'true';
        process.env.FEATURE_AI_UX_EXTENDED_THINKING = 'true';
        process.env.FEATURE_AI_UX_HIGH_POWER_MODE = 'true';
        process.env.FEATURE_AI_UX_PROGRESS_TAB = 'true';
        process.env.FEATURE_AI_UX_PAUSE_RESUME = 'true';

        const featureFlags = getFeatureFlags();

        expect(featureFlags.aiUx.improvePrompt).toBe(true);
        expect(featureFlags.aiUx.extendedThinking).toBe(true);
        expect(featureFlags.aiUx.highPowerMode).toBe(true);
        expect(featureFlags.aiUx.progressTab).toBe(true);
        expect(featureFlags.aiUx.pauseResume).toBe(true);
      }
    },
    {
      name: 'should not mutate default feature flags when overriding env variables',
      fn: async () => {
        process.env.FEATURE_AI_UX_IMPROVE_PROMPT = 'true';
        getFeatureFlags();

        expect(defaultFeatureFlags.aiUx.improvePrompt).toBe(false);
      }
    }
  ]
});
