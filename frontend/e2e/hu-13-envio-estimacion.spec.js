// @ts-check
// E2E HU-13 — Envío de la estimación (FLUJO REAL, página cableada al backend).
//
// La página EnvioEstimacion.jsx está cableada al backend real (Opción A): el envío sella
// enviada_en/por y avanza el estado 'integrada' -> 'enviada' vía
// POST /api/estimaciones-ciclo/estimacion/:id/enviar (solo el superintendente del contrato).
// Por eso ESTE spec ejercita el flujo real (login real + token), no el prototipo dummy:
//   1. Solo una estimación 'integrada' es enviable (botón Enviar presente).
//   2. Al enviar → estado 'Enviada' + sello de fecha/hora + semáforo del plazo (art. 54).
//   3. No se puede reenviar (el botón desaparece tras enviar).
//   4. En solo-consulta (residente) no hay botón Enviar.
//
// Como el resto de la suite con login real, requiere backend+BD (Docker local) y se salta en
// CI. Datos: backend/scripts/seed_smoke_hu13.sql (contrato SMOKE-HU13-001, EST-001 integrada).
// El seed RESETEA EST-001 a 'integrada' en cada corrida, así enviar no deja estado sucio para
// otras specs (además del unseed en afterAll); el contrato es dedicado y se borra al final.
//
// PERMISOS[HU-13]: contratista='E' · residente/supervision='C' · dependencia/finanzas=null
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
  sidebarLinkFor,
  expectAvisoSoloConsulta
} from './_helpers.js';

// login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'requiere backend+BD; se corre en local');

const VIEW_PATH = '/estimaciones/envio';
const TITULO = 'Envío de la estimación';

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

// beforeEach reseed: cada test que envía deja EST-001 'enviada'; reseed la restablece a
// 'integrada' para que el siguiente test parta de la precondición enviable.
test.beforeEach(() => { psqlFile(SEED); });
test.afterAll(() => { try { psqlFile(UNSEED); } catch { /* limpieza best-effort */ } });

// ---------------------------------------------------------------------------
// Locators / acciones reutilizables (data-testid REALES, id-independientes).
// ---------------------------------------------------------------------------

/** Filas de DATOS (la fila de "vacío" NO lleva testid fila-envio-*). */
const filasDatos = (page) => page.locator('tbody tr[data-testid^="fila-envio-"]');

/** Fila concreta por su etiqueta EST-00N (numero estable, id-independiente). */
const filaPorLabel = (page, label) => filasDatos(page).filter({ hasText: label });

/** Elige en el selector la opción cuyo texto contiene el folio; usa el value real (id). */
async function seleccionarContratoPorFolio(page, folio) {
  const select = page.getByTestId('select-contrato');
  await expect(select).toBeEnabled();
  const opcion = select.locator('option', { hasText: folio });
  await expect(opcion).toHaveCount(1);
  const value = await opcion.getAttribute('value');
  await select.selectOption(value);
}

// ===========================================================================
// Acceso por rol (control de accesos HU-13 — intacto tras el cableado).
// ===========================================================================

test.describe('HU-13 — acceso por rol', () => {
  test('Contratista (E): la vista está en el Sidebar y carga', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
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
// Flujo real — Contratista (= superintendente del contrato semilla) ENVÍA.
// ===========================================================================

test.describe('HU-13 — flujo real (Contratista envía su estimación)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
  });

  test('solo la estimación integrada es enviable (botón presente)', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Integrada');
    // La fila integrada ofrece el botón Enviar.
    await expect(fila.getByRole('button', { name: 'Enviar estimación' })).toBeVisible();
  });

  test('enviar sella la fecha, avanza a Enviada, muestra semáforo y ya no se puede reenviar', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);

    await fila.getByRole('button', { name: 'Enviar estimación' }).click();

    // La fila pasa a 'Enviada' con sello de fecha/hora y el semáforo del plazo (art. 54).
    await expect(fila).toContainText('Enviada');
    await expect(fila.locator('[data-testid^="sello-envio-"]')).toContainText('Enviada el');
    await expect(fila.locator('[data-testid^="semaforo-plazo-"]')).toContainText('Revisión: día');

    // No reenviar: el botón Enviar ya no existe en la fila.
    await expect(fila.getByRole('button', { name: 'Enviar estimación' })).toHaveCount(0);
  });
});

// ===========================================================================
// Flujo real — Residente (solo consulta): ve la estimación pero NO puede enviar.
// ===========================================================================

test.describe('HU-13 — flujo real (Residente solo consulta)', () => {
  test('residente ve la estimación integrada pero sin botón Enviar', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();

    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Integrada');
    // Solo-consulta: ninguna fila ofrece el botón Enviar + aviso global de solo lectura.
    await expect(page.getByRole('button', { name: 'Enviar estimación' })).toHaveCount(0);
    await expectAvisoSoloConsulta(page);
  });
});
