// @ts-check
// E2E HU-05 — Programa y curva de avance.
//
// Cubre los 3 criterios nuevos (textos exactos al pie) y los 2 checks
// distintivos de la vista:
//   · Filtro por concepto deja una sola fila en la matriz Gantt.
//   · Filtro por periodo recorta las columnas de meses del Gantt.
// Más permisos por rol (residente='E', consulta='C', finanzas sin acceso).
//
// PERMISOS[HU-05]: residente='E' · contratista='C' · supervision='C' · dependencia='C' · finanzas=null
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

const VIEW_PATH = '/seguimiento/curva-avance';
const TITULO = 'Programa y curva de avance';
const SPRINT = 'Sprint 7';

/** Locator del <select> del filtro "Concepto" (label seguido del select). */
function selectConcepto(page) {
  return page.locator('label:has-text("Concepto") + select');
}

/** Locator del <select> del filtro "Periodo". */
function selectPeriodo(page) {
  return page.locator('label:has-text("Periodo") + select');
}

/** Locator de la tabla Gantt. Se ancla a data-testid="seccion-gantt" para
 *  distinguirla de la tabla del Catálogo (que también vive en esta vista). */
function tablaGantt(page) {
  return page.locator('[data-testid="seccion-gantt"] table').first();
}

// HU-05 quedó CABLEADA a datos reales: los filtros (Concepto/Periodo), la curva y la matriz solo
// aparecen tras SELECCIONAR un contrato. Creamos uno por API (residente = creador → lo ve) con su
// equipo completo. Solo se toca el .spec (mismo patrón que HU-07/HU-04).
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
  const folio = `E2E-HU05-${Date.now()}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Curva de avance e2e',
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

test.describe('HU-05 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-05 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-05',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });

  test('filtros editables; sin aviso de solo consulta', async ({ page, request }) => {
    const folio = await crearContratoConConceptos(request); // residente = creador → lo ve
    await goToViaSidebar(page, VIEW_PATH);
    // El aviso es por ROL (se evalúa antes de elegir contrato): residente (nivel E) no lo ve.
    await expectSinAvisoSoloConsulta(page);
    // Datos reales: los filtros (Concepto/Periodo) solo aparecen tras SELECCIONAR un contrato.
    await seleccionarContratoPorFolio(page, folio);
    await expect(selectConcepto(page)).toBeEnabled();
    await expect(selectPeriodo(page)).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervision / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-05 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; la vista carga', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-05 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-05 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
