// @ts-check
import { defineConfig, devices } from '@playwright/test';

// Configuracion base de @playwright/test para la suite E2E de SIGECOP.
//
// webServer.reuseExistingServer:
//   - LOCAL (process.env.CI no definido): true → reusa el dev server que ya
//     este arriba en :5173 (caso Docker: `docker compose up frontend`).
//   - CI (process.env.CI === 'true', p.ej. GitHub Actions): false → siempre
//     spawnea `npm run dev` desde cero. En CI no hay Docker ni server previo,
//     y false evita falsos positivos por algun proceso colgado.
//
// reporter:
//   - LOCAL: 'list' + 'html' (este ultimo con open:'never' para no abrir el
//     navegador automaticamente).
//   - CI: 'github' (anotaciones inline en el PR) + 'html' (genera el reporte
//     que el workflow sube como artifact cuando algo falla).

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,            // las pruebas comparten un estado de UI (modo/rol); evitar carreras
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,                      // un solo worker mientras la suite sea pequena
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'],   ['html', { open: 'never' }]],
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
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
