// @ts-check
// E2E HU-04 — Consulta integrada del expediente contractual.
//
// Cubre los checks distintivos:
//   · El expediente muestra 5 bloques (configuración, catálogo, programa,
//     fianzas, jurídicos) — verificable por los headings.
//   · El buscador filtra los bloques por campo (lógica Y).
//   · Cada documento se descarga individualmente: PDFs placeholder con jsPDF
//     (configuración, fianzas, jurídicos) y .xlsx con SheetJS (catálogo,
//     programa). Validado con waitForEvent('download').
//   · El botón "Exportar expediente" queda como placeholder con tooltip
//     "Disponible en SRV-06-03".
//   · Permisos por rol.
//
// PERMISOS[HU-04]: residente='E' · contratista/supervision/dependencia='C' · finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  cardInInicioFor,
  expectAvisoSoloConsulta,
  expectMetadataAcademicaOculta
} from './_helpers.js';

const VIEW_PATH = '/contratos/expediente';
const TITULO = 'Consulta integrada del expediente contractual';
const SPRINT = 'Sprint 4';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-04 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-04 + Sprint 4', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-04');
    expect(text).toContain(SPRINT);
    expect(text.toLowerCase()).toContain('expediente');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-04' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Residente')).toBeVisible();
  });

  test('criterios de aceptacion: los 3 textos al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const seccion = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Criterios de aceptación' })
    });
    await expect(seccion.getByText(/5 bloques del contrato/)).toBeVisible();
    await expect(seccion.getByText(/lógica Y/)).toBeVisible();
    await expect(seccion.getByText(/descargarse individualmente desde su bloque/)).toBeVisible();
  });

  test('los 5 bloques del expediente estan presentes', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Configuración del contrato' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Catálogo de conceptos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Programa de obra' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fianzas y garantías' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Documentos jurídicos' })).toBeVisible();
  });

  // CHECK DISTINTIVO 1: descarga PDF del contrato firmado (configuración).
  test('descarga PDF del bloque configuracion (jsPDF)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('btn-descargar-configuracion-0').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^contrato_firmado_.+\.pdf$/);
  });

  // CHECK DISTINTIVO 2: descarga Excel del catálogo (SheetJS).
  test('descarga Excel del bloque catalogo (SheetJS)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('btn-descargar-catalogo-0').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^catalogo_.+\.xlsx$/);
  });

  // CHECK DISTINTIVO 3: descarga Excel del programa.
  test('descarga Excel del bloque programa (SheetJS)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('btn-descargar-programa-0').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^programa_.+\.xlsx$/);
  });

  // CHECK DISTINTIVO 4: descarga PDF individual de una póliza (bloque fianzas).
  test('descarga PDF individual de una poliza (bloque fianzas)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('btn-descargar-fianzas-0').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^poliza_.+\.pdf$/);
  });

  // CHECK DISTINTIVO 5: el botón "Exportar expediente" queda como placeholder.
  test('Exportar expediente queda con tooltip SRV-06-03 y disabled', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const btn = page.getByRole('button', { name: /Exportar expediente/ });
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveAttribute('title', /SRV-06-03/);
  });

  // CHECK DISTINTIVO 6: buscador filtra el conjunto de bloques. Buscando
  // "concreto" por "objeto" sólo el bloque "Catálogo" debe coincidir
  // (conceptosDummy contiene "Concreto premezclado").
  test('buscador filtra bloques por palabra', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByPlaceholder(/Folio, palabra del objeto/).fill('concreto');
    // Catálogo debe seguir visible.
    await expect(page.getByRole('heading', { name: 'Catálogo de conceptos' })).toBeVisible();
    // Programa NO contiene "concreto" — queda filtrado fuera.
    await expect(page.getByRole('heading', { name: 'Programa de obra' })).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-04 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-04 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-04',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-04 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; los botones de descarga siguen presentes', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      // La consulta del expediente y sus descargas son una operación de lectura
      // — siguen disponibles para todos los roles con acceso.
      await expect(page.getByTestId('btn-descargar-configuracion-0')).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-04 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-04 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
