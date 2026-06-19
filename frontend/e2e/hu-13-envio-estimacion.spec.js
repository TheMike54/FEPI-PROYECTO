// @ts-check
// E2E HU-13 — PRESENTACIÓN de la estimación por el CONTRATISTA (flujo real cableado).
//
// RECONCILIACIÓN O7↔HU-15 (11-jun): O7 había puesto aquí la autorización del residente porque HU-15 no
// existía; con HU-15 integrado, HU-13 REGRESA a su sentido original — el CONTRATISTA (superintendente)
// PRESENTA la estimación. La página EnvioEstimacion.jsx reusa POST /estimaciones-ciclo/estimacion/:id/enviar
// (sella enviada_en/por = la presentación, avanza 'integrada'->'enviada'), con el candado en el
// superintendente del contrato. Etiquetas: integrada="Integrada", enviada="Presentada". Por eso ESTE spec:
//   1. Solo una estimación 'Integrada' es presentable (botón Presentar presente).
//   2. Al presentar → estado 'Presentada' + sello de fecha/hora + semáforo de revisión (15 días, art. 54).
//   3. No se puede re-presentar (el botón desaparece tras presentar).
//   4. En solo-consulta (residente) no hay botón Presentar.
//
// Datos: backend/scripts/seed_smoke_hu13.sql (contrato SMOKE-HU13-001, superintendente_id=2=contratista@,
// EST-001 integrada). El seed RESETEA EST-001 a 'integrada' en cada corrida.
//
// PERMISOS[HU-13] (reconciliado): contratista='E' · residente/supervision='C' · dependencia/finanzas=null
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
  expectAvisoSoloConsulta
} from './_helpers.js';

// login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'requiere backend+BD; se corre en local');

const VIEW_PATH = '/estimaciones/envio';
const TITULO = 'Presentación de la estimación';

// Datos del seed (seed_smoke_hu13.sql).
const FOLIO_SEED = 'SMOKE-HU13-001';
const EST1_LABEL = 'EST-001';

// ---------------------------------------------------------------------------
// Seed/unseed vía el stack Docker (mismo mecanismo de HU-14 y de CLAUDE.md).
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../');
const SEED   = path.join(REPO_ROOT, 'backend/scripts/seed_smoke_hu13.sql');
const UNSEED = path.join(REPO_ROOT, 'backend/scripts/unseed_smoke_hu13.sql');

function psqlFile(file) {
  execSync('docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1', {
    input: readFileSync(file),
    stdio: ['pipe', 'ignore', 'pipe']
  });
}

// beforeEach reseed: cada test que presenta deja EST-001 'enviada'; reseed la restablece a 'integrada'.
test.beforeEach(() => { psqlFile(SEED); });
test.afterAll(() => { try { psqlFile(UNSEED); } catch { /* limpieza best-effort */ } });

// ---------------------------------------------------------------------------
// Locators / acciones reutilizables (data-testid REALES, id-independientes).
// ---------------------------------------------------------------------------
const filasDatos = (page) => page.locator('tbody tr[data-testid^="fila-envio-"]');
const filaPorLabel = (page, label) => filasDatos(page).filter({ hasText: label });

async function seleccionarContratoPorFolio(page, folio) {
  const select = page.getByTestId('select-contrato');
  await expect(select).toBeEnabled();
  const opcion = select.locator('option', { hasText: folio });
  await expect(opcion).toHaveCount(1);
  const value = await opcion.getAttribute('value');
  await select.selectOption(value);
}

// ===========================================================================
// Acceso por rol (control de accesos HU-13 — el contratista ejecuta).
// ===========================================================================

test.describe('HU-13 — acceso por rol', () => {
  test('Contratista (E): la vista está en el Sidebar y carga', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
  });

  for (const rol of [
    { id: 'dependencia', alias: 'Dependencia' },
    { id: 'finanzas',    alias: 'Finanzas'    }
  ]) {
    test(`${rol.alias} (sin acceso): HU-13 NO aparece en Sidebar ni en Inicio`, async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  }
});

// ===========================================================================
// Flujo real — el CONTRATISTA (superintendente del contrato semilla) PRESENTA.
// ===========================================================================

test.describe('HU-13 — flujo real (Contratista presenta la estimación)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
  });

  test('solo la estimación integrada es presentable (botón presente)', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Integrada');
    // La fila integrada ofrece el botón Presentar.
    await expect(fila.getByRole('button', { name: 'Presentar estimación' })).toBeVisible();
  });

  test('presentar sella la fecha, avanza a Presentada, muestra semáforo de revisión y ya no se re-presenta', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);

    await fila.getByRole('button', { name: 'Presentar estimación' }).click();

    // La fila pasa a 'Presentada' con sello de fecha/hora y el semáforo del plazo de REVISIÓN (HU-15, art. 54).
    await expect(fila).toContainText('Presentada');
    await expect(fila.locator('[data-testid^="sello-presentacion-"]')).toContainText('Presentada el');
    await expect(fila.locator('[data-testid^="sello-presentacion-"]')).toContainText('Revisión (HU-15): día');

    // No re-presentar: el botón Presentar ya no existe en la fila.
    await expect(fila.getByRole('button', { name: 'Presentar estimación' })).toHaveCount(0);
  });
});

// ===========================================================================
// Flujo real — Residente (solo consulta): ve la estimación pero NO presenta.
// ===========================================================================

test.describe('HU-13 — flujo real (Residente solo consulta)', () => {
  test('residente ve la estimación integrada pero sin botón Presentar', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();

    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Integrada');
    // Solo-consulta: ninguna fila ofrece el botón Presentar + aviso global de solo lectura.
    await expect(page.getByRole('button', { name: 'Presentar estimación' })).toHaveCount(0);
    await expectAvisoSoloConsulta(page);
  });
});
