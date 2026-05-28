// @ts-check
// E2E HU-10 — Consulta y búsqueda de notas de bitácora.
//
// Cubre los checks distintivos:
//   · 5 filtros con AND (tipo, fecha desde/hasta, firmante, vínculo, palabra
//     clave ILIKE sin acentos).
//   · Limpiar resetea todos los filtros.
//   · El botón "Adjuntar a estimación" ya NO existe (función migrada a HU-12).
//   · Exportar descarga un .xlsx real con SheetJS.
//   · Permisos por rol.
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

// Total de notas en notasBitacoraDummy. Si cambias el dummy, recuerda actualizar.
const TOTAL_NOTAS = 12;

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

  test('criterios de aceptacion: los 2 textos nuevos al pie', async ({ page }) => {
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

  test('estado inicial: muestra todas las notas del libro', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    // Antes de pulsar Buscar, los filtros aplicados están vacíos -> todas.
    expect(await leerContador(page)).toBe(TOTAL_NOTAS);
  });

  // CHECK DISTINTIVO 1: filtro por Tipo aplicado con AND reduce el conjunto.
  test('filtro por Tipo reduce el conjunto al pulsar Buscar', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('filtro-tipo').selectOption('Instrucción');
    await page.getByTestId('btn-buscar').click();
    // 3 notas de tipo Instrucción en el dummy.
    expect(await leerContador(page)).toBe(3);
  });

  // CHECK DISTINTIVO 2: filtro Vínculo=Vinculadas.
  test('filtro Vinculo "Vinculadas" deja solo las que tienen vinculadaA', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('filtro-vinculo').selectOption('Vinculadas');
    await page.getByTestId('btn-buscar').click();
    // BIT-0003 y BIT-0008 son las únicas vinculadas en el dummy.
    expect(await leerContador(page)).toBe(2);
  });

  // CHECK DISTINTIVO 3: palabra clave ILIKE sin acentos — "excavacion"
  // (sin tilde) matchea "Excavación" en asunto y contenido de BIT-0005.
  test('palabra clave ILIKE sin acentos: "excavacion" encuentra "Excavación"', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('filtro-palabra').fill('excavacion');
    await page.getByTestId('btn-buscar').click();
    expect(await leerContador(page)).toBe(1);
  });

  // CHECK DISTINTIVO 4: AND de dos filtros — Tipo=Instrucción + palabra
  // "excavacion" = solo BIT-0005 (Instrucción que además habla de excavación).
  test('AND de Tipo + palabra clave reduce al subconjunto comun', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('filtro-tipo').selectOption('Instrucción');
    await page.getByTestId('filtro-palabra').fill('excavacion');
    await page.getByTestId('btn-buscar').click();
    expect(await leerContador(page)).toBe(1);
  });

  // CHECK DISTINTIVO 5: Limpiar resetea todos los filtros y vuelven todas.
  test('Limpiar resetea los filtros y vuelven todas las notas', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('filtro-tipo').selectOption('Instrucción');
    await page.getByTestId('btn-buscar').click();
    expect(await leerContador(page)).toBe(3);

    await page.getByTestId('btn-limpiar').click();
    expect(await leerContador(page)).toBe(TOTAL_NOTAS);
  });

  // CHECK DISTINTIVO 6: Export descarga un .xlsx con nombre notas_busqueda_*.
  test('Exportar descarga un archivo .xlsx de las notas seleccionadas', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    // Selecciona una sola nota — basta para activar el botón Exportar.
    await page
      .getByTestId('tabla-resultados')
      .locator('tbody tr')
      .first()
      .locator('input[type="checkbox"]')
      .check();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('btn-exportar').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^notas_busqueda_\d{4}-\d{2}-\d{2}\.xlsx$/);
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
