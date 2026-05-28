// @ts-check
// E2E HU-14 — Historial de estimaciones del contrato.
//
// Cubre el comportamiento del prototipo:
//   · Filtros por periodo, estado y combinación (lógica Y).
//   · Click en fila abre el panel-detalle-estimacion-{id} con el expediente
//     compacto (incluye lista de observaciones cuando la estimación fue
//     rechazada, "Sin observaciones" cuando no).
//   · Botón "Exportar historial" genera un .xlsx real (SheetJS) con las filas
//     filtradas — verificamos que dispara un download.
//
// PERMISOS[HU-14]: residente='E' · contratista/dependencia='C' · supervision/finanzas=null
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

const VIEW_PATH = '/estimaciones/historial';
const TITULO = 'Historial de estimaciones del contrato';
const SPRINT = 'Sprint 5';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-14 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-14 + Sprint 5', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-14');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Historial de estimaciones');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-14' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Residente')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('en orden cronológico, incluyendo las versiones rechazadas')).toBeVisible();
    await expect(page.getByText('por periodo, estado o ambos combinados')).toBeVisible();
    await expect(page.getByText('puede abrirse para ver su expediente completo')).toBeVisible();
  });

  test('lista las 4 filas del dummy (3 versiones del periodo May + 1 de Abr)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const filas = page.locator('[data-testid="tabla-historial"] tbody tr');
    await expect(filas).toHaveCount(4);
    await expect(page.getByTestId('fila-historial-EST-2026-001-v1')).toBeVisible();
    await expect(page.getByTestId('fila-historial-EST-2026-002-v1')).toBeVisible();
    await expect(page.getByTestId('fila-historial-EST-2026-002-v2')).toBeVisible();
    await expect(page.getByTestId('fila-historial-EST-2026-003-v1')).toBeVisible();
  });

  test('filtros: periodo + estado (lógica Y)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    // Solo Abr 2026: una fila (EST-2026-001 v1).
    await page.getByTestId('he-periodo').selectOption('Abr 2026');
    const filas = page.locator('[data-testid="tabla-historial"] tbody tr');
    await expect(filas).toHaveCount(1);
    await expect(page.getByTestId('fila-historial-EST-2026-001-v1')).toBeVisible();

    // Abr 2026 + Rechazada: ninguna (no hay rechazadas en abril).
    await page.getByTestId('he-estado').selectOption('Rechazada');
    await expect(page.getByText('Sin estimaciones con los filtros aplicados')).toBeVisible();

    // Todos + Rechazada: solo la v1 de EST-2026-002.
    await page.getByTestId('he-periodo').selectOption('Todos');
    await expect(filas).toHaveCount(1);
    await expect(page.getByTestId('fila-historial-EST-2026-002-v1')).toBeVisible();
  });

  // CHECK DISTINTIVO 1: click en fila abre el drawer con el expediente.
  test('click en fila abre panel-detalle-estimacion con expediente completo', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('fila-historial-EST-2026-002-v1').click();

    const panel = page.getByTestId('panel-detalle-estimacion-EST-2026-002-v1');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('EST-2026-002');
    await expect(panel).toContainText('v1');
    await expect(panel).toContainText('Rechazada');
    await expect(panel).toContainText('12/05/2026');     // presentación
    await expect(panel).toContainText('14/05/2026');     // revisión
    // Pago: no aplica para rechazada → guion.
    // Observaciones de la rechazada.
    await expect(panel).toContainText('Diferencia en números generadores');

    // Cerrar con la X.
    await page.getByTestId('btn-cerrar-detalle').click();
    await expect(panel).toHaveCount(0);
  });

  test('detalle de una Aceptada muestra fecha de pago y sin observaciones', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('fila-historial-EST-2026-001-v1').click();

    const panel = page.getByTestId('panel-detalle-estimacion-EST-2026-001-v1');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Aceptada');
    await expect(panel).toContainText('15/04/2026');     // pago
    await expect(panel).toContainText('Sin observaciones registradas');
  });

  // CHECK DISTINTIVO 2: el botón "Exportar historial" dispara un download
  // (SheetJS XLSX.writeFile).
  test('Exportar historial dispara descarga .xlsx', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('btn-exportar-historial').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/historial_.*\.xlsx$/);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-14 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-14 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-14',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Dependencia consultan (vista consultativa)
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-14 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('la vista es accesible y los filtros funcionan', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      // Esta vista es 100% consultativa (no tiene captura editable), así que
      // los filtros operan igual para C que para E.
      await expect(page.getByTestId('he-periodo')).toBeEnabled();
      await page.getByTestId('he-periodo').selectOption('May 2026');
      const filas = page.locator('[data-testid="tabla-historial"] tbody tr');
      await expect(filas).toHaveCount(3);
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervision / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-14 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-14 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
