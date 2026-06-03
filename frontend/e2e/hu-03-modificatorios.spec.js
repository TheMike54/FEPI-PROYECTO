// @ts-check
// E2E HU-03 — Trámite de convenios modificatorios.
//
// Cubre el check distintivo de la vista: la validacion visual del 50% sobre
// monto y plazo (art. 59 vs. 59 Bis LOPSRM). El umbral configurado en
// contratoBaseModificatorios es 6,225,000 MXN y 90 dias.
//
// PERMISOS[HU-03]: dependencia='E' · residente/contratista/supervision='C' · finanzas=null
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

const VIEW_PATH = '/contratos/modificatorios';
const TITULO = 'Trámite de convenios modificatorios';
const SPRINT = 'Sprint 6';

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-03 — modo aplicacion (Dependencia: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
  });

  test('sidebar muestra HU-03 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-03',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Dependencia'
    });
  });

  test('form de convenio editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.locator('input[type="number"]').nth(0)).toBeEnabled();
    await expect(page.locator('input[type="number"]').nth(1)).toBeEnabled();
    await expect(page.locator('select').first()).toBeEnabled();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Contratista / Supervision consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-03 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; inputs deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.locator('input[type="number"]').nth(0)).toBeDisabled();
      await expect(page.locator('input[type="number"]').nth(1)).toBeDisabled();
      await expect(page.locator('select').first()).toBeDisabled();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-03 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-03 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
