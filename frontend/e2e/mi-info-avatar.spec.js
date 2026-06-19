// @ts-check
// FIX 2.4 (Oleada 2) — dropdown "mi info / mi empresa" del avatar. GET /api/yo trae nombre, rol, correo y la
// empresa (nombre + tipo + estado), que antes el front no recibía. Reusa el mecanismo de pop-up de la campana.
// Login real → requiere backend+BD; se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode } from './_helpers.js';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

test.describe('FIX 2.4 — mi info / mi empresa (dropdown del avatar)', () => {
  test('el avatar abre el pop-up con correo y empresa; NO navega; cierra con backdrop', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    const urlAntes = page.url();

    await page.getByTestId('btn-mi-info').click();
    await expect(page.getByTestId('drop-miinfo')).toBeVisible();
    // Correo del usuario autenticado (de GET /api/yo), hoy inaccesible desde el JWT.
    await expect(page.getByTestId('mi-info-correo')).toContainText('contratista@sigecop.test');
    // Sección de empresa presente (nombre+tipo+estado, o "Sin empresa asignada").
    await expect(page.getByTestId('mi-info-empresa')).toBeVisible();
    // El pop-up NO navega (misma URL).
    expect(page.url(), 'el pop-up no navega').toBe(urlAntes);

    // Cierra al hacer clic afuera.
    await page.getByTestId('drop-backdrop').click({ position: { x: 6, y: 6 } });
    await expect(page.getByTestId('drop-miinfo')).toHaveCount(0);
  });

  test('la campana sigue funcionando (no se rompió con el avatar-botón)', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await page.getByRole('button', { name: /Notificaciones/ }).click();
    await expect(page.getByTestId('drop-campana')).toBeVisible();
  });
});
