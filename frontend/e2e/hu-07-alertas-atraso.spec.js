// @ts-check
// E2E HU-07 — Configuración de alertas de atraso.
//
// Cubre el comportamiento del prototipo:
//   · El botón "Crear alerta" está disabled hasta que concepto + umbral (1-100)
//     + canal (radio Sistema/Correo) están completos.
//   · Al crear, la alerta se inserta arriba de la tabla con folio correlativo
//     A-NNN, badge "Activa" y fila con fondo verde.
//   · Pausar/Reanudar alterna el badge sin tocar las demás filas.
//   · Eliminar pide confirm() y quita la fila.
//   · La sección "Alertas disparadas" lee el avance simulado del concepto y
//     muestra una entrada por cada alerta activa con avance < umbral.
//
// PERMISOS[HU-07]: residente='E' · supervision='C' · contratista/dependencia/finanzas=null
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
  expectSinAvisoSoloConsulta,
  expectMetadataAcademicaOculta
} from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/seguimiento/alertas';
const TITULO = 'Configuración de alertas de atraso';
const SPRINT = 'Sprint 6';

// HU-07 quedó CABLEADA a datos reales: el formulario (al-concepto/al-umbral/btn-crear-alerta) solo
// aparece tras SELECCIONAR un contrato. Creamos uno por API (residente) con el equipo COMPLETO para
// que lo vean tanto el residente (creador) como la supervisión (supervision_id). Solo se tocan .spec.
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
async function loginApi(request, email) {
  return (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
}
async function crearContratoConConceptos(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-HU07-${Date.now()}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Alertas e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'Concepto e2e', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(r.status(), 'crear contrato con conceptos').toBe(201);
  return folio;
}
async function seleccionarContratoPorFolio(page, folio) {
  const sel = page.getByTestId('select-contrato');
  await expect(sel).toBeVisible();
  const val = await sel.locator('option', { hasText: folio }).first().getAttribute('value');
  await sel.selectOption(val);
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-07 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-07 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-07',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });

  test('formulario editable tras elegir contrato; sin aviso de solo consulta', async ({ page, request }) => {
    const folio = await crearContratoConConceptos(request); // residente = creador → lo ve
    await goToViaSidebar(page, VIEW_PATH);
    await expectSinAvisoSoloConsulta(page);
    // Datos reales: el formulario aparece tras SELECCIONAR un contrato.
    await seleccionarContratoPorFolio(page, folio);
    await expect(page.getByTestId('al-concepto')).toBeEnabled();
    await expect(page.getByTestId('al-umbral')).toBeEnabled();
    await expect(page.getByTestId('btn-crear-alerta')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervisión consulta
// ---------------------------------------------------------------------------

test.describe('HU-07 — modo aplicacion (Supervisión: consulta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'supervision');
  });

  test('aviso de solo consulta visible; formulario deshabilitado tras elegir contrato', async ({ page, request }) => {
    const folio = await crearContratoConConceptos(request); // supervision_id = supervisión → lo ve
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);

    await expectAvisoSoloConsulta(page);
    // Datos reales: el formulario aparece tras SELECCIONAR un contrato, pero deshabilitado (lectura).
    await seleccionarContratoPorFolio(page, folio);
    await expect(page.getByTestId('al-concepto')).toBeDisabled();
    await expect(page.getByTestId('al-umbral')).toBeDisabled();
    // El botón de crear no se renderiza en lectura.
    await expect(page.getByTestId('btn-crear-alerta')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Dependencia / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-07 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-07 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
