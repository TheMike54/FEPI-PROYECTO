// @ts-check
// E2E HU-03 — Convenios modificatorios (FLUJO REAL, página cableada al backend).
//
// La página ConveniosModificatorios.jsx consume el backend REAL de convenios (art. 59 LOPSRM):
//   · GET  /api/convenios/contrato/:id      → { convenios:[…], versiones:[…] }
//   · GET  /api/convenios/version/:versionId → snapshot inmutable del programa
//   · POST /api/convenios/contrato/:id       → crea el convenio (Fase 1: solo tipo 'plazo')
// Por eso ESTE spec ejercita el flujo real (login real + token), no el prototipo dummy:
//   1. Acceso por rol: dependencia ('E') ve el form; residente/contratista/supervisión ('C')
//      solo consulta (banner, sin form); finanzas (null) ni en Sidebar ni en Inicio.
//   2. Dependencia registra un convenio de PLAZO (180→200, +11.11%): 201 + aparece en el historial.
//   3. Guardrail del 25%: 180→240 (+33%) → el backend RECHAZA (400) y NO se crea convenio
//      (CONVENIO_LIMITE_VARIACION_PCT default 25; la UI muestra el aviso, no bloquea el botón).
//   4. Inmutabilidad: el historial NO ofrece editar/anular/eliminar.
//   5. Versiones del programa: v1 (original) se lee y su matriz se muestra (MatrizProgramaLectura).
//
// Como el resto de la suite con login real, requiere backend+BD (Docker local) y se salta en CI.
// Datos: backend/scripts/seed_smoke_hu03.sql (contrato SMOKE-HU03-001, plazo 180, v1 vigente).
// El seed RESETEA plazo/convenios/versiones en cada corrida (re-runnable) + unseed en afterAll.
//
// PERMISOS[HU-03]: dependencia='E' · residente/contratista/supervisión='C' · finanzas=null
//
// NOTA: este spec CONSOLIDA y reemplaza al antiguo hu-03-modificatorios.spec.js (que probaba la
// página DUMMY: inputs monto/días). El guardrail (test 3) asume CONVENIO_LIMITE_VARIACION_PCT en
// su default (25%); si el backend lo sobreescribe, ese caso cambiaría.
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
  cardInInicioFor,
  expectAvisoSoloConsulta,
  expectSinAvisoSoloConsulta,
  expectMetadataAcademicaOculta
} from './_helpers.js';

// login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'requiere backend+BD; se corre en local');

const VIEW_PATH = '/contratos/modificatorios';
const TITULO = 'Trámite de convenios modificatorios';
const FOLIO_SEED = 'SMOKE-HU03-001';

// ---------------------------------------------------------------------------
// Seed/unseed vía el stack Docker (mismo mecanismo de HU-13/HU-14 y de CLAUDE.md).
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../');
const SEED   = path.join(REPO_ROOT, 'backend/scripts/seed_smoke_hu03.sql');
const UNSEED = path.join(REPO_ROOT, 'backend/scripts/unseed_smoke_hu03.sql');

function psqlFile(file) {
  execSync('docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1', {
    input: readFileSync(file),
    stdio: ['pipe', 'ignore', 'pipe']
  });
}

// reseed por test: el de creación deja un convenio + muta el plazo; reseed restablece la
// precondición (plazo 180, sin convenios, v1 vigente).
test.beforeEach(() => { psqlFile(SEED); });
test.afterAll(() => { try { psqlFile(UNSEED); } catch { /* limpieza best-effort */ } });

// ---------------------------------------------------------------------------
// Locators / acciones reutilizables.
// ---------------------------------------------------------------------------
const filasConvenios = (page) => page.locator('tbody tr[data-testid^="fila-convenio-"]');
const filasVersiones = (page) => page.locator('tbody tr[data-testid^="fila-version-"]');

async function seleccionarContratoPorFolio(page, folio) {
  const select = page.getByTestId('select-contrato');
  await expect(select).toBeEnabled();
  const opcion = select.locator('option', { hasText: folio });
  await expect(opcion).toHaveCount(1);
  const value = await opcion.getAttribute('value');
  await select.selectOption(value);
}

// ===========================================================================
// Acceso por rol (control de accesos HU-03 — intacto tras el cableado).
// ===========================================================================

test.describe('HU-03 — acceso por rol', () => {
  test('Dependencia (E): la vista está en el Sidebar, carga y ofrece el formulario', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    // (portado del antiguo spec) la metadata académica no se muestra en producto.
    await expectMetadataAcademicaOculta(page, { huId: 'HU-03', sprintLabel: 'Sprint 6', rolAcademicoLabel: 'Dependencia' });
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
    // Nivel 'E': el formulario de creación está disponible y NO hay banner de solo-consulta.
    await expect(page.getByTestId('btn-registrar-convenio')).toBeVisible();
    await expectSinAvisoSoloConsulta(page);
  });

  for (const rol of [
    { id: 'residente',   alias: 'Residente' },
    { id: 'contratista', alias: 'Contratista' },
    { id: 'supervision', alias: 'Supervisión' }
  ]) {
    test(`${rol.alias} (C): ve la vista en SOLO CONSULTA (banner, sin formulario)`, async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expectAvisoSoloConsulta(page);
      await seleccionarContratoPorFolio(page, FOLIO_SEED);
      // Nivel 'C': NO hay formulario de creación.
      await expect(page.getByTestId('btn-registrar-convenio')).toHaveCount(0);
    });
  }

  test('Finanzas (sin acceso): HU-03 NO aparece en Sidebar ni en Inicio', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
    await expect(sidebarLinkFor(page, VIEW_PATH)).toHaveCount(0);
    await expect(cardInInicioFor(page, VIEW_PATH)).toHaveCount(0);
  });

  test('barrera REAL del backend: un rol no autorizado (contratista) recibe 403 al POST directo', async ({ page }) => {
    // La UI no le ofrece el form al contratista (nivel 'C'), pero la barrera de verdad es el
    // backend: el contratista (superintendente) NO es dependencia ni residente_id ni created_by
    // del contrato → un POST directo al endpoint debe responder 403 (no basta ocultar el botón).
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, VIEW_PATH);
    // id del contrato semilla leído del <select> (no se hardcodea).
    const value = await page.getByTestId('select-contrato')
      .locator('option', { hasText: FOLIO_SEED }).getAttribute('value');
    const status = await page.evaluate(async (cid) => {
      const t = localStorage.getItem('sigecop_token');
      // Backend local (mismo destino que usa la app); el spec ya está atado al stack Docker.
      const r = await fetch(`http://localhost:4000/api/convenios/contrato/${cid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ tipo: 'plazo', motivo: 'intento no autorizado', plazo_nuevo_dias: 200 })
      });
      return r.status;
    }, value);
    expect(status).toBe(403);
  });
});

// ===========================================================================
// Flujo real — Dependencia registra un convenio de PLAZO.
// ===========================================================================

test.describe('HU-03 — flujo real (Dependencia registra convenio de plazo)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
  });

  test('plazo 180→200 (+11%): se registra (201) y aparece en el historial inmutable', async ({ page }) => {
    // Precondición: sin convenios todavía.
    await expect(page.getByTestId('conv-vacio')).toBeVisible();

    await page.getByTestId('cm-plazo-nuevo').fill('200');
    await page.getByTestId('cm-motivo').fill('Ampliación por lluvias atípicas (dictamen técnico DT-2026-07).');
    // +11% ≤ 25%: NO debe mostrarse el aviso de SFP.
    await expect(page.getByTestId('aviso-sfp')).toHaveCount(0);

    const resp = page.waitForResponse((r) =>
      r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    expect((await resp).status()).toBe(201);

    // Aparece UN convenio con el cambio de plazo 180 → 200.
    await expect(filasConvenios(page)).toHaveCount(1);
    await expect(filasConvenios(page).first()).toContainText('200');
    await expect(filasConvenios(page).first()).toContainText('Plazo');
    // 11% no dispara la SFP: sin badge de revisión.
    await expect(page.locator('[data-testid^="badge-sfp-"]')).toHaveCount(0);
  });

  test('guardrail del 25%: plazo 180→240 (+33%) muestra aviso y el backend RECHAZA (400)', async ({ page }) => {
    await page.getByTestId('cm-plazo-nuevo').fill('240');
    await page.getByTestId('cm-motivo').fill('Ampliación mayor (prueba del guardrail art. 102).');
    // La UI AVISA (no bloquea el botón): el aviso de SFP/guardrail es visible.
    await expect(page.getByTestId('aviso-sfp')).toBeVisible();

    const resp = page.waitForResponse((r) =>
      r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    // El backend rechaza por el guardrail parametrizable (default 25%).
    expect((await resp).status()).toBe(400);

    // NO se creó ningún convenio: el historial sigue vacío.
    await expect(page.getByTestId('conv-vacio')).toBeVisible();
    await expect(filasConvenios(page)).toHaveCount(0);
  });

  test('inmutabilidad: el historial no ofrece editar / anular / eliminar', async ({ page }) => {
    // Registra uno para tener fila en el historial.
    await page.getByTestId('cm-plazo-nuevo').fill('200');
    await page.getByTestId('cm-motivo').fill('Ampliación menor.');
    const resp = page.waitForResponse((r) =>
      r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    expect((await resp).status()).toBe(201);
    await expect(filasConvenios(page)).toHaveCount(1);

    // La fila del convenio registrado es de SOLO LECTURA: no contiene NINGÚN control de
    // edición/mutación (corregir = convenio nuevo; la inmutabilidad real es server-side: trigger
    // append-only + ausencia de endpoint DELETE/PATCH en el router de convenios).
    const fila = filasConvenios(page).first();
    await expect(fila).toBeVisible();
    await expect(fila.locator('button, input, select, textarea, [contenteditable="true"]')).toHaveCount(0);
  });
});

// ===========================================================================
// Flujo real — Versiones del programa (lectura del snapshot inmutable).
// ===========================================================================

test.describe('HU-03 — versiones del programa (lectura)', () => {
  test('v1 (original, vigente) se lista y su matriz concepto×periodo se muestra', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, FOLIO_SEED);

    // v1 sembrada: una fila de versión vigente.
    await expect(filasVersiones(page)).toHaveCount(1);
    await expect(filasVersiones(page).first()).toContainText('Vigente');

    // Ver el snapshot del programa → la matriz read-only se renderiza con los conceptos.
    await page.locator('[data-testid^="btn-ver-version-"]').first().click();
    await expect(page.getByTestId('detalle-version').getByTestId('matriz-programa')).toBeVisible();
    await expect(page.getByTestId('matriz-programa')).toContainText('CONC-01');
  });
});
