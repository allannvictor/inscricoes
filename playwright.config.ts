import { defineConfig, devices } from '@playwright/test';

/** Teste de ponta a ponta em modo simulado. Precisa do banco local migrado e com `npm run db:seed`. */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
    ...devices['Pixel 7'],
    // Opcional: usar um Chromium já instalado (ex.: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'npx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { LOGIN_CODIGO_TESTE: '123456', MP_ACCESS_TOKEN: '' },
  },
});
