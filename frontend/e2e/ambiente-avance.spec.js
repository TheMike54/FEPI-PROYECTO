// @ts-check
// AMBIENTE DE AVANCE Y SEGUIMIENTO (sesión grande 18-jun, BLOQUE B) — cascarón que ENCADENA HU-06→HU-05→
// HU-07 SIN fundir las HU. Ruta NUEVA /seguimiento/ambiente, fuera del catálogo (SoloRol, NO toca
// permisos.js). Roles: contratista/residente/supervisión (NO 'superintendente', no existe; = contratista);
// dependencia (con 'C' en HU-05) queda fuera por decisión. LOGIN REAL → se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode } from './_helpers.js';

const skipEnCI = () => test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');
const VIEW = '/seguimiento/ambiente';
const TITULO = 'Ambiente de avance físico y seguimiento (por bloques)';
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';

// --- Roles con acceso (contratista, residente, supervisión) ---
for (const rol of ['contratista', 'residente', 'supervision']) {
  test.describe(`Ambiente avance — ${rol} (con acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol);
    });

    test('el cascarón carga (por URL) con sus 5 bloques (el 5 placeholder E2)', async ({ page }) => {
      await page.goto(`http://localhost:5173${VIEW}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-contrato')).toBeVisible();
      for (let n = 1; n <= 5; n++) {
        await expect(page.getByTestId(`bloque-avance-${n}`)).toBeVisible();
      }
      await expect(page.getByTestId('link-trabajos')).toHaveAttribute('href', /\/seguimiento\/trabajos-terminados/);
      await expect(page.getByTestId('link-alertas')).toHaveAttribute('href', /\/seguimiento\/alertas/);
      await expect(page.getByTestId('evidencia-placeholder')).toBeVisible(); // bloque 5 = pendiente E2
    });
  });
}

// --- Roles sin acceso (dependencia, finanzas) ---
for (const rol of ['dependencia', 'finanzas']) {
  test.describe(`Ambiente avance — ${rol} (sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol);
    });

    test('no aparece el link y la ruta rebota a Inicio (SoloRol)', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW}"]`)).toHaveCount(0);
      await page.goto(`http://localhost:5173${VIEW}`);
      await expect(page).toHaveURL(/\/$|\/\?/);
      await expect(page.getByRole('heading', { name: TITULO })).toHaveCount(0);
    });
  });
}

// --- Con el contrato sembrado: los KPIs de avance salen de la misma fuente que la curva ---
test.describe('Ambiente avance — KPIs con el contrato demo', () => {
  test('el contratista elige el contrato demo y ve los KPIs de avance (físico/programado/financiero)', async ({ page, request }) => {
    skipEnCI();
    const login = await (await request.post(`${API}/auth/login`, { data: { email: 'contratista@sigecop.test', password: PASS } })).json();
    const contratos = await (await request.get(`${API}/contratos`, { headers: { Authorization: `Bearer ${login.token}` } })).json();
    const demo = (Array.isArray(contratos) ? contratos : []).find((c) => c.folio === 'OBRA-2026-DEMO-01');
    test.skip(!demo, 'requiere el seed demo (npm run seed:demo)');

    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await page.goto(`http://localhost:5173${VIEW}`);
    await page.waitForLoadState('networkidle');
    await page.getByTestId('select-contrato').selectOption({ value: String(demo.id) });
    await expect(page.getByTestId('kpis-avance')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('programa-periodos')).toContainText('periodo');
  });
});
