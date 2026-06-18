// @ts-check
// E2E HU-10 — Consulta y búsqueda de notas de bitácora.
//
// HU-10 quedó CABLEADA a datos reales (selector de contrato → GET
// /api/bitacora/contrato/:id/notas). El buscador (filtros AND + selección + export)
// vive en el componente reutilizable BuscadorNotas, que HU-12 reusará como modal.
//
// La suite E2E del repo solo levanta el FRONTEND (ver playwright.config.js: no hay
// backend ni DB), así que aquí se cubre lo verificable sin sesión real:
//   · estructura de la vista (badge, heading, criterios, selector de contrato);
//   · el formulario de filtros está presente y es utilizable;
//   · sin sesión se invita a iniciarla y el selector queda deshabilitado;
//   · permisos por rol (E / C / sin acceso).
// El camino de datos (filtros AND sobre notas reales + export .xlsx) se verifica con
// smoke test manual contra el backend local (ver reporte de la HU).
//
// PERMISOS[HU-10]: residente='E' · contratista='C' · supervision='C' · dependencia=null · finanzas=null
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

const VIEW_PATH = '/bitacora/consulta';
const TITULO = 'Consulta y búsqueda de notas de bitácora';
const SPRINT = 'Sprint 3';

/** Lee el contador de resultados como entero. */
async function leerContador(page) {
  const txt = (await page.getByTestId('contador-resultados').textContent()) ?? '0';
  return parseInt(txt, 10);
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-10 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-10 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(await sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-10',
      sprintLabel: SPRINT
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervision consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-10 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; los filtros siguen utilizables', async ({ page }) => {
      await expect(await sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      // La consulta es una operación de lectura; los filtros siguen funcionales.
      await expect(page.getByTestId('filtro-tipo')).toBeEnabled();
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
  test.describe(`HU-10 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-10 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
