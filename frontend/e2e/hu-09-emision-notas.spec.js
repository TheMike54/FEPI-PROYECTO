// @ts-check
// E2E HU-09 — Emisión y respuesta de notas tipificadas con firma.
//
// La vista se RECONCILIÓ con el backend real (Sprint 2): UN emisor por nota
// (art. 125 RLOPSRM, el rol lo deduce el servidor por el equipo del contrato),
// folio correlativo del backend, inmutabilidad por trigger, y estado de
// aceptación derivado (tácita al vencer el plazo). Ya NO hay "firma conjunta de
// tres" ni folio/dummy en cliente.
//
// El flujo FUNCIONAL (emitir/responder/anular contra el backend) requiere
// backend + BD + login real; se valida en la suite de API (backend) y en una
// corrida Playwright dedicada. Aquí, como en el resto de specs de vista, se
// cubre el "shell" y los permisos, que es lo verificable sin sesión.
//
// PERMISOS[HU-09]: residente/contratista/supervision='E' · dependencia=null · finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  cardInInicioFor,
  expectMetadataAcademicaOculta
} from './_helpers.js';

const VIEW_PATH = '/bitacora/notas';
const TITULO = 'Emisión y respuesta de notas tipificadas con firma';
const SPRINT = 'Sprint 2';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-09 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-09 + Sprint 2', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-09');
    expect(text).toContain(SPRINT);
    expect(text).toContain('notas');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-09' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
  });

  test('criterios de aceptacion: los 3 textos al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const seccion = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Criterios de aceptación' })
    });
    await expect(seccion.getByText(/incorporar también otro tipo de nota/)).toBeVisible();
    await expect(seccion.getByText(/dice \/ debe decir/)).toBeVisible();
    await expect(seccion.getByText(/folio correlativo, fecha, firma del emisor/)).toBeVisible();
  });

  test('fundamento arts. 122, 123 y 125 RLOPSRM visible al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText(/Fundamento: arts\. 122, 123 y 125 RLOPSRM/)).toBeVisible();
  });

  // Sin sesión (modo proyecto) NO hay libro ni formulario: el libro y la emisión
  // viven sobre el backend, así que la vista pide iniciar sesión en modo aplicación.
  test('sin sesión, la vista solicita iniciar sesión (no hay selector de contrato)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText(/Inicia sesión en modo aplicación/)).toBeVisible();
    await expect(page.getByTestId('select-contrato')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Contratista / Supervisión ejecutan (shell + permisos)
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-09 — modo aplicacion (${rol.alias}: ejecuta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('sidebar muestra HU-09 y la vista carga sin metadata academica', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expectMetadataAcademicaOculta(page, {
        huId: 'HU-09',
        sprintLabel: SPRINT
      });
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
  test.describe(`HU-09 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-09 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
