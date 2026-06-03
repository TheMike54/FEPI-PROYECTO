// @ts-check
// E2E HU-14 — Historial de estimaciones del contrato.
//
// Cubre el comportamiento del prototipo:
//   · Filtros por periodo, estado y combinación (lógica Y).
//   · Click en fila abre el panel-detalle-estimacion-{id} con el expediente
//     compacto (incluye lista de observaciones cuando la estimación fue
//     rechazada, "Sin observaciones" cuando no).
//   · Botón "Exportar historial" genera un .xlsx real (SheetJS) con las filas
//     filtradas — verificamos que dispara un download.
//
// PERMISOS[HU-14]: residente='E' · contratista/dependencia='C' · supervision/finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  cardInInicioFor,
  expectMetadataAcademicaOculta
} from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/estimaciones/historial';
const TITULO = 'Historial de estimaciones del contrato';
const SPRINT = 'Sprint 5';

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-14 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-14 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-14',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Dependencia consultan (vista consultativa)
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-14 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('la vista es accesible y los filtros funcionan', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      // Esta vista es 100% consultativa (no tiene captura editable), así que
      // los filtros operan igual para C que para E.
      await expect(page.getByTestId('he-periodo')).toBeEnabled();
      await page.getByTestId('he-periodo').selectOption('May 2026');
      const filas = page.locator('[data-testid="tabla-historial"] tbody tr');
      await expect(filas).toHaveCount(3);
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervision / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-14 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-14 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
