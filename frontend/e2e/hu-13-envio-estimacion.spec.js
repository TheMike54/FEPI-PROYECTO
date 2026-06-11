// @ts-check
// E2E HU-13 (O7) — REVISIÓN Y AUTORIZACIÓN de la estimación por la RESIDENCIA (flujo real cableado).
//
// O7 (art. 54 LOPSRM, confirmado por el profe): se invirtió el flujo. El CONTRATISTA PRESENTA (HU-12);
// la RESIDENCIA REVISA y AUTORIZA aquí. La página EnvioEstimacion.jsx reusa POST /estimaciones-ciclo/
// estimacion/:id/enviar (sella enviada_en/por como SELLO DE AUTORIZACIÓN, avanza 'integrada'->'enviada'),
// pero el candado pasó de superintendente a RESIDENTE. Etiquetas: integrada="Presentada", enviada="Autorizada".
// Por eso ESTE spec ejercita el flujo real:
//   1. Solo una estimación 'Presentada' (integrada) es autorizable (botón Autorizar presente).
//   2. Al autorizar → estado 'Autorizada' + sello de fecha/hora + semáforo del plazo de PAGO (art. 54).
//   3. No se puede reautorizar (el botón desaparece tras autorizar).
//   4. En solo-consulta (contratista) no hay botón Autorizar.
//
// Datos: backend/scripts/seed_smoke_hu13.sql (contrato SMOKE-HU13-001, residente_id=1=residente@, EST-001
// integrada). El seed RESETEA EST-001 a 'integrada' en cada corrida.
//
// PERMISOS[HU-13] (O7): residente='E' · contratista/supervision='C' · dependencia/finanzas=null
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
const TITULO = 'Revisión y autorización de la estimación';

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

// beforeEach reseed: cada test que autoriza deja EST-001 'enviada'; reseed la restablece a 'integrada'.
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
// Acceso por rol (control de accesos HU-13 — O7: residente ejecuta).
// ===========================================================================

test.describe('HU-13 — acceso por rol', () => {
  test('Residente (E): la vista está en el Sidebar y carga', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
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
// Flujo real — la RESIDENCIA (residente del contrato semilla) AUTORIZA.
// ===========================================================================

test.describe('HU-13 — flujo real (Residencia autoriza la estimación)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
  });

  test('solo la estimación presentada es autorizable (botón presente)', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Presentada');
    // La fila presentada ofrece el botón Autorizar.
    await expect(fila.getByRole('button', { name: 'Autorizar estimación' })).toBeVisible();
  });

  test('autorizar sella la fecha, avanza a Autorizada, muestra semáforo de pago y ya no se reautoriza', async ({ page }) => {
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);

    await fila.getByRole('button', { name: 'Autorizar estimación' }).click();

    // La fila pasa a 'Autorizada' con sello de fecha/hora y el semáforo del plazo de PAGO (art. 54).
    await expect(fila).toContainText('Autorizada');
    await expect(fila.locator('[data-testid^="sello-autorizacion-"]')).toContainText('Autorizada el');
    await expect(fila.locator('[data-testid^="sello-autorizacion-"]')).toContainText('Pago: día');

    // No reautorizar: el botón Autorizar ya no existe en la fila.
    await expect(fila.getByRole('button', { name: 'Autorizar estimación' })).toHaveCount(0);
  });
});

// ===========================================================================
// Flujo real — Contratista (solo consulta): ve la estimación pero NO autoriza.
// ===========================================================================

test.describe('HU-13 — flujo real (Contratista solo consulta)', () => {
  test('contratista ve la estimación presentada pero sin botón Autorizar', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();

    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    const fila = filaPorLabel(page, EST1_LABEL);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Presentada');
    // Solo-consulta: ninguna fila ofrece el botón Autorizar + aviso global de solo lectura.
    await expect(page.getByRole('button', { name: 'Autorizar estimación' })).toHaveCount(0);
    await expectAvisoSoloConsulta(page);
  });
});
