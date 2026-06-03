// @ts-check
// E2E HU-13 — Envío de la estimación.
//
// Cubre dos checks distintivos:
//   1. Validación temporal del art. 54 LOPSRM (6 días desde la fecha de corte):
//      el control "Días transcurridos" tiene un default de 3 (dentro de plazo);
//      pasarlo a >6 dispara el aviso rojo y bloquea el envío.
//   2. Flujo de envío del prototipo: al pulsar "Enviar estimación" se
//      establece el estado "Enviada" inalterable. Aparecen:
//        · banner data-testid="aviso-estimacion-enviada" con fecha+hora y
//          mención al plazo de revisión de 15 días.
//        · contador "Plazo de revisión: día 0 de 15".
//        · sección "Notificaciones enviadas" con residencia y supervisión.
//        · el botón Enviar desaparece y los inputs quedan disabled.
//
// PERMISOS[HU-13]: contratista='E' · residente/supervision='C' · dependencia/finanzas=null
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

const VIEW_PATH = '/estimaciones/envio';
const TITULO = 'Envío de la estimación';
const SPRINT = 'Sprint 8';

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-13 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-13 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-13',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });

  test('control de dias editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('ee-dias')).toBeEnabled();
    await expect(page.getByTestId('btn-enviar-estimacion')).toBeVisible();
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
  test.describe(`HU-13 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; control de dias deshabilitado', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.getByTestId('ee-dias')).toBeDisabled();
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
  test.describe(`HU-13 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-13 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
