// @ts-check
// REGRESIÓN del gating del alta: "Siguiente" NO debe avanzar si el paso actual está vacío/ inválido,
// y NUNCA debe llegarse a "Guardar" con campos vacíos. Este es el test que faltaba (la suite solo
// clicaba "Siguiente" UNA vez en el paso 0, no en bucle ni tras un guardado/reset).
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos, altaLlenarGarantias, altaAdjuntarPdfFirmado } from './_helpers.js';

test.skip(!!process.env.CI, 'alta: login real requiere backend+BD; se corre en local');

async function siguienteNveces(page, n) {
  for (let i = 0; i < n; i++) {
    const b = page.getByTestId('btn-siguiente');
    if (await b.count()) await b.click();
  }
}

test.describe('alta — regresión: "Siguiente" con campos vacíos no avanza ni llega a Guardar', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');
  });

  test('fresh: "Siguiente" repetido con TODO vacío se queda en el paso 1 (Datos generales)', async ({ page }) => {
    await siguienteNveces(page, 8);
    await expect(page.getByTestId('dg-folio')).toBeVisible();          // sigue en Datos generales
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);      // NUNCA llegó a Guardar
    await expect(page.getByTestId('error-wizard')).toBeVisible();      // banner de error visible
    // pestañas posteriores bloqueadas
    expect(await page.locator('button[data-bloqueado="true"]').count()).toBeGreaterThan(0);
  });

  test('tras guardar y empezar un alta nueva: "Siguiente" vacío sigue gateado', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    const folio = `E2E-REG-${Date.now()}`;
    await altaLlenarDatosGenerales(page, { folio });
    await page.getByTestId('btn-siguiente').click();                   // catálogo
    await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 });
    await page.getByTestId('btn-siguiente').click();                   // programa
    await page.getByTestId('celda-0-1').fill('100');
    await page.getByTestId('btn-siguiente').click();                   // jurídicos
    await altaLlenarJuridicos(page);                                   // alta-v5: obligatorios
    await page.getByTestId('btn-siguiente').click();                   // garantías
    await altaLlenarGarantias(page);                                   // alta-v5: fianza de cumplimiento
    await page.getByTestId('btn-siguiente').click();                   // PDF firmado
    await altaAdjuntarPdfFirmado(page);
    await page.getByTestId('btn-guardar').click();
    await expect(page.locator('tr', { hasText: folio })).toBeVisible(); // en Registrados
    // Nuevo alta (alta-v5: los nombres no navegan en captura → botón explícito) y machacar "Siguiente".
    await page.getByTestId('btn-nueva-alta').click();
    await siguienteNveces(page, 8);
    await expect(page.getByTestId('dg-folio')).toHaveValue('');         // vacío
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);       // NUNCA llegó a Guardar
  });

  test('con SOLO el paso 1 lleno, "Siguiente" no atraviesa catálogo/programa vacíos hasta Guardar', async ({ page }) => {
    await altaLlenarDatosGenerales(page, { folio: `E2E-REG2-${Date.now()}` }); // solo Datos generales
    await siguienteNveces(page, 8); // sin capturar catálogo ni programa
    // Avanza UN paso (a Catálogo) y se queda ahí (no hay concepto): cada paso desbloquea solo el siguiente.
    await expect(page.getByRole('heading', { name: 'Catálogo de conceptos' })).toBeVisible();
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);       // NUNCA llegó a Guardar
    await expect(page.getByTestId('error-wizard')).toBeVisible();
  });
});
