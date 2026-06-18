// @ts-check
// E2E HU-06 — Registro de trabajos terminados (avance ejecutado por concepto, art. 118).
//
// La vista pasó de DUMMY ("Excavación" hardcodeada) a DATOS REALES: hay que elegir un contrato
// (api.trabajosDeContrato) y entonces se muestran el resumen ejecutado por concepto (tabla-conceptos,
// que TODOS los roles con acceso consultan) y el formulario de captura (btn-registrar-avance), que
// solo se renderiza para el contratista (soloLectura=false). Por eso el spec siembra un contrato real
// por API y verifica el comportamiento por rol.
//
// PERMISOS[HU-06]: contratista='E' · residente/supervision='C' · dependencia/finanzas=null
// Helpers comunes: ver frontend/e2e/_helpers.js.
import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  expectAvisoSoloConsulta,
  expectSinAvisoSoloConsulta,
  expectMetadataAcademicaOculta,
} from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/seguimiento/trabajos-terminados';
const TITULO = 'Registro de trabajos terminados';
const SPRINT = 'Sprint 7';

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// Siembra un contrato real (equipo completo: residente=creador, contratista=superintendente,
// supervisión, dependencia) con un concepto del catálogo. Devuelve el contratoId.
async function crearContrato(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
  ]);
  const folio = `E2E-HU06-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const r = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Trabajos terminados e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 0, juridicos: {},
      conceptos: [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad: 1000, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'C-001', periodoNumero: 1, cantidad: 1000 }], garantias: [],
    },
  });
  expect(r.status(), 'crear contrato').toBe(201);
  return (await r.json()).id;
}

// ---------------------------------------------------------------------------
// Contratista (ejecuta)
// ---------------------------------------------------------------------------
test('HU-06 — sidebar muestra la vista y carga sin metadata académica (contratista)', async ({ page }) => {
  await freshHome(page);
  await enterAppMode(page, 'contratista');
  await expect(await sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  await goToViaSidebar(page, VIEW_PATH);
  await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
  await expectMetadataAcademicaOculta(page, { huId: 'HU-06', sprintLabel: SPRINT, rolAcademicoLabel: 'Contratista' });
});

test('HU-06 — contratista: con un contrato real ve el resumen y el formulario de captura (editable)', async ({ page, request }) => {
  const cid = await crearContrato(request);
  await freshHome(page);
  await enterAppMode(page, 'contratista');
  await goToViaSidebar(page, VIEW_PATH);
  await page.getByTestId('select-contrato').selectOption({ value: String(cid) });
  await expect(page.getByTestId('tabla-conceptos')).toBeVisible();        // resumen ejecutado por concepto
  await expect(page.getByTestId('btn-registrar-avance')).toBeVisible();   // formulario de captura presente (ejecuta)
  await expectSinAvisoSoloConsulta(page);
});

// ---------------------------------------------------------------------------
// Residente / Supervisión (consultan): ven el resumen, NO el formulario de captura
// ---------------------------------------------------------------------------
for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'supervision', alias: 'Supervisión' },
]) {
  test(`HU-06 — ${rol.alias}: ve el resumen pero NO el formulario de captura (solo lectura)`, async ({ page, request }) => {
    const cid = await crearContrato(request);
    await freshHome(page);
    await enterAppMode(page, rol.id);
    await goToViaSidebar(page, VIEW_PATH);
    await expectAvisoSoloConsulta(page);                                    // banner "solo consulta" (HeaderVista) para el rol C
    await page.getByTestId('select-contrato').selectOption({ value: String(cid) });
    await expect(page.getByTestId('tabla-conceptos')).toBeVisible();        // puede CONSULTAR el avance
    await expect(page.getByTestId('btn-registrar-avance')).toHaveCount(0);  // NO puede capturar (soloLectura)
  });
}

// ---------------------------------------------------------------------------
// Dependencia / Finanzas (sin acceso)
// ---------------------------------------------------------------------------
for (const rol of [
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    },
]) {
  test(`HU-06 — ${rol.alias}: sin acceso (no aparece en Sidebar ni en Inicio)`, async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, rol.id);
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
}
