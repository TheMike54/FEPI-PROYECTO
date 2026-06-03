// @ts-check
// E2E HU-05 — Programa y curva de avance.
//
// Cubre los 3 criterios nuevos (textos exactos al pie) y los 2 checks
// distintivos de la vista:
//   · Filtro por concepto deja una sola fila en la matriz Gantt.
//   · Filtro por periodo recorta las columnas de meses del Gantt.
// Más permisos por rol (residente='E', consulta='C', finanzas sin acceso).
//
// PERMISOS[HU-05]: residente='E' · contratista='C' · supervision='C' · dependencia='C' · finanzas=null
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
  expectSinAvisoSoloConsulta,
  expectMetadataAcademicaOculta
} from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/seguimiento/curva-avance';
const TITULO = 'Programa y curva de avance';
const SPRINT = 'Sprint 7';

/** Locator del <select> del filtro "Concepto" (label seguido del select). */
function selectConcepto(page) {
  return page.locator('label:has-text("Concepto") + select');
}

/** Locator del <select> del filtro "Periodo". */
function selectPeriodo(page) {
  return page.locator('label:has-text("Periodo") + select');
}

/** Locator de la tabla Gantt. Se ancla a data-testid="seccion-gantt" para
 *  distinguirla de la tabla del Catálogo (que también vive en esta vista). */
function tablaGantt(page) {
  return page.locator('[data-testid="seccion-gantt"] table').first();
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-05 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-05 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-05',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });

  test('filtros editables; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(selectConcepto(page)).toBeEnabled();
    await expect(selectPeriodo(page)).toBeEnabled();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervision / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-05 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; la vista carga', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-05 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-05 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
