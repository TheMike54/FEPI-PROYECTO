// @ts-check
// E2E HU-16 — Reingreso de estimación tras rechazo.
//
// alta-v2/HU-16 cableada al backend real: la vista ya NO usa dummy. Arranca con un selector
// de contrato → estimación RECHAZADA y carga las observaciones reales del rechazo (HU-15,
// GET /estimaciones-ciclo/estimacion/:id/revision) para exportarlas (CA-2). El reingreso
// (POST .../reingresar) crea la nueva versión como bloque independiente ligado vía
// reemplaza_a (CA-1) sin reiniciar el plazo del art. 54 (CA-3).
//
// El CICLO funcional completo (sembrar una estimación 'enviada' → turnar → rechazar →
// reingresar, con las cuentas exactas residencia/supervisión/contratista) depende de datos
// sembrados, por lo que se valida con el SMOKE de backend (frontend/e2e/smoke-hu16.sh) y NO
// aquí. Este spec cubre la capa robusta sin seed:
//   · Control de acceso por rol (sidebar/inicio) idéntico a la matriz PERMISOS[HU-16].
//   · Carga de la vista y del selector de contrato para el rol ejecutor (contratista).
//   · Aviso de solo-consulta para residente y ausencia de panel de acción.
//
// PERMISOS[HU-16]: contratista='E' · residente='C' · supervision/dependencia/finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  expectAvisoSoloConsulta,
  expectMetadataAcademicaOculta
} from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/estimaciones/reingreso';
const TITULO = 'Reingreso de estimación tras rechazo';
const SPRINT = 'Sprint 8';

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-16 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-16 y la vista carga sin metadata academica', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-16',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });

  test('rol ejecutor ve el selector de contrato (sin aviso de solo consulta)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('select-contrato')).toBeVisible();
    // El ejecutor no debe ver el aviso de solo-consulta.
    await expect(page.getByText('solo consulta')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente consulta
// ---------------------------------------------------------------------------

test.describe('HU-16 — modo aplicacion (Residente: consulta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('aviso de solo consulta visible; sin panel de reingreso antes de seleccionar', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await expectAvisoSoloConsulta(page);
    // El selector existe (la consulta puede navegar contratos), pero el panel de acción
    // (textarea + botón de reingreso) no se renderiza hasta elegir una estimación rechazada.
    await expect(page.getByTestId('select-contrato')).toBeVisible();
    await expect(page.getByTestId('btn-reingresar')).toHaveCount(0);
    await expect(page.getByTestId('textarea-nota')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervisión / Dependencia / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-16 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-16 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
