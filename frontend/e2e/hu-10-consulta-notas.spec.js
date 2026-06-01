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

const VIEW_PATH = '/bitacora/consulta';
const TITULO = 'Consulta y búsqueda de notas de bitácora';
const SPRINT = 'Sprint 3';

/** Lee el contador de resultados como entero. */
async function leerContador(page) {
  const txt = (await page.getByTestId('contador-resultados').textContent()) ?? '0';
  return parseInt(txt, 10);
}

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-10 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-10 + Sprint 3', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-10');
    expect(text).toContain(SPRINT);
    expect(text).toContain('notas');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-10' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
  });

  test('criterios de aceptacion: los 2 textos al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const seccion = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Criterios de aceptación' })
    });
    await expect(seccion.getByText(/tipo, fecha, firmante, vínculo y palabra clave/)).toBeVisible();
    await expect(seccion.getByText(/exportarlas en formato Excel/)).toBeVisible();
  });

  test('el boton "Adjuntar a estimacion" ya NO existe (funcion migrada a HU-12)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText('Adjuntar a estimación')).toHaveCount(0);
  });

  // Sin sesión: se invita a iniciarla y el selector de contrato queda deshabilitado
  // (los contratos se cargan del backend con el token del usuario).
  test('sin sesion: aviso de inicio y selector de contrato deshabilitado', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText(/Inicia sesión en modo aplicación/)).toBeVisible();
    await expect(page.getByTestId('select-contrato')).toBeDisabled();
  });

  // El formulario de filtros está presente y es utilizable; sin contrato cargado,
  // el contador de resultados es 0.
  test('formulario de filtros presente y utilizable; 0 resultados sin contrato', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('filtro-tipo')).toBeEnabled();
    await expect(page.getByTestId('filtro-palabra')).toBeEnabled();
    await expect(page.getByTestId('filtro-vinculo')).toBeEnabled();
    expect(await leerContador(page)).toBe(0);
  });

  // Limpiar es utilizable aunque no haya datos (resetea el formulario sin romper).
  test('Limpiar no rompe la vista sin datos', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('filtro-palabra').fill('excavacion');
    await page.getByTestId('btn-limpiar').click();
    await expect(page.getByTestId('filtro-palabra')).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-10 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-10 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
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
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
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
