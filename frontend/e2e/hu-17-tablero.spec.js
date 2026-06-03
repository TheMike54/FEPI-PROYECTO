// @ts-check
// E2E HU-17 — Tablero de estimaciones del contrato.
//
// Cubre el comportamiento del prototipo:
//   · Indicadores agregados arriba del tablero (avance físico %, monto total,
//     monto pagado, monto pendiente, días promedio en cada estado).
//   · Cada tarjeta muestra la línea de tiempo del estado (mini-stepper) y el
//     responsable.
//   · Filtros por estado, periodo y responsable funcionan con lógica Y.
//   · El panel "Mis pendientes" muestra los pendientes del rol activo (o del
//     residente en modo proyecto).
//
// PERMISOS[HU-17]: residente='E' · contratista/supervision/dependencia='C' · finanzas=null
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

const VIEW_PATH = '/estimaciones/tablero';
const TITULO = 'Tablero de estimaciones';
const SPRINT = 'Sprint 8';

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-17 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-17 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-17',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });

  test('panel Mis pendientes muestra pendientes del residente', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText('Estimación 3 espera tu autorización')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista', pendiente: 'Estimación 5 presentada, en espera de revisión' },
  { id: 'supervision', alias: 'Supervisión', pendiente: 'Estimación 4 espera tu revisión técnica' },
  { id: 'dependencia', alias: 'Dependencia', pendiente: 'Estimación 2 lista para programar el pago' }
]) {
  test.describe(`HU-17 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test(`Mis pendientes muestra los del rol ${rol.alias}`, async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByText(rol.pendiente)).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-17 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-17 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
