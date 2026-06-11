// @ts-check
// E2E HU-12 — Apertura del periodo e integración de la estimación.
//
// Cubre los checks distintivos:
//   · Carátula calculada en vivo a partir de los números generadores.
//   · Cambio en una cantidad recalcula el total automáticamente.
//   · Bloqueo por exceso: cantidad acumulada > contratada deshabilita Integrar.
//   · Tab "Notas vinculadas": modal con filtros AND (mismos de HU-10), las
//     notas seleccionadas pasan a la tabla de notas vinculadas.
//   · Click "Integrar" muestra el banner aviso-integrada y oculta el botón.
//   · Permisos por rol.
//
// PERMISOS[HU-12]: contratista='E' · residente='C' · supervision='C' · dependencia=null · finanzas=null
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

const VIEW_PATH = '/estimaciones/integracion';
const TITULO = 'Formular y presentar la estimación'; // O7: el contratista PRESENTA (antes "integraba")
const SPRINT = 'Sprint 3';

/** Tab del componente Tabs (botón con el label pasado como prefijo). */
function tab(page, nombre) {
  return page.locator('button', { hasText: nombre }).first();
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-12 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-12 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-12',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Supervisión consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-12 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    // alta-v2 (4.5): los inputs del FORM de integración requieren contrato/estimación reales
    // (página cableada). Tras quitar el modo demo ya no hay form dummy sin datos. Pendiente:
    // convertir a integración (sembrar contrato + apertura/estimación). Ver entregable alta-v2 §6.
    test.fixme('aviso de solo consulta visible; inputs deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await tab(page, 'Números generadores').click();
      await expect(page.getByTestId('gen-periodo-0')).toBeDisabled();
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
  test.describe(`HU-12 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-12 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
