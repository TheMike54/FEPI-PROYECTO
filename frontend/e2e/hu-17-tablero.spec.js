// @ts-check
// E2E HU-17 — Tablero de estimaciones (FLUJO REAL: login + backend + BD).
//
// Reescrito desde el prototipo dummy al endpoint real GET /api/tablero/estimaciones.
// La vista es AGREGADA y de SOLO LECTURA; el backend acota por participación
// (lib/acceso.js) y calcula conteos/montos server-side. Este spec siembra dos
// contratos (SMK17-001 = el equipo es parte; SMK17-002 = ajeno) con estimaciones
// en varios estados y verifica:
//   · El grid muestra las estimaciones aceptadas/en proceso y EXCLUYE la rechazada (CA-1).
//   · Los montos (neto) llegan cuadrados server-side (formateados en la tarjeta).
//   · "Mis pendientes" CAMBIA según el rol (reconciliación O7↔HU-15: el contratista PRESENTA lo 'integrada'
//     y reingresa lo 'rechazada'; supervisión/residencia revisa-autoriza lo 'enviada'/Presentada (HU-15)).
//   · ACOTAMIENTO: un operativo (residente) NO ve el contrato ajeno; dependencia
//     (ve todo) SÍ lo ve.
//   · Finanzas no tiene acceso a la HU (PERMISOS[HU-17].finanzas = null).
//
// PERMISOS[HU-17]: residente='E' · contratista/supervision/dependencia='C' · finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { freshHome, enterAppMode, goToViaSidebar, sidebarLinkFor } from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/estimaciones/tablero';
const TITULO = 'Tablero de estimaciones';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(__dirname, '../../backend/scripts');

/** Corre un .sql contra la BD del stack local vía `docker exec -i sigecop_db psql`. */
function runSql(file) {
  const sql = readFileSync(path.join(SEED_DIR, file));
  execFileSync(
    'docker',
    ['exec', '-i', 'sigecop_db', 'psql', '-U', 'sigecop', '-d', 'sigecop_db', '-v', 'ON_ERROR_STOP=1', '-q'],
    { input: sql, stdio: ['pipe', 'ignore', 'inherit'] }
  );
}

test.beforeAll(() => runSql('seed_smoke_hu17.sql'));
test.afterAll(() => runSql('unseed_smoke_hu17.sql'));

// Tarjetas sembradas del contrato del que el equipo ES parte (SMK17-001).
const card = (numero) => `[data-testid="tarjeta-est-SMK17-001-${numero}"]`;
const cardAjeno = (numero) => `[data-testid="tarjeta-est-SMK17-002-${numero}"]`;

// ---------------------------------------------------------------------------
// Residente (ejecuta): ve SU contrato, no el ajeno; pendiente = revisar lo enviado.
// ---------------------------------------------------------------------------
test.describe('HU-17 — Residente (es parte de SMK17-001)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
  });

  test('grid muestra las 4 estimaciones en proceso y EXCLUYE la rechazada (CA-1)', async ({ page }) => {
    // #1..#4 (pagada/autorizada/enviada/integrada) están; #5 (rechazada) NO.
    await expect(page.locator(card(1))).toBeVisible();
    await expect(page.locator(card(2))).toBeVisible();
    await expect(page.locator(card(3))).toBeVisible();
    await expect(page.locator(card(4))).toBeVisible();
    await expect(page.locator(card(5))).toHaveCount(0);
    // El contador de rechazadas SÍ refleja la métrica (≥ 1 sembrada).
    await expect(page.getByTestId('contador-estado-rechazada')).toContainText('1');
  });

  test('el monto neto llega cuadrado server-side (tarjeta pagada = $199,000.00)', async ({ page }) => {
    await expect(page.locator(card(1))).toContainText('$ 199,000.00');
  });

  test('Mis pendientes (residente) = revisar/autorizar la presentada (#3), no las del contratista', async ({ page }) => {
    // Reconciliación O7↔HU-15: la supervisión/residencia revisa y autoriza lo PRESENTADO ('enviada' = #3, HU-15).
    // Aserción por PRESENCIA/ROL (no por total): la BD puede traer datos de otras corridas.
    const mis = page.getByTestId('mis-pendientes');
    await expect(mis).toContainText('SMK17-001 · Estimación N.º 3');
    await expect(mis).toContainText('autorizar');
    // #4 (integrada → la PRESENTA el contratista) y #5 (rechazada → la reingresa el contratista) NO son del residente.
    await expect(mis).not.toContainText('SMK17-001 · Estimación N.º 4');
    await expect(mis).not.toContainText('SMK17-001 · Estimación N.º 5');
  });

  test('ACOTAMIENTO: NO ve el contrato ajeno (SMK17-002)', async ({ page }) => {
    await expect(page.locator(cardAjeno(1))).toHaveCount(0);
    await expect(page.locator(cardAjeno(2))).toHaveCount(0);
    // Y ningún pendiente referencia el contrato ajeno.
    await expect(page.getByTestId('mis-pendientes')).not.toContainText('SMK17-002');
  });
});

// ---------------------------------------------------------------------------
// Contratista (consulta, pero ES superintendente de SMK17-001): reconciliación O7↔HU-15 — PRESENTA la
// integrada (#4, HU-13) y reingresa la rechazada (#5, HU-16).
// ---------------------------------------------------------------------------
test.describe('HU-17 — Contratista (superintendente de SMK17-001)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, VIEW_PATH);
  });

  test('Mis pendientes (contratista) = presentar la integrada (#4) y reingresar la rechazada (#5)', async ({ page }) => {
    // Presencia, no total (la BD puede traer estimaciones de otras corridas).
    const mis = page.getByTestId('mis-pendientes');
    await expect(mis).toContainText('SMK17-001 · Estimación N.º 4');
    await expect(mis).toContainText('Presentar');
    await expect(mis).toContainText('SMK17-001 · Estimación N.º 5');
    await expect(mis).toContainText('Reingresar');
    // La #3 (presentada/'enviada') la revisa/autoriza la supervisión/residencia (HU-15), no el contratista.
    await expect(mis).not.toContainText('SMK17-001 · Estimación N.º 3');
  });
});

// ---------------------------------------------------------------------------
// Dependencia (ve todo): ve AMBOS contratos -> el acotamiento difiere por rol.
// ---------------------------------------------------------------------------
test.describe('HU-17 — Dependencia (ve todo)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
    await goToViaSidebar(page, VIEW_PATH);
  });

  test('ve el contrato propio del equipo Y el ajeno (SMK17-002)', async ({ page }) => {
    await expect(page.locator(card(1))).toBeVisible();           // SMK17-001
    await expect(page.locator(cardAjeno(1))).toBeVisible();      // SMK17-002 integrada
    await expect(page.locator(cardAjeno(2))).toBeVisible();      // SMK17-002 pagada
  });
});

// ---------------------------------------------------------------------------
// Finanzas: sin acceso a la HU.
// ---------------------------------------------------------------------------
test.describe('HU-17 — Finanzas (sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-17 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
