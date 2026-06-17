// @ts-check
// AMBIENTE DE CIERRE / FINIQUITO (sesión grande 18-jun, BLOQUE B) — cascarón que ENVUELVE HU-24 SIN fundir
// las HU y DELEGA el cierre a /contratos/finiquito (no ejecuta cerrarFiniquito por su cuenta). Ruta NUEVA
// /contratos/cierre, fuera del catálogo (SoloRol, NO toca permisos.js). LOGIN REAL → se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, sidebarLinkFor } from './_helpers.js';

const skipEnCI = () => test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');
const VIEW = '/contratos/cierre';
const TITULO = 'Ambiente de cierre del contrato (finiquito, por bloques)';
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';

// --- Roles con acceso (HU-24: dependencia, residente) ---
for (const rol of ['dependencia', 'residente']) {
  test.describe(`Ambiente cierre — ${rol} (con acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol);
    });

    test('el link aparece en el Sidebar y el cascarón carga con sus 7 bloques', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW)).toBeVisible();
      await goToViaSidebar(page, VIEW);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-contrato')).toBeVisible();
      for (let n = 1; n <= 7; n++) {
        await expect(page.getByTestId(`bloque-cierre-${n}`)).toBeVisible();
      }
    });
  });
}

// --- Roles sin acceso (contratista, supervisión, finanzas) ---
for (const rol of ['contratista', 'supervision', 'finanzas']) {
  test.describe(`Ambiente cierre — ${rol} (sin acceso)`, () => {
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

// --- Con el contrato sembrado: saldo en vivo + el cierre delega a HU-24 ---
test.describe('Ambiente cierre — saldo y delegación con el contrato demo', () => {
  test('el residente elige el contrato demo (con bitácora) y ve el saldo + enlace a elaborar el finiquito', async ({ page, request }) => {
    skipEnCI();
    const login = await (await request.post(`${API}/auth/login`, { data: { email: 'residente@sigecop.test', password: PASS } })).json();
    const contratos = await (await request.get(`${API}/contratos`, { headers: { Authorization: `Bearer ${login.token}` } })).json();
    const demo = (Array.isArray(contratos) ? contratos : []).find((c) => c.folio === 'OBRA-2026-DEMO-01');
    test.skip(!demo, 'requiere el seed demo (npm run seed:demo)');

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, VIEW);
    await page.getByTestId('select-contrato').selectOption({ value: String(demo.id) });

    // El demo tiene bitácora abierta → bloque 2 listo y el cierre delega a HU-24 (enlace habilitado).
    await expect(page.getByTestId('saldo-finiquito')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('link-cerrar')).toBeVisible();
    await expect(page.getByTestId('link-cerrar')).toHaveAttribute('href', /\/contratos\/finiquito/);
    await expect(page.getByTestId('link-cerrar')).not.toHaveClass(/pointer-events-none/);
  });
});
