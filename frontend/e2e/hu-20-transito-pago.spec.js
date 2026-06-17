// @ts-check
// E2E HU-20 — Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal.
//
// CABLEADO al backend real (GET/POST /api/instruccion-pago). La suficiencia (art. 24), el semáforo
// del plazo (ancla = nota de autorización en bitácora), los soportes y la generación de la
// instrucción los calcula/gestiona el backend. Aquí se valida el ACCESO por rol y el CABLEADO de la
// pantalla (selector contrato/estimación, sin dummy).
//
// PERMISOS[HU-20]: residente='C' · contratista='E' · supervision=null · dependencia='C' · finanzas='E'
//
// Requiere backend+BD (login real) → se salta en CI. El skip va DENTRO de cada beforeEach (NO en el
// tope del módulo: ahí `test.skip(cond,...)` rompe la colección en CI). Helpers: ver _helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  expectMetadataAcademicaOculta,
} from './_helpers.js';

const skipEnCI = () => test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/pagos/transito';
const TITULO = 'Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal';
const SPRINT = 'Sprint 5';

// --- Ejecutores (contratista / finanzas = 'E') ---
for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'finanzas',    alias: 'Finanzas' },
]) {
  test.describe(`HU-20 — modo aplicacion (${rol.alias}: ejecuta)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol.id);
      await goToViaSidebar(page, VIEW_PATH);
    });

    test('la vista carga, sin metadata académica, con selector de contrato', async ({ page }) => {
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-contrato')).toBeVisible();
      await expectMetadataAcademicaOculta(page, { huId: 'HU-20', sprintLabel: SPRINT, rolAcademicoLabel: 'Contratista y finanzas' });
    });
  });
}

// --- Consultores (residente / dependencia = 'C') ---
for (const rol of [
  { id: 'residente',   alias: 'Residente' },
  { id: 'dependencia', alias: 'Dependencia' },
]) {
  test.describe(`HU-20 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('la vista es accesible (solo lectura)', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-contrato')).toBeVisible();
    });
  });
}

// --- Sin acceso (supervisión = null) ---
test.describe('HU-20 — modo aplicacion (Supervisión: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    skipEnCI();
    await freshHome(page);
    await enterAppMode(page, 'supervision');
  });

  test('HU-20 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
