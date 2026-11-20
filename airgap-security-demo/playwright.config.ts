import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './tests',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 1024 },
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://localhost:${PORT}/off/`,
    reuseExistingServer: true,
    env: { PORT: String(PORT) },
  },
});
