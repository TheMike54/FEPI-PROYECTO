// @ts-check
// alta-v4 — anticipo > umbral OBLIGATORIO + gating ESTRICTAMENTE SECUENCIAL.
// Cierra: (BUG) se podía GUARDAR con anticipo > 30% sin el PDF de autorización; (fuga) el
// desbloqueo de pestañas "en cascada" y el salto a pasos no alcanzados. Con LOGIN REAL.
// Requiere backend+BD (cuentas semilla).
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaAdjuntarPdfFirmado, altaAdjuntarPdfAnticipo,
} from './_helpers.js';

test.skip(!!process.env.CI, 'alta-v4: login real requiere backend+BD; se corre en local');

// Localiza una pestaña del wizard por su etiqueta (regex). El Tab pone disabled={bloqueado}.
const tab = (page, re) => page.getByRole('button', { name: re });

// Lleva el wizard al paso 4 (garantías) con datos válidos; opcionalmente fija el % de anticipo.
async function irAGarantias(page, { anticipo, folio } = {}) {
  await altaLlenarDatosGenerales(page, { folio, plazo: 60, fechaInicio: '2026-06-01' });
  await page.getByTestId('btn-siguiente').click();             // → catálogo (1)
  await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 }); // monto 5000
  await page.getByTestId('btn-siguiente').click();             // → programa (2)
  await page.getByTestId('celda-0-1').fill('100');             // cuadra 100%
  await page.getByTestId('btn-siguiente').click();             // → jurídicos (3)
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
    await expect(tab(page, /PDF firmado/)).toBeDisabled();          // paso 5 bloqueado
    // Adjuntar la autorización habilita el avance al paso final.
    await altaAdjuntarPdfAnticipo(page);
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('pdf-firmado-precaptura')).toBeVisible();
  });

  test('(a2) BUG cerrado end-to-end: con anticipo>umbral se exigen AMBOS PDFs para guardar', async ({ page }) => {
    page.on('dialog', (d) => d.accept());                      // confirma el guardado
    const folio = `E2E-V4-${Date.now()}`;
    await irAGarantias(page, { anticipo: 60, folio });
    await altaAdjuntarPdfAnticipo(page);                       // autorización (obligatoria > umbral)
    await page.getByTestId('btn-siguiente').click();           // → PDF firmado (5)
    await expect(page.getByTestId('btn-guardar')).toBeDisabled();   // aún falta el firmado
    await altaAdjuntarPdfFirmado(page);
    await expect(page.getByTestId('btn-guardar')).toBeEnabled();
    await page.getByTestId('btn-guardar').click();
    // BUG 1: guardado OK con ambos PDFs → redirige a Registrados (ya no hay "Ver registrados →").
    await expect(page.getByTestId('btn-ver-registrados')).toHaveCount(0);
    await expect(page.locator('tr', { hasText: folio })).toBeVisible();
  });

  test('(b) no se puede saltar a una pestaña no alcanzada', async ({ page }) => {
    // Paso 0 vacío: las pestañas posteriores están BLOQUEADAS (no clicables).
    await expect(tab(page, /Programa de obra/)).toBeDisabled();
    await expect(tab(page, /Garantías/)).toBeDisabled();
    await expect(tab(page, /PDF firmado/)).toBeDisabled();
    // Completar SOLO el paso 0 (sin avanzar): se desbloquea la 1 (catálogo) pero NO la 2.
    await altaLlenarDatosGenerales(page);
    await expect(tab(page, /Catálogo de conceptos/)).toBeEnabled();
    await expect(tab(page, /Programa de obra/)).toBeDisabled();
  });

  test('(c) cada pestaña desbloquea SOLO la siguiente (sin cascada)', async ({ page }) => {
    await altaLlenarDatosGenerales(page);
    await page.getByTestId('btn-siguiente').click();           // → catálogo (1)
    await expect(tab(page, /Programa de obra/)).toBeDisabled(); // catálogo vacío: la 2 sigue bloqueada
    await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 });
    await page.getByTestId('btn-siguiente').click();           // → programa (2)
    await page.getByTestId('celda-0-1').fill('100');           // cuadra 100%
    // CLAVE (anti-cascada): completado el paso 2, SOLO se desbloquea el 3 (jurídicos);
    // garantías (4) y PDF firmado (5) siguen BLOQUEADOS (antes se abrían los 3 de golpe).
    await expect(tab(page, /Datos jurídicos/)).toBeEnabled();
    await expect(tab(page, /Garantías/)).toBeDisabled();
    await expect(tab(page, /PDF firmado/)).toBeDisabled();
    // Avanzar uno: ahora se desbloquea el 4, pero el 5 sigue bloqueado.
    await page.getByTestId('btn-siguiente').click();           // → jurídicos (3)
    await expect(tab(page, /Garantías/)).toBeEnabled();
    await expect(tab(page, /PDF firmado/)).toBeDisabled();
  });
});
