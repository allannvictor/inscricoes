import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

/**
 * Teste de ponta a ponta em modo simulado. Precisa do banco local migrado e com `npm run db:seed`.
 *
 * Servidor:
 * - Padrão (máquina local): `next dev`, prático enquanto se mexe no código.
 * - No CI, ou com E2E_PRODUCAO=1: a versão compilada (`next start`, rode `npm run build` antes),
 *   imitando a homologação. É mais estável: o modo dev recompila páginas no meio dos testes.
 */
const producao = !!process.env.CI || process.env.E2E_PRODUCAO === '1';
const comum = { LOGIN_CODIGO_TESTE: '123456', MP_ACCESS_TOKEN: '', MP_CLIENT_ID: '', GOOGLE_CLIENT_ID: '', ADMIN_EMAILS: 'master@exemplo.com', PRE_LANCAMENTO: '' };
const comoHomologacao = { VERCEL_ENV: 'preview', PERMITIR_SIMULADO: '1', DATABASE_URL_PREVIEW: process.env.DATABASE_URL ?? '' };

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
    // Opcional: usar um Chromium já instalado (ex.: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  // Os mesmos testes no celular e num monitor de computador (1366 px).
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'computador', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command: producao ? 'npx next start -p 3100' : 'npx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: producao ? { ...comum, ...comoHomologacao } : comum,
  },
});
