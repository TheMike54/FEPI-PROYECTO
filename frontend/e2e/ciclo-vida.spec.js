// @ts-check
// MACRO — CICLO DE VIDA DEL CONTRATO (sesión grande 18-jun, BLOQUE B, al final) — índice ordenado que
// ENLAZA todas las HU y los sub-ambientes en orden SIN fundirlas. Ruta NUEVA /contratos/ciclo-vida, fuera
// del catálogo (SoloRol, NO toca permisos.js). Se asevera la PRESENCIA de los Links (no la navegación: varios
// destinos dependen del rol). LOGIN REAL → se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, sidebarLinkFor } from './_helpers.js';

const skipEnCI = () => test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');
const VIEW = '/contratos/ciclo-vida';
const TITULO = 'Ciclo de vida del contrato (recorrido por bloques)';

test.describe('Ciclo de vida — residente (recorrido completo)', () => {
  test.beforeEach(async ({ page }) => {
    skipEnCI();
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('el link aparece en el Sidebar y los 14 bloques están presentes, con sus enlaces', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW)).toBeVisible();
    await goToViaSidebar(page, VIEW);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.getByTestId('select-contrato')).toBeVisible();
    // Los 14 bloques del ciclo de vida (cada uno es un enlace a su ruta/ambiente real).
    for (let n = 1; n <= 14; n++) {
      await expect(page.getByTestId(`bloque-cv-${n}`)).toBeVisible();
    }
    // El residente tiene acceso a todas las etapas → enlaces presentes y apuntando a las rutas reales / ambientes.
    await expect(page.getByTestId('link-cv-2')).toHaveAttribute('href', /\/contratos\/alta/);
    await expect(page.getByTestId('link-cv-4')).toHaveAttribute('href', /\/bitacora\/ambiente/);
    await expect(page.getByTestId('link-cv-7')).toHaveAttribute('href', /\/estimaciones\/ambiente/);
    await expect(page.getByTestId('link-cv-13')).toHaveAttribute('href', /\/contratos\/expediente-ambiente/);
    await expect(page.getByTestId('link-cv-14')).toHaveAttribute('href', /\/contratos\/cierre/);
  });
});

// --- Gating por rol: el contratista NO ejecuta la revisión (HU-15 contratista=null) → bloque 9 informativo ---
test.describe('Ciclo de vida — gating por rol (contratista)', () => {
  test('el contratista ve el bloque de revisión como informativo (sin enlace) y no ve el de finiquito', async ({ page }) => {
    skipEnCI();
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, VIEW);
    // Bloque 9 (revisión/autorización, HU-15): el contratista no la ejecuta → nota informativa, sin enlace.
    await expect(page.getByTestId('bloque-cv-9')).toBeVisible();
    await expect(page.getByTestId('info-cv-9')).toBeVisible();
    await expect(page.getByTestId('link-cv-9')).toHaveCount(0);
    // Bloque 14 (finiquito, dependencia/residente): el contratista no lo abre → informativo.
    await expect(page.getByTestId('info-cv-14')).toBeVisible();
    await expect(page.getByTestId('link-cv-14')).toHaveCount(0);
  });
});

// --- Finanzas: excluida del recorrido (su pago se muestra informativo dentro, pero no entra al ambiente) ---
test.describe('Ciclo de vida — finanzas (sin acceso)', () => {
  test('no aparece el link y la ruta rebota a Inicio (SoloRol)', async ({ page }) => {
    skipEnCI();
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
    await expect(page.locator(`aside a[href="${VIEW}"]`)).toHaveCount(0);
    await page.goto(`http://localhost:5173${VIEW}`);
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByRole('heading', { name: TITULO })).toHaveCount(0);
  });
});
