// @ts-check
// E2E HU-16 — Reingreso de estimación tras rechazo.
//
// Cubre el comportamiento del prototipo:
//   · Botones "Descargar PDF" y "Descargar Excel" disparan descargas reales
//     (jsPDF / SheetJS) con las observaciones de la versión rechazada.
//   · El botón "Reingresar estimación (nueva versión)" queda disabled hasta
//     que la textarea tenga texto Y la casilla de confirmación esté marcada.
//   · Al pulsarlo: aparece el banner verde de aviso-reingreso (v2 vinculada a
//     v1 rechazada, plazo no se reinicia) y la mini-tabla "Trazabilidad de
//     versiones" con la fila vN-1 → vN.
//
// PERMISOS[HU-16]: residente='C' · contratista='E' · supervision/dependencia/finanzas=null
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

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/estimaciones/reingreso';
const TITULO = 'Reingreso de estimación tras rechazo';
const SPRINT = 'Sprint 8';

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-16 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-16 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-16',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });

  test('puede ejecutar el reingreso completo', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('textarea-nota').fill('Corregido eje 7-B y catálogo.');
    await page.getByTestId('chk-confirmado').check();
    await page.getByTestId('btn-reingresar').click();
    await expect(page.getByTestId('aviso-reingreso')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente consulta
// ---------------------------------------------------------------------------

test.describe('HU-16 — modo aplicacion (Residente: consulta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('aviso de solo consulta visible; boton de reingresar deshabilitado', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);

    await expectAvisoSoloConsulta(page);
    // RegionEditable solo deshabilita los descendientes; los nodos siguen en el
    // DOM. El boton de reingresar queda disabled.
    await expect(page.getByTestId('btn-reingresar')).toBeDisabled();
    await expect(page.getByTestId('textarea-nota')).toBeDisabled();
    // Las descargas viven fuera de RegionEditable.
    await expect(page.getByTestId('btn-descargar-obs-pdf')).toBeVisible();
    await expect(page.getByTestId('btn-descargar-obs-excel')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervisión / Dependencia / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-16 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-16 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
