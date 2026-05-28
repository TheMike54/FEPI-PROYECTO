// @ts-check
// E2E HU-17 — Tablero de estimaciones del contrato.
//
// Cubre el comportamiento del prototipo:
//   · Indicadores agregados arriba del tablero (avance físico %, monto total,
//     monto pagado, monto pendiente, días promedio en cada estado).
//   · Cada tarjeta muestra la línea de tiempo del estado (mini-stepper) y el
//     responsable.
//   · Filtros por estado, periodo y responsable funcionan con lógica Y.
//   · El panel "Mis pendientes" muestra los pendientes del rol activo (o del
//     residente en modo proyecto).
//
// PERMISOS[HU-17]: residente='E' · contratista/supervision/dependencia='C' · finanzas=null
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

const VIEW_PATH = '/estimaciones/tablero';
const TITULO = 'Tablero de estimaciones';
const SPRINT = 'Sprint 8';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-17 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-17 + Sprint 8', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-17');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Tablero de estimaciones');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-17' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Residente')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('solo estimaciones aceptadas y en proceso')).toBeVisible();
    await expect(page.getByText('línea de tiempo de estado')).toBeVisible();
    // "Mis pendientes" aparece como heading y dentro de un parrafo descriptivo.
    // Apunto a una frase exclusiva del criterio.
    await expect(page.getByText('filtra los pendientes según el rol del usuario autenticado')).toBeVisible();
  });

  // CHECK DISTINTIVO 1: indicadores agregados visibles.
  test('indicadores agregados del contrato visibles', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('indicadores-agregados')).toBeVisible();
    await expect(page.getByTestId('kpi-avance-fisico')).toContainText('78%');
    await expect(page.getByTestId('kpi-monto-total')).toBeVisible();
    await expect(page.getByTestId('kpi-monto-pagado')).toBeVisible();
    await expect(page.getByTestId('kpi-monto-pendiente')).toBeVisible();
    await expect(page.getByTestId('dias-promedio-estado')).toBeVisible();
  });

  // CHECK DISTINTIVO 2: cada tarjeta lleva su mini-stepper.
  test('tarjetas de estimacion con linea de tiempo visible', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    for (const num of [1, 2, 3, 4, 5]) {
      const card = page.getByTestId(`tarjeta-est-${num}`);
      await expect(card).toBeVisible();
      await expect(card.locator('[aria-label^="Línea de tiempo"]')).toBeVisible();
    }
  });

  // CHECK DISTINTIVO 3: filtros aplican con logica Y.
  test('filtros por estado/periodo/responsable acotan el tablero', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    // Filtro por estado "Presentada" → solo EST 5.
    await page.getByTestId('filtro-estado').selectOption('Presentada');
    await expect(page.getByTestId('tarjeta-est-5')).toBeVisible();
    await expect(page.getByTestId('tarjeta-est-1')).toHaveCount(0);
    await expect(page.getByTestId('tarjeta-est-4')).toHaveCount(0);

    // Estado=Presentada + Periodo=Feb 2026 → ninguna.
    await page.getByTestId('filtro-periodo').selectOption('Feb 2026');
    await expect(page.getByTestId('tablero-vacio')).toBeVisible();

    // Estado=Presentada + Periodo=May 2026 + Responsable=residente → EST 5.
    await page.getByTestId('filtro-periodo').selectOption('May 2026');
    await page.getByTestId('filtro-responsable').selectOption('residente');
    await expect(page.getByTestId('tarjeta-est-5')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-17 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-17 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-17',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });

  test('panel Mis pendientes muestra pendientes del residente', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText('Estimación 3 espera tu autorización')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista', pendiente: 'Estimación 5 presentada, en espera de revisión' },
  { id: 'supervision', alias: 'Supervisión', pendiente: 'Estimación 4 espera tu revisión técnica' },
  { id: 'dependencia', alias: 'Dependencia', pendiente: 'Estimación 2 lista para programar el pago' }
]) {
  test.describe(`HU-17 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test(`Mis pendientes muestra los del rol ${rol.alias}`, async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByText(rol.pendiente)).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-17 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-17 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
