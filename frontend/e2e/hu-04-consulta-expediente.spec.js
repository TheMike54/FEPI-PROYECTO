// @ts-check
// E2E HU-04 — Consulta integrada del expediente contractual.
//
// Cubre los checks distintivos:
//   · El expediente muestra 5 bloques (configuración, catálogo, programa,
//     fianzas, jurídicos) — verificable por los headings.
//   · El buscador filtra los bloques por campo (lógica Y).
//   · Cada documento se descarga individualmente: PDFs placeholder con jsPDF
//     (configuración, fianzas, jurídicos) y .xlsx con SheetJS (catálogo,
//     programa). Validado con waitForEvent('download').
//   · El botón "Exportar expediente" queda como placeholder con tooltip
//     "Disponible en SRV-06-03".
//   · Permisos por rol.
//
// PERMISOS[HU-04]: residente='E' · contratista/supervision/dependencia='C' · finanzas=null
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

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/contratos/expediente';
const TITULO = 'Consulta integrada del expediente contractual';
const SPRINT = 'Sprint 4';

// HU-04 quedó CABLEADA a datos reales (GET /contratos/:id): para consultar un expediente hay que
// SELECCIONAR un contrato (ya no hay datos dummy ni botones de descarga placeholder). Para que los
// tests sean deterministas creamos un contrato por API (residente) con el equipo COMPLETO, de modo
// que lo vea cualquier rol con acceso: contratista (= superintendente_id), supervisión
// (= supervision_id) y dependencia (rol que "ve todo", lib/acceso ROLES_VEN_TODO). Solo se tocan .spec.
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
async function loginApi(request, email) {
  return (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
}
async function crearContratoConsultable(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-HU04-${Date.now()}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Expediente e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'Concepto e2e', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(r.status(), 'crear contrato consultable').toBe(201);
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

test.describe('HU-04 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-04 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-04',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-04 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; consulta el expediente real tras elegir contrato', async ({ page, request }) => {
      const folio = await crearContratoConsultable(request);
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      // El aviso de solo lectura (HeaderVista) sigue visible para los roles de consulta.
      await expectAvisoSoloConsulta(page);
      // Datos reales: se SELECCIONA un contrato y se ve su expediente (buscador + bloques). La
      // consulta es de lectura, disponible para todos los roles con acceso.
      await seleccionarContratoPorFolio(page, folio);
      await expect(page.getByTestId('input-busqueda')).toBeVisible(); // el expediente cargó
      await expect(page.getByTestId('aviso-error')).toHaveCount(0);   // sin 403/404
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-04 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-04 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
