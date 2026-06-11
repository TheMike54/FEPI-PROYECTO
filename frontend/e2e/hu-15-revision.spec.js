// @ts-check
// E2E HU-15 — Recepción, revisión técnica y autorización de la estimación.
//
// alta-v2/HU-15 cableada al backend real: la vista ya NO usa dummy. La página arranca con un
// selector de contrato → estimación y carga la revisión real (observaciones + turnado + semáforo
// derivado de enviada_en). El CICLO funcional completo (registrar observación → turnar →
// autorizar/rechazar) depende de datos sembrados (un contrato con estimación 'enviada' y las
// cuentas supervisión/residencia exactas), por lo que se valida con el SMOKE de backend
// (curl/psql, ver plan) y NO aquí. Este spec cubre la capa robusta sin seed:
//   · Control de acceso por rol (sidebar/inicio) idéntico a la matriz PERMISOS[HU-15].
//   · Carga de la vista y del selector de contrato para los roles ejecutores.
//   · Aviso de solo-consulta para dependencia y ausencia de paneles de acción.
//
// PERMISOS[HU-15]: residente='E' · supervision='E' · dependencia='C' · contratista/finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  expectAvisoSoloConsulta,
  expectMetadataAcademicaOculta
} from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/estimaciones/revision';
const TITULO = 'Recepción, revisión técnica y autorización de la estimación';
const SPRINT = 'Sprint 4';

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Supervisión ejecutan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-15 — modo aplicacion (${rol.alias}: ejecuta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('sidebar muestra HU-15 y la vista carga sin metadata academica', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expectMetadataAcademicaOculta(page, {
        huId: 'HU-15',
        sprintLabel: SPRINT
      });
    });

    test('rol ejecutor ve el selector de contrato (sin aviso de solo consulta)', async ({ page }) => {
      await goToViaSidebar(page, VIEW_PATH);
      // El ejecutor (nivel 'E') no debe ver el aviso de solo-consulta y sí el selector real.
      await expect(page.getByTestId('select-contrato')).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia consulta
// ---------------------------------------------------------------------------

test.describe('HU-15 — modo aplicacion (Dependencia: consulta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
  });

  test('aviso de solo consulta visible; sin panel de resolución', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);

    await expectAvisoSoloConsulta(page);
    // Los controles de acción no se renderizan en solo lectura (ni antes de elegir estimación).
    await expect(page.getByTestId('btn-turnar')).toHaveCount(0);
    await expect(page.getByTestId('btn-autorizar')).toHaveCount(0);
    await expect(page.getByTestId('btn-agregar-obs-caratula')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-15 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-15 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
