// @ts-check
// E2E HU-09 — Emisión y respuesta de notas tipificadas con firma.
//
// La vista se RECONCILIÓ con el backend real (Sprint 2): UN emisor por nota
// (art. 125 RLOPSRM, el rol lo deduce el servidor por el equipo del contrato),
// folio correlativo del backend, inmutabilidad por trigger, y estado de
// aceptación derivado (tácita al vencer el plazo). Ya NO hay "firma conjunta de
// tres" ni folio/dummy en cliente.
//
// El flujo FUNCIONAL (emitir/responder/anular contra el backend) requiere
// backend + BD + login real; se valida en la suite de API (backend) y en una
// corrida Playwright dedicada. Aquí, como en el resto de specs de vista, se
// cubre el "shell" y los permisos, que es lo verificable sin sesión.
//
// PERMISOS[HU-09]: residente/contratista/supervision='E' · dependencia=null · finanzas=null
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

const VIEW_PATH = '/bitacora/notas';
const TITULO = 'Emisión y respuesta de notas tipificadas con firma';
const SPRINT = 'Sprint 2';

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Contratista / Supervisión ejecutan (shell + permisos)
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-09 — modo aplicacion (${rol.alias}: ejecuta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('sidebar muestra HU-09 y la vista carga sin metadata academica', async ({ page }) => {
      await expect(await sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expectMetadataAcademicaOculta(page, {
        huId: 'HU-09',
        sprintLabel: SPRINT
      });
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
  test.describe(`HU-09 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-09 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
