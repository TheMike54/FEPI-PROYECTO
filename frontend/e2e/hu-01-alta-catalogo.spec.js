// @ts-check
// HU-01 (Paquete A1.3): catálogo de conceptos con cuadre EXACTO.
//  - clave capturable por concepto (obligatoria).
//  - captura bidireccional importe ⇄ PU.
//  - el monto del contrato se DERIVA (Σ importes); ya no hay campo de monto.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.describe('HU-01 Alta — catálogo con cuadre exacto (A1.3)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente'); // HU-01 = E (editable) para residente
    await goToViaSidebar(page, '/contratos/alta');
    await page.getByRole('button', { name: 'Catálogo de conceptos' }).click();
  });

  test('clave por concepto + importe⇄PU bidireccional + indicador de cuadre', async ({ page }) => {
    const clave0 = page.getByTestId('concepto-clave-0');
    const cant0 = page.getByTestId('concepto-cantidad-0');
    const pu0 = page.getByTestId('concepto-pu-0');
    const imp0 = page.getByTestId('concepto-importe-0');

    await expect(clave0).toHaveValue('EXC-01');     // clave del dummy
    await expect(cant0).toHaveValue('1250');

    // (1) tecleo PU -> importe = ROUND(cantidad × PU, 2)
    await pu0.fill('200');
    expect(Number(await imp0.inputValue())).toBeCloseTo(250000, 2); // 1250 × 200

    // (2) tecleo importe -> back-solve PU (4 decimales); el importe snapea al real
    await imp0.fill('300000');
    await imp0.blur();
    expect(Number(await pu0.inputValue())).toBeCloseTo(240, 4);     // round4(300000/1250)
    expect(Number(await imp0.inputValue())).toBeCloseTo(300000, 2);

    // (3) PU periódico: importe 6,000,000 / 180 -> PU 33333.3333, importe REAL 5,999,999.99
    await cant0.fill('180');
    await imp0.fill('6000000');
    await imp0.blur();
    expect(Number(await pu0.inputValue())).toBeCloseTo(33333.3333, 4);
    expect(Number(await imp0.inputValue())).toBeCloseTo(5999999.99, 2); // NO 6,000,000

    // (4) indicador de cuadre exacto + monto derivado (Σ importes)
    await expect(page.getByTestId('catalogo-indicador')).toContainText('Cuadre exacto');
    await expect(page.getByTestId('catalogo-total')).toBeVisible();
  });

  test('campo monto eliminado: en Datos generales el monto es DERIVADO y read-only', async ({ page }) => {
    await page.getByRole('button', { name: 'Datos generales' }).click();
    const monto = page.getByTestId('monto-derivado');
    await expect(monto).toBeVisible();
    await expect(monto).toHaveAttribute('readonly', '');
    expect(await monto.inputValue()).toContain('$'); // Σ importes formateado como moneda
  });

  // Nota: la obligatoriedad de la clave se valida también en el backend (A1.2:
  // "concepto sin clave → 400"). No se cubre aquí porque en modo demostración no hay
  // superintendente asignable (sin token), y validar() corta antes en esa regla.
});
