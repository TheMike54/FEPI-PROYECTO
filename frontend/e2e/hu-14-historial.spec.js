// @ts-check
// E2E HU-14 — Historial de estimaciones del contrato (FLUJO REAL, página cableada).
//
// La página HistorialEstimaciones.jsx está cableada al backend real (Opción A): el
// ciclo de cobro se modela con columnas de `estimaciones` y el historial se sirve por
// GET /api/estimaciones-ciclo/contrato/:id/historial, acotado por participación. Por
// eso ESTE spec ejercita el flujo real (login real + token), no el prototipo dummy:
//   1. Antes de elegir contrato, los filtros NO existen (se montan al seleccionar).
//   2. Elegir el contrato semilla muestra la fila real EST-001 (Integrada, $34,750.00).
//   3. Los filtros operan con lógica Y sobre opciones DERIVADAS de los datos.
//   4. Una fila se abre en el panel/expediente.
//   5. Un contrato sin estimaciones cae en estado vacío, sin error.
//
// Como el resto de la suite con login real, requiere backend+BD (Docker local) y se
// salta en CI. Datos: backend/scripts/seed_smoke_hu14.sql (contrato SMOKE-HU14-001).
//
// PERMISOS[HU-14]: residente='E' · contratista/dependencia='C' · supervision/finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor
} from './_helpers.js';

// login real → requiere backend+BD; se corre en local (no en CI), igual que hu-registro.
test.skip(!!process.env.CI, 'requiere backend+BD; se corre en local');

const VIEW_PATH = '/estimaciones/historial';
const TITULO = 'Historial de estimaciones del contrato';

// Datos del seed (seed_smoke_hu14.sql): contrato con 2 estimaciones.
const FOLIO_SEED   = 'SMOKE-HU14-001';
const FOLIO_VACIO  = 'OP-2026-DEMO-001';   // contrato demo de schema.sql, SIN estimaciones
const EST1_LABEL   = 'EST-001';
const EST1_PERIODO = 'Ene 2026';           // periodoLabel('2026-01-01') (es-MX, UTC)
const EST1_ESTADO  = 'integrada';          // value del <option> de he-estado
const EST1_IMPORTE = '$34,750.00';         // moneda(34750)
const EST2_ESTADO  = 'rechazada';          // EST-002, otro periodo/estado (para la lógica Y)

// ---------------------------------------------------------------------------
// Seed/unseed vía el stack Docker (mismo mecanismo documentado en CLAUDE.md:
// `docker exec -i sigecop_db psql ...`). Idempotente; el unseed limpia al final.
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../');
const SEED   = path.join(REPO_ROOT, 'backend/scripts/seed_smoke_hu14.sql');
const UNSEED = path.join(REPO_ROOT, 'backend/scripts/unseed_smoke_hu14.sql');

function psqlFile(file) {
  execSync('docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1', {
    input: readFileSync(file),
    stdio: ['pipe', 'ignore', 'pipe']
  });
}

test.beforeAll(() => { psqlFile(SEED); });
test.afterAll(() => { try { psqlFile(UNSEED); } catch { /* limpieza best-effort */ } });

// ---------------------------------------------------------------------------
// Locators / acciones reutilizables (data-testid REALES de la página).
// ---------------------------------------------------------------------------

/** Filas de DATOS de la tabla (la fila de "vacío" NO lleva testid fila-historial-*). */
const filasDatos = (page) => page.locator('tbody tr[data-testid^="fila-historial-"]');

/** Fila concreta por su etiqueta de estimación (id-independiente: numero es estable). */
const filaPorLabel = (page, label) => filasDatos(page).filter({ hasText: label });

/**
 * Elige en el selector la opción cuyo texto contiene el folio (la opción combina
 * `folio · objeto`); usa el value real (id del contrato), sin asumir el número.
 */
async function seleccionarContratoPorFolio(page, folio) {
  const select = page.getByTestId('select-contrato');
  await expect(select).toBeEnabled();
  const opcion = select.locator('option', { hasText: folio });
  await expect(opcion).toHaveCount(1);
  const value = await opcion.getAttribute('value');
  await select.selectOption(value);
}

// ===========================================================================
// Acceso por rol (control de accesos HU-14 — sigue intacto tras el cableado).
// ===========================================================================

test.describe('HU-14 — acceso por rol', () => {
  test('Residente (E): la vista está en el Sidebar y carga', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
  });

  for (const rol of [
    { id: 'supervision', alias: 'Supervisión' },
    { id: 'finanzas',    alias: 'Finanzas'    }
  ]) {
    test(`${rol.alias} (sin acceso): HU-14 NO aparece en Sidebar ni en Inicio`, async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  }
});

// ===========================================================================
// Flujo real — Contratista (= superintendente del contrato semilla, ve SU contrato).
// ===========================================================================

test.describe('HU-14 — flujo real (Contratista consulta su contrato)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
  });

  test('antes de elegir contrato, los filtros NO existen', async ({ page }) => {
    // El bloque de Filtros y la tabla se montan SOLO con un contrato seleccionado.
    await expect(page.getByTestId('he-periodo')).toHaveCount(0);
    await expect(page.getByTestId('he-estado')).toHaveCount(0);
    await expect(page.getByTestId('tabla-historial')).toHaveCount(0);
    // Sí está el selector y la guía de "selecciona un contrato".
    await expect(page.getByTestId('select-contrato')).toBeEnabled();
    await expect(page.getByText('Selecciona un contrato para ver el historial')).toBeVisible();
  });

  test('elegir el contrato semilla muestra la fila real EST-001', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);

    // Al seleccionar, los filtros se montan…
    await expect(page.getByTestId('he-periodo')).toBeVisible();
    await expect(page.getByTestId('he-estado')).toBeVisible();

    // …y aparece la fila real de EST-001 con su estado e importe del backend.
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Integrada');
    await expect(fila).toContainText(EST1_IMPORTE);
  });

  test('filtros con lógica Y: combo que matchea deja la fila; combo cruzado deja 0', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    await expect(filaPorLabel(page, EST1_LABEL)).toHaveCount(1); // espera a que cargue el historial

    // (a) Combo que SÍ matchea EST-001 (su periodo Y su estado) → queda 1 fila: EST-001.
    await page.getByTestId('he-periodo').selectOption(EST1_PERIODO);
    await page.getByTestId('he-estado').selectOption(EST1_ESTADO);
    await expect(filasDatos(page)).toHaveCount(1);
    await expect(filaPorLabel(page, EST1_LABEL)).toBeVisible();
    await expect(page.getByText('Resultados (1)')).toBeVisible();

    // (b) Combo CRUZADO (periodo de EST-001 + estado de EST-002): ninguna fila cumple
    //     AMBOS → 0 filas (demuestra la conjunción, no la disyunción).
    await page.getByTestId('he-estado').selectOption(EST2_ESTADO);
    await expect(filasDatos(page)).toHaveCount(0);
    await expect(page.getByText('Sin estimaciones con los filtros aplicados.')).toBeVisible();
    await expect(page.getByText('Resultados (0)')).toBeVisible();
  });

  test('abrir una fila muestra su expediente en el panel', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);
    await fila.click();

    // El drawer del expediente se abre (panel-detalle-estimacion-<id>, id-independiente).
    const panel = page.locator('[data-testid^="panel-detalle-estimacion-"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Expediente');
    await expect(panel).toContainText(EST1_LABEL);
    // Y se puede cerrar.
    await page.getByTestId('btn-cerrar-detalle').click();
    await expect(panel).toHaveCount(0);
  });
});

// ===========================================================================
// Flujo real — Dependencia (ve TODO): contrato semilla + caso vacío.
// ===========================================================================

test.describe('HU-14 — flujo real (Dependencia ve todo)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
  });

  test('puede consultar el contrato semilla y ve EST-001', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText(EST1_IMPORTE);
  });

  test('caso vacío: un contrato sin estimaciones muestra estado vacío, sin error', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_VACIO);

    // El contrato carga (filtros montados) pero el historial viene vacío.
    await expect(page.getByTestId('he-periodo')).toBeVisible();
    await expect(filasDatos(page)).toHaveCount(0);
    await expect(page.getByText('Sin estimaciones con los filtros aplicados.')).toBeVisible();
    await expect(page.getByText('Resultados (0)')).toBeVisible();

    // No se disparó el toast de error de carga.
    await expect(page.getByText('No se pudo cargar el historial')).toHaveCount(0);
  });
});
