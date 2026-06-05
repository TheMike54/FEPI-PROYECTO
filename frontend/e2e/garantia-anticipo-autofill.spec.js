// @ts-check
// Plan2 Pase3 — ALTA / paso "Garantías": al elegir tipo de póliza = ANTICIPO, el monto se AUTO-LLENA
// (read-only) = (% de anticipo) × (monto del contrato). Ejemplo guía: 30% de $1,000,000 = $300,000.
//
// NO toca el gating/100%/cuadre del alta (núcleo G1-G8): este spec solo verifica el auto-fill en el
// paso de garantías (no intenta avanzar/guardar). LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos,
} from './_helpers.js';

test.skip(!!process.env.CI, 'Plan2 Pase3: login real requiere backend+BD; se corre en local');

// Lleva el wizard al paso 4 (garantías) con un contrato de monto = $1,000,000 (1000 × $1,000).
async function irAGarantias1M(page) {
  await altaLlenarDatosGenerales(page, { plazo: 60, fechaInicio: '2026-06-01' });
  await page.getByTestId('btn-siguiente').click();                  // → catálogo (1)
  await altaAgregarConcepto(page, 0, { cantidad: 1000, pu: 1000 }); // monto = 1,000,000
  await page.getByTestId('btn-siguiente').click();                  // → programa (2)
  await page.getByTestId('celda-0-1').fill('1000');                 // cuadra 100%
  await page.getByTestId('btn-siguiente').click();                  // → jurídicos (3)
  await altaLlenarJuridicos(page);
  await page.getByTestId('btn-siguiente').click();                  // → garantías (4)
}

test.describe('Plan2 Pase3 — fianza de anticipo con monto derivado (auto-fill)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');
  });

  test('30% × $1,000,000 = $300,000, read-only y reactivo al % de anticipo', async ({ page }) => {
    await irAGarantias1M(page);
    await page.getByTestId('anticipo-input').fill('30');
    await page.getByRole('button', { name: '+ Agregar póliza' }).click();
    await page.getByTestId('garantia-tipo-0').selectOption('Anticipo');

    // (a) AUTO-FILL: 30% de 1,000,000 = 300,000.
    await expect(page.getByTestId('garantia-monto-0')).toHaveValue('300000');
    // (b) READ-ONLY: el usuario no puede teclear el monto del anticipo.
    await expect(page.getByTestId('garantia-monto-0')).not.toBeEditable();
    // (c) Hint del derivado visible.
    await expect(page.getByTestId('garantia-monto-derivado-0')).toBeVisible();

    // (d) REACTIVO: cambiar el % recalcula el monto derivado (10% → 100,000).
    await page.getByTestId('anticipo-input').fill('10');
    await expect(page.getByTestId('garantia-monto-0')).toHaveValue('100000');
  });

  test('una póliza NO-anticipo conserva el monto editable a mano', async ({ page }) => {
    await irAGarantias1M(page);
    await page.getByTestId('anticipo-input').fill('30');
    await page.getByRole('button', { name: '+ Agregar póliza' }).click();
    await page.getByTestId('garantia-tipo-0').selectOption('Cumplimiento');
    // Cumplimiento: el monto es editable (no derivado).
    await expect(page.getByTestId('garantia-monto-0')).toBeEditable();
    await page.getByTestId('garantia-monto-0').fill('50000');
    await expect(page.getByTestId('garantia-monto-0')).toHaveValue('50000');
  });
});
