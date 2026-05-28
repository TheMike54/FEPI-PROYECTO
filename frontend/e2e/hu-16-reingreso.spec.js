// @ts-check
// E2E HU-16 — Reingreso de estimación tras rechazo.
//
// Cubre el comportamiento del prototipo:
//   · Botones "Descargar PDF" y "Descargar Excel" disparan descargas reales
//     (jsPDF / SheetJS) con las observaciones de la versión rechazada.
//   · El botón "Reingresar estimación (nueva versión)" queda disabled hasta
//     que la textarea tenga texto Y la casilla de confirmación esté marcada.
//   · Al pulsarlo: aparece el banner verde de aviso-reingreso (v2 vinculada a
//     v1 rechazada, plazo no se reinicia) y la mini-tabla "Trazabilidad de
//     versiones" con la fila vN-1 → vN.
//
// PERMISOS[HU-16]: residente='C' · contratista='E' · supervision/dependencia/finanzas=null
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

const VIEW_PATH = '/estimaciones/reingreso';
const TITULO = 'Reingreso de estimación tras rechazo';
const SPRINT = 'Sprint 8';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-16 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-16 + Sprint 8', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-16');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Reingreso');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-16' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Contratista')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    // Uso frases que solo aparecen en los criterios; "histórico vinculado" se
    // repite en el subtítulo del histórico, así que apunto a las frases ancla
    // de cada criterio (que son distintas a los subtítulos de la vista).
    await expect(page.getByText('como bloque completo independiente y').first()).toBeVisible();
    await expect(page.getByText('descarga en PDF o Excel')).toBeVisible();
    await expect(page.getByText('sin reiniciar el plazo de presentación')).toBeVisible();
  });

  // CHECK DISTINTIVO 1: el botón "Reingresar" disabled hasta nota + confirm.
  test('boton Reingresar disabled hasta tener nota y confirmacion marcada', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const btn = page.getByTestId('btn-reingresar');
    await expect(btn).toBeDisabled();

    await page.getByTestId('textarea-nota').fill('Atendidas las 3 observaciones de la v1.');
    await expect(btn).toBeDisabled();

    await page.getByTestId('chk-confirmado').check();
    await expect(btn).toBeEnabled();

    // Quitar la confirmacion vuelve a disabled.
    await page.getByTestId('chk-confirmado').uncheck();
    await expect(btn).toBeDisabled();
  });

  // CHECK DISTINTIVO 2: descargas reales (jsPDF y SheetJS).
  test('Descargar PDF dispara descarga .pdf con observaciones', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const dl = page.waitForEvent('download');
    await page.getByTestId('btn-descargar-obs-pdf').click();
    const f = await dl;
    expect(f.suggestedFilename()).toMatch(/observaciones_.*\.pdf$/);
  });

  test('Descargar Excel dispara descarga .xlsx con observaciones', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const dl = page.waitForEvent('download');
    await page.getByTestId('btn-descargar-obs-excel').click();
    const f = await dl;
    expect(f.suggestedFilename()).toMatch(/observaciones_.*\.xlsx$/);
  });

  // CHECK DISTINTIVO 3: flujo de reingreso → banner verde + tabla de trazabilidad.
  test('flujo: completar nota + confirmar + reingresar → banner + trazabilidad', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await page.getByTestId('textarea-nota').fill('Atendidas las 3 observaciones.');
    await page.getByTestId('chk-confirmado').check();
    await page.getByTestId('btn-reingresar').click();

    const aviso = page.getByTestId('aviso-reingreso');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Nueva versión v2');
    await expect(aviso).toContainText('versión rechazada v1');
    await expect(aviso).toContainText('plazo de presentación NO se reinicia');

    const traza = page.getByTestId('tabla-trazabilidad');
    await expect(traza).toBeVisible();
    await expect(traza).toContainText('v1');
    await expect(traza).toContainText('Rechazada');
    await expect(traza).toContainText('v2');
    await expect(traza).toContainText('En proceso');

    // Tras reingresar, el boton queda disabled y la captura bloqueada.
    await expect(page.getByTestId('btn-reingresar')).toBeDisabled();
    await expect(page.getByTestId('textarea-nota')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-16 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-16 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-16',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });

  test('puede ejecutar el reingreso completo', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('textarea-nota').fill('Corregido eje 7-B y catálogo.');
    await page.getByTestId('chk-confirmado').check();
    await page.getByTestId('btn-reingresar').click();
    await expect(page.getByTestId('aviso-reingreso')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente consulta
// ---------------------------------------------------------------------------

test.describe('HU-16 — modo aplicacion (Residente: consulta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('aviso de solo consulta visible; boton de reingresar deshabilitado', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);

    await expectAvisoSoloConsulta(page);
    // RegionEditable solo deshabilita los descendientes; los nodos siguen en el
    // DOM. El boton de reingresar queda disabled.
    await expect(page.getByTestId('btn-reingresar')).toBeDisabled();
    await expect(page.getByTestId('textarea-nota')).toBeDisabled();
    // Las descargas viven fuera de RegionEditable.
    await expect(page.getByTestId('btn-descargar-obs-pdf')).toBeVisible();
    await expect(page.getByTestId('btn-descargar-obs-excel')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervisión / Dependencia / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-16 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-16 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
