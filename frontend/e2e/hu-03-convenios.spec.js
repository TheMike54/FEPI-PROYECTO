// @ts-check
// E2E HU-03 — Convenios modificatorios (FLUJO REAL, página cableada al backend).
//
// La página ConveniosModificatorios.jsx consume el backend REAL de convenios (art. 59 LOPSRM):
//   · GET  /api/convenios/contrato/:id      → { convenios:[…], versiones:[…] }
//   · GET  /api/convenios/version/:versionId → snapshot inmutable del programa
//   · POST /api/convenios/contrato/:id       → crea el convenio (plazo / monto / programa / mixto)
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
    await expect(await sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
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
      await expect(await sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
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
    await expect(await sidebarLinkFor(page, VIEW_PATH)).toHaveCount(0);
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

  test('umbral del 25%: plazo 180→240 (+33%) AVISA pero NO bloquea — el convenio SE REGISTRA (201)', async ({ page }) => {
    await page.getByTestId('cm-plazo-nuevo').fill('240');
    await page.getByTestId('cm-motivo').fill('Ampliación mayor (prueba del aviso de variación, art. 59 LOPSRM).');
    // La UI AVISA: el aviso de SFP/variación es visible (la variación supera el 25%).
    await expect(page.getByTestId('aviso-sfp')).toBeVisible();

    const resp = page.waitForResponse((r) =>
      r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    // CRITERIO DEL EQUIPO: superar el 25% AVISA, no bloquea → el backend lo CREA (201) con aviso_variacion.
    const r = await resp;
    expect(r.status()).toBe(201);
    expect((await r.json()).aviso_variacion).toBeTruthy();

    // El convenio SÍ se registró: el historial deja de estar vacío y aparece la fila.
    await expect(page.getByTestId('conv-vacio')).toHaveCount(0);
    await expect(filasConvenios(page)).toHaveCount(1);
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

    // La fila del convenio registrado NO ofrece editar / anular / eliminar el convenio (corregir =
    // convenio nuevo; inmutabilidad server-side: trigger append-only + sin DELETE/PATCH en el router).
    // EXCEPCIONES legítimas (controles que NO mutan la identidad del convenio registrado):
    //   · FASE 0C (profe 16-jun): adjuntar/ver su OFICIO DE APROBACIÓN (soporte documental).
    //   · ITEM 3.2 (art. 59 párr. 3 LOPSRM): AUTORIZAR el convenio — acto FORMAL append-only del servidor
    //     facultado (sella estado/autorizado_por/autorizado_en; no edita lo registrado).
    const fila = filasConvenios(page).first();
    await expect(fila).toBeVisible();
    const interactivos = await fila.locator('button, input, select, textarea, [contenteditable="true"]').count();
    const delOficio = await fila.locator('[data-testid^="conv-oficio-ver-"], [data-testid^="conv-oficio-subir-"] input').count();
    const delAutorizar = await fila.locator('[data-testid^="conv-autorizar-"]').count();
    expect(interactivos - delOficio - delAutorizar).toBe(0);
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

// ===========================================================================
// Fase 2 — editor de catálogo + matriz (convenios de monto / programa / mixto).
// El backend deriva el monto (Σ ROUND(cant×pu,2)) y revalida cuadre 100% + art. 118 +
// guardrail. El seed da SMOKE-HU03-001: monto 100,000 (CONC-01 100×600, CONC-02 50×800),
// 2 periodos, programa que cuadra (CONC-01 60/40, CONC-02 20/30).
// ===========================================================================

test.describe('HU-03 Fase 2 — editor de matriz (monto / programa)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await seleccionarContratoPorFolio(page, FOLIO_SEED);
  });

  test('monto: el editor precarga el vigente, deriva el monto y, cuadrado, registra (201) → v2 vigente', async ({ page }) => {
    await page.getByTestId('cm-tipo').selectOption('monto');
    // Precarga del programa vigente: el editor aparece con los 2 conceptos sembrados.
    await expect(page.getByTestId('editor-programa-convenio')).toBeVisible();
    await expect(page.getByTestId('cm-concepto-clave-0')).toHaveValue('CONC-01');
    await expect(page.getByTestId('cm-concepto-clave-1')).toHaveValue('CONC-02');
    // La clave de un concepto EXISTENTE es read-only (el backend casa por clave; catálogo completo).
    await expect(page.getByTestId('cm-concepto-clave-0')).toBeDisabled();
    // Monto vigente DERIVADO = 100,000; el programa precargado cuadra al 100%.
    await expect(page.getByTestId('cm-monto-nuevo')).toContainText('100,000');
    await expect(page.getByTestId('cm-programa-cuadra')).toBeVisible();

    // Sube el P.U. de CONC-01 600 → 700 (cantidad intacta → el cuadre se conserva).
    await page.getByTestId('cm-concepto-pu-0').fill('700');
    await expect(page.getByTestId('cm-monto-nuevo')).toContainText('110,000'); // 100×700 + 50×800
    await expect(page.getByTestId('cm-programa-cuadra')).toBeVisible();
    await expect(page.getByTestId('aviso-sfp')).toHaveCount(0); // +10% ≤ 25%: sin guardrail
    await page.getByTestId('cm-motivo').fill('Ajuste de precio unitario de excavación (dictamen DT-2026-09).');

    const resp = page.waitForResponse((r) => r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    expect((await resp).status()).toBe(201);

    // Historial: 1 convenio de Monto. Versiones: v1 (superseded) + v2 (vigente, monto 110,000).
    await expect(filasConvenios(page)).toHaveCount(1);
    await expect(filasConvenios(page).first()).toContainText('Monto');
    await expect(filasVersiones(page)).toHaveCount(2);
    await expect(filasVersiones(page).filter({ hasText: 'Vigente' })).toHaveCount(1);
    await expect(filasVersiones(page).filter({ hasText: 'Vigente' })).toContainText('110,000');
  });

  test('programa: descuadre BLOQUEA el botón; al re-cuadrar registra (201) → v2 vigente', async ({ page }) => {
    await page.getByTestId('cm-tipo').selectOption('programa');
    await expect(page.getByTestId('editor-programa-convenio')).toBeVisible();
    await page.getByTestId('cm-motivo').fill('Redistribución del programa (dictamen DT-2026-10).');
    await expect(page.getByTestId('cm-programa-cuadra')).toBeVisible();

    // Sube la cantidad contratada de CONC-01 a 120 (las celdas siguen sumando 100 → restante 20).
    await page.getByTestId('cm-concepto-cantidad-0').fill('120');
    await expect(page.getByTestId('cm-programa-descuadre')).toBeVisible();
    await expect(page.getByTestId('btn-registrar-convenio')).toBeDisabled();

    // Re-cuadra: CONC-01 P1 60 → 80 (80 + 40 = 120). Vuelve a cuadrar → botón habilitado.
    await page.getByTestId('cm-celda-0-1').fill('80');
    await expect(page.getByTestId('cm-programa-cuadra')).toBeVisible();
    await expect(page.getByTestId('btn-registrar-convenio')).toBeEnabled();

    // Registro end-to-end del tipo 'programa' (CONC-01 120 ≥ 80 estimado → art.118 OK; +12% ≤ 25%).
    const resp = page.waitForResponse((r) => r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    expect((await resp).status()).toBe(201);
    await expect(filasConvenios(page)).toHaveCount(1);
    await expect(filasConvenios(page).first()).toContainText('Programa');
    await expect(filasVersiones(page)).toHaveCount(2);
    await expect(filasVersiones(page).filter({ hasText: 'Vigente' })).toHaveCount(1);
  });

  test('mixto: cambia monto (P.U.) Y plazo en un solo convenio; registra (201) → tipo Mixto, v2 vigente', async ({ page }) => {
    await page.getByTestId('cm-tipo').selectOption('mixto');
    // Mixto muestra AMBOS: el editor de programa y el campo de plazo.
    await expect(page.getByTestId('editor-programa-convenio')).toBeVisible();
    await expect(page.getByTestId('cm-plazo-nuevo')).toBeVisible();
    await page.getByTestId('cm-programa-cuadra').waitFor();

    // Sin plazo todavía → no se puede registrar (mixto exige programa OK + plazo cambiado).
    await page.getByTestId('cm-concepto-pu-0').fill('700');             // monto 100,000 → 110,000 (+10%)
    await page.getByTestId('cm-motivo').fill('Ajuste de P.U. y ampliación de plazo (dictamen DT-2026-11).');
    await expect(page.getByTestId('btn-registrar-convenio')).toBeDisabled();

    await page.getByTestId('cm-plazo-nuevo').fill('200');               // plazo 180 → 200 (+11%)
    await expect(page.getByTestId('btn-registrar-convenio')).toBeEnabled();

    const resp = page.waitForResponse((r) => r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    expect((await resp).status()).toBe(201);
    await expect(filasConvenios(page)).toHaveCount(1);
    await expect(filasConvenios(page).first()).toContainText('Mixto');
    // El cambio refleja AMBOS: plazo 200 y monto 110,000.
    await expect(filasConvenios(page).first()).toContainText('200');
    await expect(filasConvenios(page).first()).toContainText('110,000');
    await expect(filasVersiones(page).filter({ hasText: 'Vigente' })).toContainText('110,000');
  });

  test('agregar / quitar concepto nuevo: el monto sube y vuelve; registrar agrega el concepto', async ({ page }) => {
    await page.getByTestId('cm-tipo').selectOption('monto');
    await expect(page.getByTestId('editor-programa-convenio')).toBeVisible();
    await expect(page.getByTestId('cm-monto-nuevo')).toContainText('100,000');

    // Agrega un concepto nuevo CONC-03 (10 × 1000 = 10,000) → monto 110,000.
    await page.getByTestId('cm-agregar-concepto').click();
    await page.getByTestId('cm-concepto-clave-2').fill('CONC-03');
    await page.getByTestId('cm-concepto-nombre-2').fill('Acarreo (nuevo)');
    await page.getByTestId('cm-concepto-unidad-2').fill('m3');
    await page.getByTestId('cm-concepto-cantidad-2').fill('10');
    await page.getByTestId('cm-concepto-pu-2').fill('1000');
    await expect(page.getByTestId('cm-monto-nuevo')).toContainText('110,000');

    // Quitar el concepto nuevo revierte el monto a 100,000.
    await page.getByTestId('cm-concepto-quitar-2').click();
    await expect(page.getByTestId('cm-monto-nuevo')).toContainText('100,000');
    await expect(page.getByTestId('cm-concepto-clave-2')).toHaveCount(0);

    // Lo agrega de nuevo y cuadra su celda (10 en P1) → registra (201) y CONC-03 queda en el catálogo.
    await page.getByTestId('cm-agregar-concepto').click();
    await page.getByTestId('cm-concepto-clave-2').fill('CONC-03');
    await page.getByTestId('cm-concepto-nombre-2').fill('Acarreo (nuevo)');
    await page.getByTestId('cm-concepto-unidad-2').fill('m3');
    await page.getByTestId('cm-concepto-cantidad-2').fill('10');
    await page.getByTestId('cm-concepto-pu-2').fill('1000');
    await page.getByTestId('cm-celda-2-1').fill('10'); // 10 en P1 → cuadra (10 = 10)
    await page.getByTestId('cm-motivo').fill('Alta de concepto de acarreo (dictamen DT-2026-12).');
    await expect(page.getByTestId('cm-programa-cuadra')).toBeVisible();

    const resp = page.waitForResponse((r) => r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    expect((await resp).status()).toBe(201);
    await expect(filasConvenios(page)).toHaveCount(1);
    // La versión vigente refleja el monto con el concepto nuevo (110,000) y su snapshot lo incluye.
    await expect(filasVersiones(page).filter({ hasText: 'Vigente' })).toContainText('110,000');
    // "Ver programa" de la versión VIGENTE (no la v1 original) → su matriz incluye CONC-03.
    await filasVersiones(page).filter({ hasText: 'Vigente' }).locator('[data-testid^="btn-ver-version-"]').click();
    await expect(page.getByTestId('detalle-version').getByTestId('matriz-programa')).toContainText('CONC-03');
  });

  test('art. 118: reducir CONC-01 (100) por debajo de lo ya estimado (80) → backend RECHAZA (400)', async ({ page }) => {
    await page.getByTestId('cm-tipo').selectOption('monto');
    await expect(page.getByTestId('editor-programa-convenio')).toBeVisible();
    await page.getByTestId('cm-motivo').fill('Reducción de cantidad de excavación (prueba art. 118).');
    // CONC-01 cantidad 100 → 70 (< 80 ya estimado). Re-cuadra sus celdas a 70 para pasar el cuadre cliente.
    await page.getByTestId('cm-concepto-cantidad-0').fill('70');
    await page.getByTestId('cm-celda-0-1').fill('40'); // 40 + 30 = 70
    await page.getByTestId('cm-celda-0-2').fill('30');
    await expect(page.getByTestId('cm-programa-cuadra')).toBeVisible();
    await expect(page.getByTestId('btn-registrar-convenio')).toBeEnabled();

    const resp = page.waitForResponse((r) => r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    expect((await resp).status()).toBe(400); // art. 118 RLOPSRM: no por debajo de lo estimado
    // El backend mostró el motivo (art. 118) y NO se creó convenio ni versión nueva.
    await expect(filasConvenios(page)).toHaveCount(0);
    await expect(filasVersiones(page)).toHaveCount(1);
  });

  test('umbral del 25% sobre el MONTO: +30% AVISA pero NO bloquea — el convenio SE REGISTRA (201)', async ({ page }) => {
    await page.getByTestId('cm-tipo').selectOption('monto');
    await expect(page.getByTestId('editor-programa-convenio')).toBeVisible();
    await page.getByTestId('cm-motivo').fill('Incremento de precio unitario (prueba del aviso de variación de monto).');
    // CONC-01 pu 600 → 900 → monto 130,000 (+30%). Cuadre intacto (cantidad sin cambio).
    await page.getByTestId('cm-concepto-pu-0').fill('900');
    await expect(page.getByTestId('cm-monto-nuevo')).toContainText('130,000');
    await expect(page.getByTestId('aviso-sfp')).toBeVisible(); // la UI avisa

    const resp = page.waitForResponse((r) => r.url().includes('/convenios/contrato/') && r.request().method() === 'POST');
    await page.getByTestId('btn-registrar-convenio').click();
    // CRITERIO DEL EQUIPO: superar el 25% AVISA, no bloquea → el backend lo CREA (201) con aviso_variacion.
    const r = await resp;
    expect(r.status()).toBe(201);
    expect((await r.json()).aviso_variacion).toBeTruthy();
    // SÍ se creó el convenio; al tocar el programa (monto), se snapshotó una versión nueva (v2).
    await expect(filasConvenios(page)).toHaveCount(1);
    await expect(filasVersiones(page)).toHaveCount(2);
  });
});
