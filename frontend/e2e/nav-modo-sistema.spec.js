// @ts-check
// BLOQUE 4 — navegación modo-sistema (mockup `docs/mockups/sigecop-modo-sistema.html`): el marco de
// navegación que ENVUELVE las pantallas reales SIN fundir historias. Cubre las 4 piezas:
//   1. Sidebar por FLUJOS (grupos del mockup) conservando cada HU accesible por su href.
//   2. Chip de empresa en la barra superior.
//   3. Indicador discreto de HU abajo-derecha (etiqueta tipo "HU-04").
//   4. Pop-ups de "Por firmar" y campana (dropdown, NO pantalla nueva).
// Login real → requiere backend+BD; se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

test.describe('BLOQUE 4 — navegación modo-sistema', () => {
  test('sidebar por flujos: grupos del mockup + cada HU sigue accesible por su href (no se funden)', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    const aside = page.locator('aside');
    // F5 — sidebar PLANO: grupos del mockup de ciclos ("Ciclos", "Vistas ejecutivas").
    await expect(aside.getByText('Ciclos', { exact: true })).toBeVisible();
    await expect(aside.getByText('Vistas ejecutivas', { exact: true })).toBeVisible();
    // Cada CICLO sigue identificable por su href (regla de no fundir historias).
    await expect(page.locator('aside a[href="/contratos/alta"]')).toBeVisible();          // HU-01
    await expect(page.locator('aside a[href="/estimaciones/integracion"]')).toBeVisible(); // HU-12 (ciclo)
    await expect(page.locator('aside a[href="/portafolio"]')).toBeVisible();              // HU-18
    // F5 — el ITEM de ciclo rotula el RANGO de HU del ciclo (min–max). El ciclo de estimación abarca HU 12–16.
    await expect(aside.getByText(/HU\s*12[–-]16/)).toBeVisible();
  });

  test('chip de empresa visible en la barra superior', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await expect(page.getByTestId('chip-empresa')).toBeVisible();
    await expect(page.getByTestId('chip-empresa')).toContainText('Demo'); // empresa del catálogo demo
  });

  test('indicador de HU abajo-derecha muestra la HU de la pantalla actual', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/expediente'); // HU-04
    const ind = page.getByTestId('indicador-hu');
    await expect(ind).toBeVisible();
    await expect(ind).toContainText('HU-04');
  });

  test('"Por firmar" abre un POP-UP (no navega) y cierra al hacer clic afuera', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    const urlAntes = page.url();
    await page.getByTestId('link-por-firmar').click();
    await expect(page.getByTestId('drop-firmar')).toBeVisible();
    await expect(page.getByTestId('drop-firmar-ir')).toBeVisible(); // ofrece "ir a Por firmar →"
    expect(page.url(), 'el pop-up NO navega: misma URL').toBe(urlAntes);
    await page.getByTestId('drop-backdrop').click({ position: { x: 6, y: 6 } });
    await expect(page.getByTestId('drop-firmar')).toHaveCount(0);
  });

  test('la campana abre un POP-UP de notificaciones', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await page.getByRole('button', { name: /Notificaciones/ }).click();
    await expect(page.getByTestId('drop-campana')).toBeVisible();
    await expect(page.getByTestId('drop-campana')).toContainText('atraso'); // resumen de atraso (HU-07)
  });
});
