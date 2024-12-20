import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      provider: 'playwright',
      enabled: true,
      headless: true,
      name: 'chromium',
      screenshotFailures: false,
    },
    coverage: {
      provider: 'istanbul',
      include: ['src/**'],
    },
  },
});
