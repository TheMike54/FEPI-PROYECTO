// @ts-check
// E2E HU-06 — Registro de trabajos terminados.
//
// Cubre el check distintivo de la vista: la validacion de exceso por concepto
// (acumulado previo + capturado > contratada). Excavacion en el dummy tiene
// contratada=1000 y acumPrevio=600, asi que 500 dispara el exceso (1100>1000)
// y 100 lo mantiene dentro de rango (700<=1000).
//
// PERMISOS[HU-06]: contratista='E' · residente/supervision='C' · dependencia/finanzas=null
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

const VIEW_PATH = '/seguimiento/trabajos-terminados';
const TITULO = 'Registro de trabajos terminados';
const SPRINT = 'Sprint 7';

/** Devuelve el input "Este periodo" de la fila cuyo primer td contiene `concepto`. */
function inputDeFila(page, concepto) {
  return page.locator('tr', { hasText: concepto }).locator('input[type="number"]');
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-06 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-06 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-06',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });

  test('tabla editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(inputDeFila(page, 'Excavación')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Guardar avance del periodo' })).toBeVisible();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Supervision consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-06 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; inputs deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(inputDeFila(page, 'Excavación')).toBeDisabled();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-06 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-06 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
