// @ts-check
// E2E Pasada F — Sustitución de personas del roster (/contratos/roster). Ruta SoloRol (fuera del
// catálogo de HU): la ven dependencia y residente; el resto NO. Estructural, con LOGIN REAL.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode } from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/contratos/roster';
const TITULO = 'Sustitución de personas del roster';

// --- Autoridad: dependencia y residente ven el link y la página carga ---
for (const rol of [{ id: 'dependencia', alias: 'Dependencia' }, { id: 'residente', alias: 'Residente' }]) {
  test.describe(`Roster — ${rol.alias} (autoridad)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('el link "Sustitución de personas" aparece y la página carga con el selector de contrato', async ({ page }) => {
      const link = page.locator(`aside a[href="${VIEW_PATH}"]`);
      await expect(link).toBeVisible();
      await link.click();
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('roster-contrato')).toBeVisible();
    });
  });
}

// --- Sin acceso: contratista, supervisión y finanzas NO ven el link (SoloRol) ---
for (const rol of [{ id: 'contratista', alias: 'Contratista' }, { id: 'supervision', alias: 'Supervisión' }, { id: 'finanzas', alias: 'Finanzas' }]) {
  test.describe(`Roster — ${rol.alias} (sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('NO aparece el link al roster en el Sidebar', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
