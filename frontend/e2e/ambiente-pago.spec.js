// @ts-check
// AMBIENTE DE PAGO (sesión grande 18-jun, BLOQUE B) — cascarón del ciclo de cobro que ENVUELVE HU-20/HU-21
// SIN fundir las HU: estimación autorizada (HU-15) → tránsito a pago (HU-20, ya funcional) → instrucción →
// registro (HU-21) → cierre (finiquito HU-24). Ruta NUEVA /pagos/ambiente, fuera del catálogo (SoloRol, NO
// toca permisos.js). LOGIN REAL → se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, sidebarLinkFor } from './_helpers.js';

const skipEnCI = () => test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');
const VIEW = '/pagos/ambiente';
const TITULO = 'Ambiente de pago de la estimación (ciclo de cobro, por bloques)';
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';

// --- Roles con acceso (HU-20/HU-21: finanzas, contratista, residente, dependencia) ---
for (const rol of ['finanzas', 'contratista', 'residente', 'dependencia']) {
  test.describe(`Ambiente pago — ${rol} (con acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol);
    });

    test('el link aparece en el Sidebar y el cascarón carga con sus 5 bloques y enlaces reales', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW)).toBeVisible();
      await goToViaSidebar(page, VIEW);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-contrato')).toBeVisible();
      for (let n = 1; n <= 5; n++) {
        await expect(page.getByTestId(`bloque-pago-${n}`)).toBeVisible();
      }
      await expect(page.getByTestId('link-transito')).toHaveAttribute('href', /\/pagos\/transito/);
      await expect(page.getByTestId('link-registro')).toHaveAttribute('href', /\/pagos\/registro/);
    });
  });
}

// --- Supervisión: null en HU-20 y HU-21 → fuera del ambiente ---
test.describe('Ambiente pago — supervisión (sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    skipEnCI();
    await freshHome(page);
    await enterAppMode(page, 'supervision');
  });

  test('no aparece el link y la ruta rebota a Inicio (SoloRol)', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW}"]`)).toHaveCount(0);
    await page.goto(`http://localhost:5173${VIEW}`);
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByRole('heading', { name: TITULO })).toHaveCount(0);
  });
});

// --- El finiquito (SoloRol) se gatea por rol: dependencia ve el enlace; contratista ve nota informativa ---
test.describe('Ambiente pago — gate del enlace al finiquito', () => {
  test('contratista NO ve el enlace al finiquito (lo elaboran dependencia/residencia)', async ({ page }) => {
    skipEnCI();
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, VIEW);
    await expect(page.getByTestId('finiquito-informativo')).toBeVisible();
    await expect(page.getByTestId('link-finiquito')).toHaveCount(0);
  });
});

// --- Con el contrato sembrado: la estimación autorizada siembra el ciclo ---
test.describe('Ambiente pago — estimación autorizada con el contrato demo', () => {
  test('finanzas elige el contrato demo y ve la estimación autorizada lista para tránsito', async ({ page, request }) => {
    skipEnCI();
    const login = await (await request.post(`${API}/auth/login`, { data: { email: 'finanzas@sigecop.test', password: PASS } })).json();
    const contratos = await (await request.get(`${API}/contratos`, { headers: { Authorization: `Bearer ${login.token}` } })).json();
    const demo = (Array.isArray(contratos) ? contratos : []).find((c) => c.folio === 'OBRA-2026-DEMO-01');
    test.skip(!demo, 'requiere el seed demo (npm run seed:demo)');

    await freshHome(page);
    await enterAppMode(page, 'finanzas');
    await goToViaSidebar(page, VIEW);
    await page.getByTestId('select-contrato').selectOption({ value: String(demo.id) });
    await expect(page.getByTestId('estimaciones-autorizadas')).toContainText('tránsito a pago', { timeout: 10000 });
  });
});
