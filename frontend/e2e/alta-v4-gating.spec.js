// @ts-check
// alta-v4 — anticipo > umbral OBLIGATORIO + gating ESTRICTAMENTE SECUENCIAL.
// Cierra: (BUG) se podía GUARDAR con anticipo > 30% sin el PDF de autorización; (fuga) el
// desbloqueo de pestañas "en cascada" y el salto a pasos no alcanzados. Con LOGIN REAL.
// Requiere backend+BD (cuentas semilla).
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos, altaLlenarGarantias,
  altaAdjuntarPdfFirmado, altaAdjuntarPdfAnticipo,
} from './_helpers.js';

test.skip(!!process.env.CI, 'alta-v4: login real requiere backend+BD; se corre en local');

// Localiza una pestaña del wizard por su etiqueta (regex). El Tab pone disabled={bloqueado}.
const tab = (page, re) => page.getByRole('button', { name: re });

// Lleva el wizard al paso 4 (garantías) con datos válidos; opcionalmente fija el % de anticipo.
// alta-v5: los jurídicos (paso 3) son obligatorios → se rellenan para poder llegar a garantías.
async function irAGarantias(page, { anticipo, folio } = {}) {
  await altaLlenarDatosGenerales(page, { folio, plazo: 60, fechaInicio: '2026-06-01' });
  await page.getByTestId('btn-siguiente').click();             // → catálogo (1)
  await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 }); // monto 5000
  await page.getByTestId('btn-siguiente').click();             // → programa (2)
  await page.getByTestId('celda-0-1').fill('100');             // cuadra 100%
  await page.getByTestId('btn-siguiente').click();             // → jurídicos (3)
  await altaLlenarJuridicos(page);                             // alta-v5: obligatorios
  await page.getByTestId('btn-siguiente').click();             // → garantías (4)
  if (anticipo != null) await page.getByTestId('anticipo-input').fill(String(anticipo));
}

test.describe('alta-v4 — anticipo obligatorio sobre umbral + gating secuencial', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');             // arranca en el paso 0
  });

  test('(a) anticipo > umbral: el PDF de autorización es OBLIGATORIO — bloquea avance', async ({ page }) => {
    await irAGarantias(page, { anticipo: 60 });                // > 30%
    await expect(page.getByTestId('avisos-anticipo')).toBeVisible();
    await expect(page.getByTestId('anticipo-pdf-requerido')).toBeVisible();
    // Sin el PDF de autorización, "Siguiente" NO avanza: se queda en garantías + banner persistente.
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByTestId('error-wizard')).toContainText('autorización del anticipo');
    await expect(page.getByTestId('anticipo-input')).toBeVisible(); // sigue en el paso 4
    await expect(tab(page, /PDF firmado/)).toBeDisabled();          // paso 5 bloqueado (captura incompleta)
    // Adjuntar la autorización + las fianzas obligatorias habilita el avance al paso final.
    await altaAdjuntarPdfAnticipo(page);
    await altaLlenarGarantias(page, { conAnticipo: true });         // alta-v5: cumplimiento + anticipo
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('pdf-firmado-precaptura')).toBeVisible();
  });

  test('(a2) BUG cerrado end-to-end: con anticipo>umbral se exigen AMBOS PDFs para guardar', async ({ page }) => {
    page.on('dialog', (d) => d.accept());                      // confirma el guardado
    const folio = `E2E-V4-${Date.now()}`;
    await irAGarantias(page, { anticipo: 60, folio });
    await altaAdjuntarPdfAnticipo(page);                       // autorización (obligatoria > umbral)
    await altaLlenarGarantias(page, { conAnticipo: true });    // alta-v5: cumplimiento + anticipo
    await page.getByTestId('btn-siguiente').click();           // → PDF firmado (5)
    await expect(page.getByTestId('btn-guardar')).toBeDisabled();   // aún falta el firmado
    await altaAdjuntarPdfFirmado(page);
    await expect(page.getByTestId('btn-guardar')).toBeEnabled();
    await page.getByTestId('btn-guardar').click();
    // BUG 1: guardado OK con ambos PDFs → redirige a Registrados (ya no hay "Ver registrados →").
    await expect(page.getByTestId('btn-ver-registrados')).toHaveCount(0);
    await expect(page.locator('tr', { hasText: folio })).toBeVisible();
  });

  test('(b) alta-v5: los nombres NO se habilitan progresivamente durante la captura', async ({ page }) => {
    // Paso 0 activo: TODOS los demás nombres están deshabilitados (no navegan).
    await expect(tab(page, /Catálogo de conceptos/)).toBeDisabled();
    await expect(tab(page, /Programa de obra/)).toBeDisabled();
    await expect(tab(page, /Garantías/)).toBeDisabled();
    await expect(tab(page, /PDF firmado/)).toBeDisabled();
    // Completar el paso 0 NO habilita el nombre del siguiente (ya NO hay desbloqueo progresivo):
    // el avance es SOLO con «Siguiente».
    await altaLlenarDatosGenerales(page);
    await expect(tab(page, /Catálogo de conceptos/)).toBeDisabled();
    await page.getByTestId('btn-siguiente').click();           // «Siguiente» sí avanza
    await expect(page.getByRole('heading', { name: 'Catálogo de conceptos' })).toBeVisible();
    // Y el nombre del paso anterior tampoco navega (se vuelve con «Atrás»).
    await expect(tab(page, /Datos generales/)).toBeDisabled();
  });

  test('(c) alta-v5: los nombres se habilitan SOLO con la captura completa + PDF firmado', async ({ page }) => {
    const folio = `E2E-V4C-${Date.now()}`;
    await irAGarantias(page, { folio });                       // sin anticipo
    await altaLlenarGarantias(page);                           // fianza de cumplimiento
    // Aún en captura (falta el PDF firmado): el nombre "Datos generales" NO navega.
    await expect(tab(page, /Datos generales/)).toBeDisabled();
    await page.getByTestId('btn-siguiente').click();           // → PDF firmado (5)
    await expect(tab(page, /Datos generales/)).toBeDisabled(); // sin PDF → sigue incompleta
    await altaAdjuntarPdfFirmado(page);
    // Captura COMPLETA (todo válido + PDF): ahora los nombres navegan (revisión/salto libre).
    await expect(tab(page, /Datos generales/)).toBeEnabled();
    await tab(page, /Datos generales/).click();
    await expect(page.getByTestId('dg-folio')).toHaveValue(folio);
  });
});
