// @ts-check
// HU-01 + alta-v2 — catálogo con cuadre EXACTO, alta que arranca VACÍA (4.2) y vista
// "Registrados" con "Ver info del contrato" en SOLO LECTURA (punto 2). Con LOGIN REAL.
//  - clave capturable por concepto; importe ⇄ PU bidireccional; monto DERIVADO (Σ importes).
//  - el contrato nuevo arranca sin conceptos dummy.
//  - tras guardar, "Ver info del contrato" abre el detalle de solo lectura.
// Requiere backend+BD.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, altaLlenarDatosGenerales, altaAgregarConcepto, altaAdjuntarPdfFirmado } from './_helpers.js';

test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

test.describe('HU-01/alta-v2 — catálogo, alta vacía y Registrados', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente'); // HU-01 = E (editable) para residente
    await goToViaSidebar(page, '/contratos/alta');
  });

  test('4.2 el alta arranca VACÍA (sin folio ni conceptos dummy)', async ({ page }) => {
    await expect(page.getByTestId('dg-folio')).toHaveValue('');
    await altaLlenarDatosGenerales(page);
    await page.getByTestId('btn-siguiente').click();          // → catálogo
    await expect(page.getByText('Sin conceptos.')).toBeVisible();
    await expect(page.getByTestId('concepto-clave-0')).toHaveCount(0);
  });

  test('clave + importe⇄PU bidireccional + cuadre exacto + monto derivado', async ({ page }) => {
    await altaLlenarDatosGenerales(page);
    await page.getByTestId('btn-siguiente').click();          // → catálogo
    await altaAgregarConcepto(page, 0, { clave: 'EXC-01', cantidad: 1250, pu: 200 });

    const pu0 = page.getByTestId('concepto-pu-0');
    const imp0 = page.getByTestId('concepto-importe-0');
    // PU → importe = ROUND(cantidad × PU, 2)
    expect(Number(await imp0.inputValue())).toBeCloseTo(250000, 2); // 1250 × 200
    // importe → back-solve PU (4 dec); el importe snapea al real
    await imp0.fill('300000');
    await imp0.blur();
    expect(Number(await pu0.inputValue())).toBeCloseTo(240, 4);     // round4(300000/1250)
    expect(Number(await imp0.inputValue())).toBeCloseTo(300000, 2);
    // indicador de cuadre exacto
    await expect(page.getByTestId('catalogo-indicador')).toContainText('Cuadre exacto');
    // monto derivado, read-only, en Datos generales
    await page.getByRole('button', { name: 'Datos generales' }).click();
    const monto = page.getByTestId('monto-derivado');
    await expect(monto).toHaveAttribute('readonly', '');
    expect(await monto.inputValue()).toContain('$');
  });

  test('2.1/2.2 guardar (PDF firmado obligatorio) y "Ver info del contrato" en SOLO LECTURA', async ({ page }) => {
    page.on('dialog', (d) => d.accept()); // confirma "¿Seguro de guardar el contrato?"
    const folio = `E2E-VER-${Date.now()}`;
    await altaLlenarDatosGenerales(page, { folio });
    await page.getByTestId('btn-siguiente').click();          // catálogo
    await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 });
    await page.getByTestId('btn-siguiente').click();          // programa
    await page.getByTestId('celda-0-1').fill('100');          // 100% (plazo 60 → 2 periodos; todo en P1)
    await page.getByTestId('btn-siguiente').click();          // jurídicos
    await page.getByTestId('btn-siguiente').click();          // garantías
    await page.getByTestId('btn-siguiente').click();          // PDF firmado (último paso)
    // alta-v3: sin PDF firmado el guardado está BLOQUEADO; adjuntarlo lo habilita.
    await expect(page.getByTestId('btn-guardar')).toBeDisabled();
    await altaAdjuntarPdfFirmado(page);
    await expect(page.getByTestId('btn-guardar')).toBeEnabled();
    await page.getByTestId('btn-guardar').click();            // guardar
    // tras guardar: contrato creado CON su PDF firmado → botón de consulta.
    await expect(page.getByTestId('btn-ver-registrados')).toBeVisible();

    // Registrados → abrir el detalle del contrato recién creado (el botón post-guardado navega ahí)
    await page.getByTestId('btn-ver-registrados').click();
    const fila = page.locator('tr', { hasText: folio });
    await expect(fila).toBeVisible();
    await fila.locator('[data-testid^="ver-info-"]').click();
    const modal = page.getByTestId('modal-detalle');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(folio).first()).toBeVisible();
    await expect(modal.getByText('solo lectura')).toBeVisible();
    // cerrar
    await page.getByTestId('modal-detalle-cerrar').click();
    await expect(modal).toHaveCount(0);
  });
});
