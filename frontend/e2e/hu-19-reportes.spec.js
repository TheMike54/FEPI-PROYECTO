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
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-19 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-19 + Sprint 9', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-19');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Exportación');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-19' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Residente')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    // "7 reportes definidos" se repite como subtítulo de la tabla y como
    // comienzo del criterio 1. Uso el resto del criterio para anclar.
    await expect(page.getByText('genera un archivo descargable en el formato establecido')).toBeVisible();
    await expect(page.getByText('mensual, trimestral, acumulado')).toBeVisible();
  });

  test('selector de periodo muestra Mensual / Trimestral / Acumulado', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const sel = page.getByTestId('select-periodo-reporte');
    await expect(sel).toBeVisible();
    const options = await sel.locator('option').allTextContents();
    expect(options).toEqual(['Mensual', 'Trimestral', 'Acumulado']);
  });

  // CHECK DISTINTIVO: cada boton dispara una descarga real con extension y
  // patron de nombre esperados.
  for (const r of REPORTES) {
    for (const f of r.formatos) {
      test(`reporte ${r.id} formato ${f} dispara descarga con extension correcta`, async ({ page }) => {
        await goToViaSidebar(page, VIEW_PATH);
        const dl = page.waitForEvent('download');
        await page.getByTestId(`btn-exportar-${r.id}-${f === 'xlsx' ? 'excel' : 'pdf'}`).click();
        const file = await dl;
        const name = file.suggestedFilename();
        expect(name).toContain(`reporte_${r.id}_${r.slug}`);
        expect(name).toMatch(new RegExp(`\\.${f}$`));
        // Periodo default = Mensual.
        expect(name).toContain('_mensual_');
      });
    }
  }

  test('cambiar el periodo cambia la etiqueta del archivo descargado', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('select-periodo-reporte').selectOption('Trimestral');
    const dl = page.waitForEvent('download');
    await page.getByTestId('btn-exportar-1-pdf').click();
    const file = await dl;
    expect(file.suggestedFilename()).toContain('_trimestral_');
  });
});

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
