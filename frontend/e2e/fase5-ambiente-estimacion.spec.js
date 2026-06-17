// @ts-check
// FASE 5 (revisión profe 16-jun) — AMBIENTE DE ESTIMACIÓN por bloques (CASCARÓN).
// El profe: "aíslalo en un contexto… empiezas por los generadores… la carátula te dice lo que vas a
// cobrar… adjunta soportes/notas/fotos… cerrar, candadito… a revisión. El historial va aparte."
// Este ambiente ENVUELVE el flujo existente (no lo reescribe): la carátula la calcula el backend
// (estimacion-prep, la misma de HU-12); el bloque de generadores y el de soportes/fotos son
// PLACEHOLDERS marcados pendientes de Equipo 3; la integración/envío reales se delegan a HU-12/HU-13.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'FASE 5: login real requiere backend+BD; se corre en local');

const SEED = 'OBRA-2026-DEMO-01';

test.describe('FASE 5 — ambiente de estimación por bloques (cascarón)', () => {
  test('los 7 bloques se muestran; generadores y soportes son placeholders E3; la carátula es automática', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/estimaciones/ambiente');

    // Aviso de cascarón + los 7 bloques estructurados (tipo el alta).
    await expect(page.getByTestId('ambiente-cascaron-aviso')).toBeVisible();
    for (let n = 1; n <= 7; n++) {
      await expect(page.getByTestId(`bloque-est-${n}`)).toBeVisible();
    }

    // Bloques pendientes de Equipo 3 marcados.
    await expect(page.getByTestId('generadores-placeholder')).toContainText('Pendiente del Equipo 3');
    await expect(page.getByTestId('pendiente-e3-2')).toBeVisible();
    await expect(page.getByTestId('soportes-placeholder')).toContainText('pendiente');

    // Envío delega al flujo real (HU-12 / HU-13) — el historial NO vive aquí.
    await expect(page.getByTestId('link-integrar')).toBeVisible();
    await expect(page.getByTestId('link-presentar')).toBeVisible();

    // Selección de contrato + periodo → la carátula AUTOMÁTICA (la existente) se muestra.
    const val = await page.locator('[data-testid="select-contrato"] option', { hasText: SEED }).first().getAttribute('value');
    await page.getByTestId('select-contrato').selectOption(val);
    await page.getByTestId('select-periodo').selectOption({ index: 1 });
    await expect(page.getByTestId('caratula-automatica')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('caratula-disponibles')).toContainText('concepto');

    // Candado de cierre.
    await expect(page.getByTestId('check-cierre')).toBeEnabled();
  });
});
