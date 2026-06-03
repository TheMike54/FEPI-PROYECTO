// @ts-check
// Paquete 4.x — corrección del alta de contratos (wizard + anticipo→PDF).
//  4.1: "Siguiente" por paso, "Guardar contrato" SOLO en el último paso de captura, "Atrás".
//  4.4: cuando el % de anticipo supera el umbral, el aviso EXIGE/HABILITA la autorización (PDF).
// Corre frontend-only (modo demostración, sin backend). El GATING por validación inválida es
// conducta de SESIÓN REAL (en demo no hay superintendente asignable); aquí se valida la
// ESTRUCTURA del wizard (botones por paso) y la UI del anticipo.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.describe('4.x — corrección del alta (wizard + anticipo PDF)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta'); // arranca en el paso 0
  });

  test('4.1 wizard: Siguiente por paso, Guardar solo al final, Atrás', async ({ page }) => {
    // Paso 0: hay "Siguiente", NO hay "Guardar" ni "Atrás".
    await expect(page.getByTestId('btn-siguiente')).toBeVisible();
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    await expect(page.getByTestId('btn-atras')).toHaveCount(0);

    // Avanzo un paso y regreso (no se pierde la navegación).
    await page.getByTestId('btn-siguiente').click();           // → paso 1 (catálogo)
    await expect(page.getByTestId('btn-atras')).toBeVisible();
    await page.getByTestId('btn-atras').click();                // ← paso 0
    await expect(page.getByTestId('btn-atras')).toHaveCount(0);

    // Llego al último paso de captura (4 = garantías): aparece "Guardar", desaparece "Siguiente".
    for (let i = 0; i < 4; i++) await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('btn-guardar')).toBeVisible();
    await expect(page.getByTestId('btn-siguiente')).toHaveCount(0);
  });

  test('4.4 anticipo sobre umbral: el aviso EXIGE la autorización (PDF)', async ({ page }) => {
    for (let i = 0; i < 4; i++) await page.getByTestId('btn-siguiente').click(); // paso garantías
    const ap = page.getByTestId('anticipo-input');
    await ap.fill('60'); // > umbral (30)
    const aviso = page.getByTestId('avisos-anticipo');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('autorización');
    await expect(aviso).toContainText('art. 50 fr. IV');
    // Sin contrato guardado (demo) → indica que primero hay que guardar para adjuntar el PDF.
    await expect(page.getByTestId('anticipo-pdf-pendiente')).toBeVisible();
  });
});
