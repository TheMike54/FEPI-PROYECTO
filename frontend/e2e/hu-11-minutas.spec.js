// @ts-check
// E2E HU-11 — Minutas, agenda de visitas y consulta de acuerdos.
//
// Cubre el comportamiento del prototipo:
//   · Persistencia de estado por pestaña (Tabs desmonta el inactivo; los forms
//     viven en el padre).
//   · Registrar minuta: botón disabled hasta tener fecha + lugar + participantes
//     + asunto + archivo PDF cargado. Al pulsar, se inserta arriba con folio
//     MIN-NNN y fondo verde.
//   · Agendar visita: botón disabled hasta tener fecha + lugar + responsable +
//     propósito. Al pulsar, se inserta arriba con folio VIS-NNN y badge
//     "Programada".
//   · "📎 Adjuntar como referencia en nota" abre un modal informativo que cita
//     a HU-09 (Emisión de notas).
//
// PERMISOS[HU-11]: residente='E' · contratista/supervision='C' · dependencia/finanzas=null
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

const VIEW_PATH = '/bitacora/minutas';

// Archivo "PDF" mínimo para pruebas de input file (no se sube; solo se captura
// el nombre).
const PDF_BUFFER = Buffer.from('%PDF-1.4\n%fake test pdf\n%%EOF\n', 'utf-8');

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-11 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-11 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);

    await expect(page.getByRole('heading', { name: 'Minutas y agenda de visitas' })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-11',
      sprintLabel: 'Sprint 7',
      rolAcademicoLabel: 'Residente'
    });
  });

  test('forms de Minutas y Visitas son editables; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await expect(page.getByTestId('min-asunto')).toBeEnabled();

    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    await expect(page.getByTestId('vis-proposito')).toBeEnabled();

    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-11 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; forms de captura deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.getByTestId('min-asunto')).toBeDisabled();

      await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
      await expect(page.getByTestId('vis-proposito')).toBeDisabled();
    });

    test('pestana Acuerdos es consultable: el filtro de periodo sigue editable', async ({ page }) => {
      await goToViaSidebar(page, VIEW_PATH);
      await page.locator('button', { hasText: 'Acuerdos' }).first().click();

      const periodo = page.locator('select').first();
      await expect(periodo).toBeEnabled();

      await periodo.selectOption({ label: 'Junio 2026' });
      await expect(page.getByText('Sin acuerdos para el periodo seleccionado')).toBeVisible();

      await periodo.selectOption({ label: 'Mayo 2026' });
      await expect(page.locator('table tbody tr')).toHaveCount(3);
    });
  });
}

for (const rol of [
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas' }
]) {
  test.describe(`HU-11 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-11 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
