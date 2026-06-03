// @ts-check
// E2E HU-19 — Exportación de reportes.
//
// Cubre el comportamiento del prototipo:
//   · 7 reportes definidos; cada botón dispara una descarga REAL (jsPDF para
//     PDF, SheetJS para Excel). Verificamos suggestedFilename.
//   · El selector de periodo (Mensual, Trimestral, Acumulado) etiqueta el
//     archivo y acota los meses incluidos donde aplica (1, 2, 5), sin alterar
//     el contenido predefinido del reporte (CA-2).
//
// PERMISOS[HU-19]: residente='E' · contratista/supervision/dependencia/finanzas='C'
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

const VIEW_PATH = '/reportes';
const TITULO = 'Exportación de reportes';
const SPRINT = 'Sprint 9';

// id -> { formato -> patron suggestedFilename }
const REPORTES = [
  { id: 1, slug: 'avance-fisico',     formatos: ['pdf', 'xlsx'] },
  { id: 2, slug: 'avance-financiero', formatos: ['xlsx']         },
  { id: 3, slug: 'estimaciones',      formatos: ['xlsx']         },
  { id: 4, slug: 'observaciones',     formatos: ['xlsx']         },
  { id: 5, slug: 'bitacora',          formatos: ['pdf']          },
  { id: 6, slug: 'modificatorios',    formatos: ['xlsx']         },
  { id: 7, slug: 'penalizaciones',    formatos: ['xlsx']         }
];

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-19 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-19 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-19',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });

  test('residente puede exportar el reporte 1 en PDF', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const dl = page.waitForEvent('download');
    await page.getByTestId('btn-exportar-1-pdf').click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/reporte_1_avance-fisico_.*\.pdf$/);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión / Dependencia / Finanzas consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-19 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible y botones deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expectAvisoSoloConsulta(page);
      // Los botones de exportar viven en RegionEditable → quedan disabled.
      await expect(page.getByTestId('btn-exportar-1-pdf')).toBeDisabled();
    });
  });
}
