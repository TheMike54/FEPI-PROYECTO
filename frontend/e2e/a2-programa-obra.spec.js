// @ts-check
// A2 + alta-v2 (punto 3) — Programa de obra = matriz CONCEPTO × PERIODO con la REGLA DEL 100%.
// Σ planeado por concepto debe IGUALAR lo contratado (RLOPSRM art. 45-A-X + LOPSRM art. 52);
// el faltante y el exceso bloquean. Flujo con LOGIN REAL: la app arranca vacía, así que se
// capturan datos generales + 1 concepto antes de llegar al programa. Requiere backend+BD.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, altaLlenarDatosGenerales, altaAgregarConcepto } from './_helpers.js';

test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

test.describe('A2/alta-v2 — programa de obra: regla del 100%', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');          // HU-01 = E (editable) para residente
    await goToViaSidebar(page, '/contratos/alta');
    await altaLlenarDatosGenerales(page, { plazo: 60, fechaInicio: '2026-06-01' }); // → 2 periodos mensual
    await page.getByTestId('btn-siguiente').click();        // → catálogo (paso 1)
    await altaAgregarConcepto(page, 0, { clave: 'A1', cantidad: 100, pu: 50 });
    await page.getByTestId('btn-siguiente').click();        // → programa (paso 2)
  });

  test('el ciclo genera periodos (columnas) y el quincenal da más que el mensual', async ({ page }) => {
    const ciclo = page.getByTestId('select-ciclo');
    const count = page.getByTestId('periodos-count');
    await expect(ciclo).toHaveValue('mensual');
    await expect(count).toContainText('2 periodo');         // plazo 60, mensual → 2 periodos
    await expect(page.getByTestId('celda-0-1')).toBeVisible();
    await ciclo.selectOption('quincenal');                  // cada 15 días → más columnas
    await expect(count).toContainText('4 periodo');         // 60 / 15 → 4 periodos
    await expect(page.getByTestId('celda-0-4')).toBeVisible();
  });

  test('regla del 100%: faltante bloquea (descuadre), cuadre habilita, exceso bloquea', async ({ page }) => {
    const restante = page.getByTestId('restante-0');
    // Contratado 100, nada asignado → restante 100 y descuadre.
    await expect(restante).toHaveText('100');
    await expect(page.getByTestId('programa-descuadre')).toBeVisible();

    // Parcial (60) → restante 40, SIGUE descuadre (la regla nueva NO permite parcial).
    await page.getByTestId('celda-0-1').fill('60');
    await expect(restante).toHaveText('40');
    await expect(page.getByTestId('programa-descuadre')).toBeVisible();
    await expect(page.getByTestId('programa-cuadra')).toHaveCount(0);

    // Completar al 100% (60 + 40) → restante 0 y CUADRA.
    await page.getByTestId('celda-0-2').fill('40');
    await expect(restante).toHaveText('0');
    await expect(page.getByTestId('programa-cuadra')).toBeVisible();
    await expect(page.getByTestId('programa-descuadre')).toHaveCount(0);

    // Exceso (> contratado) → vuelve a descuadre.
    await page.getByTestId('celda-0-2').fill('200');
    await expect(page.getByTestId('programa-descuadre')).toBeVisible();
  });

  test('avanzar/guardar bloqueado si el programa no cuadra al 100%', async ({ page }) => {
    // Parcial → al pulsar Siguiente NO avanza (sigue en programa) y aparece el banner persistente.
    await page.getByTestId('celda-0-1').fill('60');
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByTestId('error-wizard')).toContainText('100%');
    // Aún en el paso programa (la matriz sigue visible).
    await expect(page.getByTestId('select-ciclo')).toBeVisible();
  });
});
