// @ts-check
// Alta del wizard — correcciones 4.x + alta-v2 (puntos 1.x). Con LOGIN REAL y la app vacía:
//  · 1.1/1.2 "Siguiente" gateado uniforme + pestañas posteriores bloqueadas.
//  · 1.3 mensajes de error PERSISTENTES (banner que el usuario cierra; no Toast efímero).
//  · 1.4 garantía que excede el monto del contrato se marca EN VIVO.
//  · 1.6 anticipo > umbral: el PDF de autorización se puede adjuntar DURANTE la captura.
//  · 4.1 "Siguiente" por paso, "Atrás", "Guardar" solo en el último paso.
// Requiere backend+BD (login real + cuentas semilla).
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos, altaLlenarGarantias, altaAdjuntarPdfFirmado } from './_helpers.js';

test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

// Lleva el wizard hasta el paso 4 (garantías) con datos válidos: DG + 1 concepto + programa 100%
// + jurídicos (alta-v5: obligatorios para poder pasar del paso 3).
async function avanzarHastaGarantias(page) {
  await altaLlenarDatosGenerales(page, { plazo: 60, fechaInicio: '2026-06-01' });
  await page.getByTestId('btn-siguiente').click();             // catálogo
  await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 }); // monto = 5000
  await page.getByTestId('btn-siguiente').click();             // programa
  await page.getByTestId('celda-0-1').fill('100');             // 100% (todo en P1)
  await page.getByTestId('btn-siguiente').click();             // jurídicos
  await altaLlenarJuridicos(page);                             // alta-v5: obligatorios
  await page.getByTestId('btn-siguiente').click();             // garantías
}

test.describe('alta-v2 — wizard: gating, banner persistente, anticipo y garantía', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');             // arranca en el paso 0
  });

  test('1.1/1.3 Siguiente con datos vacíos: banner PERSISTENTE + pestaña bloqueada', async ({ page }) => {
    await page.getByTestId('btn-siguiente').click();           // paso 0 inválido (vacío)
    const banner = page.getByTestId('error-wizard');
    await expect(banner).toBeVisible();
    // No es un Toast (que dura 3 s): el banner sigue tras 3.5 s.
    await page.waitForTimeout(3500);
    await expect(banner).toBeVisible();
    // 1.2: pestañas posteriores bloqueadas (al menos una con 🔒).
    expect(await page.locator('button[data-bloqueado="true"]').count()).toBeGreaterThan(0);
    // El usuario lo cierra con la ✕.
    await page.getByTestId('error-wizard-cerrar').click();
    await expect(banner).toHaveCount(0);
  });

  test('4.1 + alta-v3 wizard: Siguiente por paso, Atrás, Guardar solo en el paso PDF', async ({ page }) => {
    // Paso 0: hay "Siguiente"; no hay "Guardar" ni "Atrás".
    await expect(page.getByTestId('btn-siguiente')).toBeVisible();
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    await expect(page.getByTestId('btn-atras')).toHaveCount(0);
    // Avanzar con datos válidos y poder regresar.
    await altaLlenarDatosGenerales(page);
    await page.getByTestId('btn-siguiente').click();           // catálogo
    await expect(page.getByTestId('btn-atras')).toBeVisible();
    await page.getByTestId('btn-atras').click();               // ← datos generales
    await expect(page.getByTestId('btn-atras')).toHaveCount(0);
    // alta-v3: garantías YA NO es el último paso → sigue habiendo "Siguiente", aún no "Guardar".
    await avanzarHastaGarantias(page);
    await expect(page.getByTestId('btn-siguiente')).toBeVisible();
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    await altaLlenarGarantias(page);                           // alta-v5: fianza de cumplimiento obligatoria
    // Último paso = PDF firmado: aparece "Guardar" (DESHABILITADO sin PDF), desaparece "Siguiente".
    await page.getByTestId('btn-siguiente').click();           // → PDF firmado (último)
    await expect(page.getByTestId('btn-siguiente')).toHaveCount(0);
    await expect(page.getByTestId('btn-guardar')).toBeVisible();
    await expect(page.getByTestId('btn-guardar')).toBeDisabled();
  });

  test('alta-v3 el PDF firmado es OBLIGATORIO para guardar (gate del botón)', async ({ page }) => {
    await avanzarHastaGarantias(page);
    await altaLlenarGarantias(page);                           // alta-v5: fianza de cumplimiento obligatoria
    await page.getByTestId('btn-siguiente').click();           // → PDF firmado (último paso)
    // Sin PDF: botón bloqueado + pista visible.
    await expect(page.getByTestId('btn-guardar')).toBeDisabled();
    await expect(page.getByTestId('guardar-bloqueado-hint')).toBeVisible();
    // Adjuntar el PDF firmado lo habilita y la pista desaparece.
    await altaAdjuntarPdfFirmado(page);
    await expect(page.getByTestId('btn-guardar')).toBeEnabled();
    await expect(page.getByTestId('guardar-bloqueado-hint')).toHaveCount(0);
    // Quitar el PDF vuelve a bloquear el guardado.
    await page.getByTestId('pdf-firmado-precaptura').getByRole('button', { name: 'quitar' }).click();
    await expect(page.getByTestId('btn-guardar')).toBeDisabled();
  });

  test('1.6 anticipo > umbral: el aviso HABILITA adjuntar la autorización durante la captura', async ({ page }) => {
    await avanzarHastaGarantias(page);
    await page.getByTestId('anticipo-input').fill('60');       // > umbral (30)
    const aviso = page.getByTestId('avisos-anticipo');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('art. 50 fr. IV');
    // alta-v2 (1.6): SIN contrato guardado ya hay uploader (antes pedía "guarda primero").
    await expect(page.getByTestId('anticipo-pdf-input')).toBeVisible();
  });

  test('1.4 garantía que excede el monto del contrato se marca EN VIVO', async ({ page }) => {
    await avanzarHastaGarantias(page);                          // monto del contrato = 5000
    await page.getByRole('button', { name: '+ Agregar póliza' }).click();
    await page.getByTestId('garantia-monto-0').fill('999999');  // > 5000
    await expect(page.getByTestId('garantia-excede-0')).toBeVisible();
    // Al corregir a un monto válido, la marca desaparece.
    await page.getByTestId('garantia-monto-0').fill('500');
    await expect(page.getByTestId('garantia-excede-0')).toHaveCount(0);
  });
});
