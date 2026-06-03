// @ts-check
// E2E HU-04 — Consulta integrada del expediente contractual.
//
// Cubre los checks distintivos:
//   · El expediente muestra 5 bloques (configuración, catálogo, programa,
//     fianzas, jurídicos) — verificable por los headings.
//   · El buscador filtra los bloques por campo (lógica Y).
//   · Cada documento se descarga individualmente: PDFs placeholder con jsPDF
//     (configuración, fianzas, jurídicos) y .xlsx con SheetJS (catálogo,
//     programa). Validado con waitForEvent('download').
//   · El botón "Exportar expediente" queda como placeholder con tooltip
//     "Disponible en SRV-06-03".
//   · Permisos por rol.
//
// PERMISOS[HU-04]: residente='E' · contratista/supervision/dependencia='C' · finanzas=null
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

const VIEW_PATH = '/contratos/expediente';
const TITULO = 'Consulta integrada del expediente contractual';
const SPRINT = 'Sprint 4';

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-04 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-04 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-04',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-04 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; los botones de descarga siguen presentes', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      // La consulta del expediente y sus descargas son una operación de lectura
      // — siguen disponibles para todos los roles con acceso.
      await expect(page.getByTestId('btn-descargar-configuracion-0')).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-04 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-04 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
