// @ts-check
// E2E HU-12 — Apertura del periodo e integración de la estimación.
//
// Cubre los checks distintivos:
//   · Carátula calculada en vivo a partir de los números generadores.
//   · Cambio en una cantidad recalcula el total automáticamente.
//   · Bloqueo por exceso: cantidad acumulada > contratada deshabilita Integrar.
//   · Tab "Notas vinculadas": modal con filtros AND (mismos de HU-10), las
//     notas seleccionadas pasan a la tabla de notas vinculadas.
//   · Click "Integrar" muestra el banner aviso-integrada y oculta el botón.
//   · Permisos por rol.
//
// PERMISOS[HU-12]: contratista='E' · residente='C' · supervision='C' · dependencia=null · finanzas=null
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

const VIEW_PATH = '/estimaciones/integracion';
const TITULO = 'Apertura del periodo e integración de la estimación';
const SPRINT = 'Sprint 3';

/** Tab del componente Tabs (botón con el label pasado como prefijo). */
function tab(page, nombre) {
  return page.locator('button', { hasText: nombre }).first();
}

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-12 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-12 + Sprint 3', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-12');
    expect(text).toContain(SPRINT);
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-12' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Contratista')).toBeVisible();
  });

  test('criterios de aceptacion: los 3 textos nuevos al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const seccion = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Criterios de aceptación' })
    });
    await expect(seccion.getByText(/seleccionadas del buscador de bitácora/)).toBeVisible();
    await expect(seccion.getByText(/5 al millar, art\. 191 LFD/)).toBeVisible();
    await expect(seccion.getByText(/art\. 118 RLOPSRM/)).toBeVisible();
  });

  // CHECK DISTINTIVO 1: la carátula está calculada en vivo. Subtotal default:
  // 250×185.50 + 80×2150 + 12×28750 + 150×245 = 600,125.00. Total = subtotal
  // × (1 − 0.30 − 0.005) = 417,086.88.
  test('caratula calculada en vivo: total cambia al editar un generador', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    // Tab Carátula activo por defecto.
    await expect(page.getByTestId('caratula-total')).toContainText('417,086');

    // Cambiar la cantidad del primer generador a 0.
    await tab(page, 'Números generadores').click();
    await page.getByTestId('gen-periodo-0').fill('0');

    // Volver a Carátula.
    await tab(page, 'Carátula').click();
    // Subtotal nuevo: 0 + 172,000 + 345,000 + 36,750 = 553,750.
    // Total: 553,750 × 0.695 = 384,856.25.
    await expect(page.getByTestId('caratula-total')).toContainText('384,856');
  });

  // CHECK DISTINTIVO 2: bloqueo por exceso. Acumulado del concepto 0:
  // anteriorAcum=350 + periodo=700 = 1050 > contratado=1000 → excede.
  test('bloqueo por exceso: gen acumulado > contratado deshabilita Integrar', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await tab(page, 'Números generadores').click();
    await page.getByTestId('gen-periodo-0').fill('700');

    await expect(page.getByTestId('aviso-exceso')).toBeVisible();
    await expect(page.getByTestId('btn-integrar')).toBeDisabled();
  });

  // CHECK DISTINTIVO 3: integrar con valores OK muestra el banner aviso-integrada
  // y desaparece el botón.
  test('Integrar con valores OK muestra aviso-integrada y oculta el boton', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const btn = page.getByTestId('btn-integrar');
    await expect(btn).toBeEnabled();

    await btn.click();

    await expect(page.getByTestId('aviso-integrada')).toBeVisible();
    await expect(page.getByTestId('btn-integrar')).toHaveCount(0);
  });

  // CHECK DISTINTIVO 4: modal del buscador de notas con filtros AND. Las notas
  // seleccionadas se vinculan a la estimación y aparecen en su tabla.
  test('modal de notas: filtra, selecciona, confirma y queda vinculada', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await tab(page, 'Notas vinculadas').click();
    await expect(page.getByTestId('tabla-notas-vinculadas')).toContainText('Sin notas vinculadas');

    await page.getByTestId('btn-abrir-buscador-notas').click();
    const modal = page.getByTestId('modal-buscar-notas');
    await expect(modal).toBeVisible();

    // Filtros por defecto: mayo 2026. Filtrar tipo Acuerdo (2 notas en mayo:
    // BIT-0004 y BIT-0009).
    await page.getByTestId('mb-tipo').selectOption('Acuerdo');
    const filas = page.getByTestId('mb-tabla-resultados').locator('tbody tr');
    await expect(filas).toHaveCount(2);

    // Seleccionar la primera y confirmar.
    await filas.first().locator('input[type="checkbox"]').check();
    await page.getByTestId('mb-btn-confirmar').click();

    // Modal cerrado y la nota aparece como vinculada.
    await expect(page.getByTestId('modal-buscar-notas')).toHaveCount(0);
    await expect(page.getByTestId('tabla-notas-vinculadas')).toContainText('BIT-0004');
  });

  // CHECK DISTINTIVO 5: dentro del modal, palabra clave ILIKE sin acentos.
  test('modal: palabra clave "excavacion" sin acento encuentra BIT-0005', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await tab(page, 'Notas vinculadas').click();
    await page.getByTestId('btn-abrir-buscador-notas').click();

    await page.getByTestId('mb-palabra').fill('excavacion');
    const filas = page.getByTestId('mb-tabla-resultados').locator('tbody tr');
    await expect(filas).toHaveCount(1);
    await expect(filas.first()).toContainText('BIT-0005');
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-12 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-12 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-12',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Supervisión consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-12 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; inputs deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await tab(page, 'Números generadores').click();
      await expect(page.getByTestId('gen-periodo-0')).toBeDisabled();
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
  test.describe(`HU-12 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-12 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
