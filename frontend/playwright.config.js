// @ts-check
import { defineConfig, devices } from '@playwright/test';

// Configuracion base de @playwright/test para la suite E2E de SIGECOP.
//
// webServer con reuseExistingServer: true →
//   - Si el dev server ya esta arriba (caso Docker: `docker compose up frontend`),
//     reutiliza ese servidor y los tests corren contra el.
//   - Si no, spawnea `npm run dev` local (caso dev sin Docker).
//
// Los tests asumen que la app responde en http://localhost:5173 (mapeado por
// el compose o por vite directamente).

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,            // las pruebas comparten un estado de UI (modo/rol); evitar carreras
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                      // un solo worker mientras la suite sea pequena
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1400, height: 900 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
