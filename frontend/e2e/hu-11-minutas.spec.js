// @ts-check
// E2E HU-11 — Minutas, agenda de visitas y consulta de acuerdos.
//
// Esta suite verifica que la vista respeta el contrato de modos/permisos:
//   - MODO PROYECTO: la card aparece con badge Sprint 7, las 3 pestanas funcionan,
//     el estado de cada formulario PERSISTE al cambiar de pestana (estado en el
//     padre — Tabs desmonta el contenido inactivo), y los criterios de aceptacion
//     se muestran al pie.
//   - MODO APLICACION: las 5 reglas de PERMISOS[HU-11]:
//       residente   -> ejecuta (forms editables)
//       contratista -> consulta (forms en RegionEditable disabled, filtro de
//                                Acuerdos sigue funcionando — NO va envuelto)
//       supervision -> consulta (igual que contratista)
//       dependencia -> sin acceso (no aparece en Sidebar ni en Inicio)
//       finanzas    -> sin acceso
//
// Los helpers comunes (freshHome, enterAppMode, goToViaSidebar, asserts) viven
// en ./_helpers.js — ver alli el header con los 3 fixes valiosos del port.

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

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-11 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    // Asegurarnos de estar en modo proyecto (initial state, pero idempotente).
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

    // Capturar valores en Minutas (pestana activa por defecto).
    const temaMinuta = page.locator('input[placeholder*="Reunión de avance"]').first();
    const asistentesMinuta = page.locator('input[placeholder*="Residente, Supervisión"]').first();
    await temaMinuta.fill('TEST PERSISTENCIA');
    await asistentesMinuta.fill('Persona X, Persona Y');

    // Cambiar a Visitas y capturar.
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    const objetivoVisita = page.locator('textarea[placeholder*="Descripción breve"]').first();
    await expect(objetivoVisita).toBeVisible();
    await objetivoVisita.fill('Objetivo de prueba');

    // Pasar por Acuerdos (no captura, pero verificamos que la pestana se monta).
    await page.locator('button', { hasText: 'Acuerdos' }).first().click();
    await expect(page.getByRole('heading', { name: 'Acuerdos y compromisos' })).toBeVisible();

    // Volver a Minutas — los inputs deben conservar lo escrito.
    await page.locator('button', { hasText: 'Minutas' }).first().click();
    await expect(page.locator('input[placeholder*="Reunión de avance"]').first()).toHaveValue('TEST PERSISTENCIA');
    await expect(page.locator('input[placeholder*="Residente, Supervisión"]').first()).toHaveValue('Persona X, Persona Y');

    // Volver a Visitas — la textarea tambien.
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    await expect(page.locator('textarea[placeholder*="Descripción breve"]').first()).toHaveValue('Objetivo de prueba');
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    // El heading 'Criterios de aceptación' es unico; el Sidebar tiene una
    // mencion en la leyenda que no debe contar como visibility de la seccion.
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('Las minutas y visitas registradas son visibles')).toBeVisible();
    await expect(page.getByText('Se pueden consultar los acuerdos y compromisos')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — los 5 roles
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

    const temaMinuta = page.locator('input[placeholder*="Reunión de avance"]').first();
    await expect(temaMinuta).toBeEnabled();

    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    await expect(page.locator('textarea[placeholder*="Descripción breve"]').first()).toBeEnabled();

    await expectSinAvisoSoloConsulta(page);
  });
});

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

      const temaMinuta = page.locator('input[placeholder*="Reunión de avance"]').first();
      await expect(temaMinuta).toBeDisabled();

      await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
      await expect(page.locator('textarea[placeholder*="Descripción breve"]').first()).toBeDisabled();
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
