import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/**'],
    restoreMocks: true,
    clearMocks: true,
    setupFiles: ['./src/testSetup.ts'],
  },
});
