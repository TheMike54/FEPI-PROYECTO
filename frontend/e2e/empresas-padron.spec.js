// @ts-check
// PLAN GRANDE BLOQUE 1 — PADRÓN DE EMPRESAS (administración). Solo la Dependencia (art. 43 RLOPSRM).
// Pantalla NUEVA /admin/empresas. LOGIN REAL → se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, sidebarLinkFor } from './_helpers.js';

const skipEnCI = () => test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');
const VIEW = '/admin/empresas';

test.describe('Padrón de empresas — Dependencia (administra)', () => {
  test.beforeEach(async ({ page }) => { skipEnCI(); await freshHome(page); await enterAppMode(page, 'dependencia'); });

  test('el link aparece y la pantalla carga con sus 3 pestañas y el padrón', async ({ page }) => {
    await expect(await sidebarLinkFor(page, VIEW)).toBeVisible();
    await goToViaSidebar(page, VIEW);
    await expect(page.getByRole('heading', { name: 'Padrón de empresas (administración)' })).toBeVisible();
    await expect(page.getByTestId('tab-padron')).toBeVisible();
    await expect(page.getByTestId('tab-porvalidar')).toBeVisible();
    await expect(page.getByTestId('tab-dependencias')).toBeVisible();
    // El padrón lista empresas privadas; "Constructora Demo" (validada) debe aparecer.
    await expect(page.getByTestId('panel-padron')).toContainText('Constructora Demo', { timeout: 10000 });
    // La pestaña de dependencias separa la entidad pública.
    await page.getByTestId('tab-dependencias').click();
    await expect(page.getByTestId('panel-dependencias')).toContainText('Dependencia Demo');
  });
});

// --- Sin acceso (otros roles): no aparece el link y la ruta rebota ---
for (const rol of ['residente', 'contratista', 'supervision', 'finanzas']) {
  test.describe(`Padrón de empresas — ${rol} (sin acceso)`, () => {
    test.beforeEach(async ({ page }) => { skipEnCI(); await freshHome(page); await enterAppMode(page, rol); });
    test('no aparece el link y la ruta rebota a Inicio (SoloRol)', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW}"]`)).toHaveCount(0);
      await page.goto(`http://localhost:5173${VIEW}`);
      await expect(page).toHaveURL(/\/$|\/\?/);
      await expect(page.getByRole('heading', { name: 'Padrón de empresas (administración)' })).toHaveCount(0);
    });
  });
}
