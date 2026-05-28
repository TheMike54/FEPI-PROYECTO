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

const VIEW_PATH = '/bitacora/minutas';

// Archivo "PDF" mínimo para pruebas de input file (no se sube; solo se captura
// el nombre).
const PDF_BUFFER = Buffer.from('%PDF-1.4\n%fake test pdf\n%%EOF\n', 'utf-8');

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-11 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-11 + Sprint 7', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-11');
    expect(text).toContain('Sprint 7');
    expect(text).toContain('Minutas y agenda de visitas');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y 3 pestanas', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await expect(page.getByRole('heading', { name: 'Minutas y agenda de visitas' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-11' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: 'Sprint 7' }).first()).toBeVisible();
    await expect(page.getByText('Rol: Residente')).toBeVisible();

    for (const tab of ['Minutas', 'Agenda de visitas', 'Acuerdos']) {
      await expect(page.locator('button', { hasText: tab }).first()).toBeVisible();
    }
  });

  test('estado de cada pestana persiste al cambiar de pestana', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    // Capturar valores en Minutas (pestaña activa por defecto).
    await page.getByTestId('min-asunto').fill('TEST PERSISTENCIA');
    await page.getByTestId('min-participantes').fill('Persona X, Persona Y');

    // Cambiar a Visitas y capturar.
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    await page.getByTestId('vis-proposito').fill('Propósito de prueba');

    // Pasar por Acuerdos (no captura, pero la pestaña debe montar).
    await page.locator('button', { hasText: 'Acuerdos' }).first().click();
    await expect(page.getByRole('heading', { name: 'Acuerdos y compromisos' })).toBeVisible();

    // Volver a Minutas — los inputs deben conservar lo escrito.
    await page.locator('button', { hasText: 'Minutas' }).first().click();
    await expect(page.getByTestId('min-asunto')).toHaveValue('TEST PERSISTENCIA');
    await expect(page.getByTestId('min-participantes')).toHaveValue('Persona X, Persona Y');

    // Volver a Visitas — la textarea también.
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    await expect(page.getByTestId('vis-proposito')).toHaveValue('Propósito de prueba');
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('Las minutas (con su PDF y metadatos)')).toBeVisible();
    await expect(page.getByText('Se pueden consultar los acuerdos y compromisos')).toBeVisible();
    await expect(page.getByText('puede adjuntarse como referencia en una nota de bitácora')).toBeVisible();
  });

  // CHECK DISTINTIVO 1 — Registrar minuta queda disabled hasta tener los 5
  // campos llenos + archivo PDF cargado.
  test('Registrar minuta: disabled hasta tener fecha+lugar+participantes+asunto+PDF', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const btn = page.getByTestId('btn-registrar-minuta');

    await expect(btn).toBeDisabled();

    await page.getByTestId('min-fecha').fill('2026-05-30');
    await expect(btn).toBeDisabled();
    await page.getByTestId('min-lugar').fill('Sala de juntas');
    await expect(btn).toBeDisabled();
    await page.getByTestId('min-participantes').fill('Residente, Supervisión');
    await expect(btn).toBeDisabled();
    await page.getByTestId('min-asunto').fill('Reunión de prueba');
    await expect(btn).toBeDisabled();

    await page.getByTestId('min-archivo').setInputFiles({
      name: 'acta_prueba.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_BUFFER
    });
    await expect(btn).toBeEnabled();
  });

  test('al registrar minuta: nueva fila MIN-003 arriba con datos capturados', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await page.getByTestId('min-fecha').fill('2026-05-30');
    await page.getByTestId('min-lugar').fill('Sala de juntas');
    await page.getByTestId('min-participantes').fill('Residente, Supervisión');
    await page.getByTestId('min-asunto').fill('Reunión de prueba');
    await page.getByTestId('min-archivo').setInputFiles({
      name: 'acta_prueba.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_BUFFER
    });
    await page.getByTestId('btn-registrar-minuta').click();

    const nueva = page.getByTestId('minuta-MIN-003');
    await expect(nueva).toBeVisible();
    await expect(nueva).toContainText('30/05/2026');
    await expect(nueva).toContainText('Sala de juntas');
    await expect(nueva).toContainText('Reunión de prueba');
    await expect(nueva).toContainText('acta_prueba.pdf');

    // Debe estar en la primera fila del tbody.
    const filas = page.locator('[data-testid="tabla-minutas"] tbody tr');
    await expect(filas.first()).toHaveAttribute('data-testid', 'minuta-MIN-003');

    // El formulario se limpia tras registrar.
    await expect(page.getByTestId('btn-registrar-minuta')).toBeDisabled();
  });

  // CHECK DISTINTIVO 2 — Agendar visita queda disabled hasta tener los 4 campos.
  test('Agendar visita: disabled hasta tener fecha+lugar+responsable+propósito', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();

    const btn = page.getByTestId('btn-agendar-visita');
    await expect(btn).toBeDisabled();

    await page.getByTestId('vis-fecha').fill('2026-06-10');
    await expect(btn).toBeDisabled();
    await page.getByTestId('vis-lugar').fill('Frente norte');
    await expect(btn).toBeDisabled();
    await page.getByTestId('vis-responsable').fill('Residente');
    await expect(btn).toBeDisabled();
    await page.getByTestId('vis-proposito').fill('Inspección de avance');
    await expect(btn).toBeEnabled();
  });

  test('al agendar visita: nueva fila VIS-004 arriba con badge Programada', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();

    await page.getByTestId('vis-fecha').fill('2026-06-10');
    await page.getByTestId('vis-lugar').fill('Frente norte');
    await page.getByTestId('vis-responsable').fill('Residente');
    await page.getByTestId('vis-proposito').fill('Inspección de avance');
    await page.getByTestId('btn-agendar-visita').click();

    const nueva = page.getByTestId('visita-VIS-004');
    await expect(nueva).toBeVisible();
    await expect(nueva).toContainText('10/06/2026');
    await expect(nueva).toContainText('Frente norte');
    await expect(nueva).toContainText('Residente');
    await expect(nueva).toContainText('Inspección de avance');
    await expect(nueva).toContainText('Programada');

    const filas = page.locator('[data-testid="tabla-visitas"] tbody tr');
    await expect(filas.first()).toHaveAttribute('data-testid', 'visita-VIS-004');
  });

  // CHECK DISTINTIVO 3 — Modal "adjuntar como referencia en nota" abre con
  // texto que apunta a HU-09 y cita el folio.
  test('botón "Adjuntar como referencia en nota" abre el modal HU-09', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await page.getByTestId('btn-adjuntar-MIN-001').click();
    const modal = page.getByTestId('modal-adjuntar-referencia');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Crear nota vinculada en HU-09');
    await expect(modal).toContainText('minuta MIN-001');

    await page.getByTestId('btn-modal-cerrar').click();
    await expect(modal).toHaveCount(0);

    // Lo mismo desde una visita.
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    await page.getByTestId('btn-adjuntar-VIS-001').click();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('visita VIS-001');
    await page.getByTestId('btn-modal-cerrar').click();
    await expect(modal).toHaveCount(0);
  });
});

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
