// @ts-check
// FASE 3 (rediseño por bloques) — el "Recorrido por bloques" de estimación DEJÓ de ser una pantalla
// aparte: el flujo de "Nueva estimación" YA ES el WIZARD de pasos (IntegracionEstimacion,
// /estimaciones/integracion). La ruta del cascarón (/estimaciones/ambiente) se conserva pero REDIRIGE
// al wizard (App.jsx congelado: cero rutas nuevas). Antes este spec probaba los 7 bloques del cascarón;
// ahora prueba el redirect + que el wizard real es lo que se muestra. LOGIN REAL (backend+BD). No CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode } from './_helpers.js';

test.skip(!!process.env.CI, 'FASE 3: login real requiere backend+BD; se corre en local');

test.describe('FASE 3 — el ambiente de estimación ES el wizard (redirect del cascarón)', () => {
  test('/estimaciones/ambiente redirige al wizard "Nueva estimación" (pasos), sin el cascarón viejo', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista'); // superintendente: ejecuta el flujo de estimación (HU-12)
    await page.goto('/estimaciones/ambiente');
    await page.waitForLoadState('networkidle');

    // Redirige al wizard: la URL termina en /estimaciones/integracion y carga su selector de contrato.
    await expect(page).toHaveURL(/\/estimaciones\/integracion$/);
    await expect(page.getByTestId('select-contrato')).toBeVisible();

    // El cascarón viejo (aviso + 7 bloques + placeholders) ya NO existe.
    await expect(page.getByTestId('ambiente-cascaron-aviso')).toHaveCount(0);
    await expect(page.getByTestId('bloque-est-1')).toHaveCount(0);

    // Al elegir un contrato aparece la BARRA DE PASOS del wizard (Periodo → … → Integrar).
    const sel = page.getByTestId('select-contrato');
    if (await sel.locator('option').count() > 1) {
      await sel.selectOption({ index: 1 });
      await expect(page.getByTestId('wizard-estimacion-pasos')).toBeVisible();
      await expect(page.getByTestId('wpaso-periodo')).toBeVisible();
      await expect(page.getByTestId('wpaso-integrar')).toBeVisible();
    }
  });
});
