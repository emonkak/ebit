import * as path from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    benchmark: {
      include: [],
    },
    browser: {
      headless: true,
      instances: [{ browser: 'chromium' }],
      provider: playwright(),
      screenshotFailures: false,
    },
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
    projects: [
      {
        resolve: {
          alias: {
            '@': path.join(import.meta.dirname, '/src'),
          },
        },
        test: {
          name: 'unit',
          benchmark: {
            include: ['test/unit/**/*.bench.ts'],
          },
          browser: {
            enabled: true,
          },
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          browser: {
            enabled: true,
          },
          include: ['test/integration/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'biome',
          include: ['test/biome/**/*.test.ts'],
        },
      },
      'tools/*/vitest.config.ts',
    ],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
});
