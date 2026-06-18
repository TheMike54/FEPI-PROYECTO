// @ts-check
// E2E HU-07 v2 (O5) — ATRASO POR CONCEPTO, automático y en UNIDADES (rediseño del profe, P15).
//
// La vista ya NO configura umbrales ni canales. Para el contrato elegido se listan TODOS los conceptos
// con DÉFICIT = programado_acumulado(al periodo VIGENTE, programa vigente) − ejecutado_acumulado, solo
// los > 0, en las unidades del concepto. Cubre:
//   · Cálculo del déficit correcto al periodo (programado − ejecutado); un concepto al 100% no aparece.
//   · "Asentar en bitácora" crea la nota (con bitácora abierta); sin bitácora → 409 informativo.
//   · Acotamiento por participación: una cuenta que no es parte recibe 403 en el panel del contrato.
//   · Badge/aviso al iniciar sesión: banner en Inicio + número en la campana (solo residente/supervisión).
//   · Solo lectura (supervisión): tabla visible pero sin botón "Asentar".
//   · Sin acceso (contratista/dependencia/finanzas): HU-07 no aparece ni en Sidebar ni en Inicio.
//
// PERMISOS[HU-07]: residente='E' · supervision='C' · contratista/dependencia/finanzas=null
// El avance se siembra con el endpoint REAL de HU-06 (POST /trabajos); login real + backend+BD; no CI.
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar, sidebarLinkFor,
  expectAvisoSoloConsulta, expectSinAvisoSoloConsulta, expectMetadataAcademicaOculta
} from './_helpers.js';

test.skip(!!process.env.CI, 'O5: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const VIEW_PATH = '/seguimiento/alertas';
const TITULO = 'Atraso por concepto';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// Crea un contrato con C-001 (programa P1 = `cantidad`) y registra `avance` ejecutado en P1 (HU-06 real).
// Déficit al periodo 1 = cantidad − avance. `conSupervision` controla si la supervisión es parte (para
// el acotamiento). Devuelve { id, folio, ccid, R, S, V, D }.
async function crearContratoConDeficit(request, { avance = 10, conSupervision = true, cantidad = 100, fechaInicio = '2026-06-01' } = {}) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-O5-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const data = {
    folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Atraso por concepto O5',
    plazoDias: 60, fechaInicio, superintendenteId: S.user.id, dependenciaId: D.user.id,
    anticipoPct: null, juridicos: {},
    conceptos: [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad, pu: 100 }],
    ciclo: 'mensual', programa: [{ clave: 'C-001', periodoNumero: 1, cantidad }], garantias: []
  };
  if (conSupervision) data.supervisionId = V.user.id;
  const cr = await request.post(`${API}/contratos`, { headers: auth(R.token), data });
  expect(cr.status(), 'crear contrato O5').toBe(201);
  const id = (await cr.json()).id;

  const t = await (await request.get(`${API}/trabajos/contrato/${id}`, { headers: auth(S.token) })).json();
  const ccid = t.conceptos.find((c) => c.clave === 'C-001').contrato_concepto_id;
  if (avance > 0) {
    const reg = await request.post(`${API}/trabajos`, { headers: auth(S.token), data: { contrato_concepto_id: ccid, periodo_numero: 1, cantidad: avance } });
    expect(reg.status(), 'registrar avance seed').toBe(201);
  }
  return { id, folio, ccid, R, S, V, D };
}

const panelAtraso = async (request, token, id) => (await request.get(`${API}/alertas/contrato/${id}`, { headers: auth(token) })).json();
const abrirBitacora = (request, token, contratoId) => request.post(`${API}/bitacora/apertura`, {
  headers: auth(token),
  data: {
    contratoId, fechaEntregaSitio: '2026-06-02',
    domicilioDependencia: 'Calle 1', telefonoDependencia: '5550001',
    domicilioContratista: 'Calle 2', telefonoContratista: '5550002',
    descripcionTrabajos: 'Obra', caracteristicasSitio: 'Terreno'
  }
});

// ---------------------------------------------------------------------------
// API — cálculo, asentar y acotamiento (independiente del navegador)
// ---------------------------------------------------------------------------
test.describe('HU-07 v2 — API del atraso por concepto', () => {
  test('déficit correcto al periodo vigente; un concepto al 100% no aparece', async ({ request }) => {
    const { id, ccid, R, S } = await crearContratoConDeficit(request, { avance: 10, cantidad: 100 });
    let panel = await panelAtraso(request, R.token, id);
    expect(panel.periodo_actual.numero).toBe(1);
    expect(panel.total_conceptos).toBe(1);
    expect(panel.atrasos.length).toBe(1);
    expect(panel.atrasos[0].deficit).toBe(90);             // 100 programado − 10 ejecutado
    expect(panel.atrasos[0].unidad).toBe('m³');
    expect(panel.atrasos[0].programado_acumulado).toBe(100);
    expect(panel.atrasos[0].ejecutado_acumulado).toBe(10);

    // Completar el avance (90 más en P1 → ejecutado total 100 = programado) → SIN déficit → SIN fila.
    expect((await request.post(`${API}/trabajos`, { headers: auth(S.token), data: { contrato_concepto_id: ccid, periodo_numero: 1, cantidad: 90 } })).status()).toBe(201);
    panel = await panelAtraso(request, R.token, id);
    expect(panel.atrasos.length).toBe(0);
    expect(panel.total_conceptos).toBe(1);
  });

  test('"Asentar en bitácora" crea la nota de atraso (con bitácora abierta)', async ({ request }) => {
    const { id, ccid, R } = await crearContratoConDeficit(request, { avance: 10 });
    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);

    const as = await request.post(`${API}/alertas/contrato/${id}/asentar`, { headers: auth(R.token), data: { contrato_concepto_id: ccid } });
    expect(as.status(), 'asentar con bitácora').toBe(201);
    const asj = await as.json();
    expect(asj.deficit).toBe(90);
    expect(asj.nota.numero).toBeGreaterThan(0);
    expect(asj.nota.tag).toBe('atraso');

    // La nota quedó en la bitácora con el texto del atraso (separada del 'avance').
    const notas = await (await request.get(`${API}/bitacora/contrato/${id}/notas`, { headers: auth(R.token) })).json();
    const blob = JSON.stringify(notas);
    expect(blob).toContain('Atraso registrado');
    expect(blob).toContain('déficit de 90');
  });

  test('"Asentar" sin bitácora abierta → 409 informativo (no se difiere)', async ({ request }) => {
    const { id, ccid, R } = await crearContratoConDeficit(request, { avance: 10 });
    const as = await request.post(`${API}/alertas/contrato/${id}/asentar`, { headers: auth(R.token), data: { contrato_concepto_id: ccid } });
    expect(as.status()).toBe(409);
    expect(((await as.json()).error || '')).toContain('bitácora');
  });

  test('"Asentar" un concepto sin déficit → 409 (nada que asentar)', async ({ request }) => {
    const { id, ccid, R } = await crearContratoConDeficit(request, { avance: 100 }); // ejecutado = programado
    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);
    const as = await request.post(`${API}/alertas/contrato/${id}/asentar`, { headers: auth(R.token), data: { contrato_concepto_id: ccid } });
    expect(as.status()).toBe(409);
    expect(((await as.json()).error || '')).toContain('no tiene atraso');
  });

  test('acotamiento por participación: una cuenta que no es parte recibe 403', async ({ request }) => {
    const { id, R, V } = await crearContratoConDeficit(request, { avance: 10, conSupervision: false });
    expect((await request.get(`${API}/alertas/contrato/${id}`, { headers: auth(R.token) })).status()).toBe(200); // residente = parte
    const ajeno = await request.get(`${API}/alertas/contrato/${id}`, { headers: auth(V.token) });               // supervisión NO asignada
    expect(ajeno.status()).toBe(403);
  });

  test('resumen del badge: cuenta conceptos/contratos con déficit (acotado por participación)', async ({ request }) => {
    // >= (no ==): la BD demo ACUMULA contratos del residente entre corridas; el assert es monótono.
    const { R } = await crearContratoConDeficit(request, { avance: 10 });
    const r = await (await request.get(`${API}/alertas/resumen`, { headers: auth(R.token) })).json();
    expect(r.conceptos).toBeGreaterThanOrEqual(1);
    expect(r.contratos).toBeGreaterThanOrEqual(1);
  });

  test('asentar lo bloquea un rol de consulta: supervisión (parte) → 403 (solo residente asienta)', async ({ request }) => {
    const { id, ccid, R, V } = await crearContratoConDeficit(request, { avance: 10, conSupervision: true });
    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);
    const as = await request.post(`${API}/alertas/contrato/${id}/asentar`, { headers: auth(V.token), data: { contrato_concepto_id: ccid } });
    expect(as.status(), 'la supervisión (HU-07 = consulta) no puede asentar').toBe(403);
  });

  test('contrato que aún no inicia su primer periodo → periodo_actual null y sin atraso', async ({ request }) => {
    const { id, R } = await crearContratoConDeficit(request, { avance: 0, fechaInicio: '2027-01-01' });
    const panel = await panelAtraso(request, R.token, id);
    expect(panel.periodo_actual).toBeNull();
    expect(panel.atrasos.length).toBe(0);
    expect(panel.total_conceptos).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// UI — panel, asentar, badge
// ---------------------------------------------------------------------------
test.describe('HU-07 v2 — modo aplicación (Residente: ejecuta)', () => {
  test('sidebar muestra HU-07 y la vista carga sin metadata académica', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await expect(await sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, { huId: 'HU-07', sprintLabel: 'Sprint 6', rolAcademicoLabel: 'Residente' });
  });

  test('tabla de déficit en unidades + "Asentar en bitácora" registra la nota', async ({ page, request }) => {
    const { id, ccid, R } = await crearContratoConDeficit(request, { avance: 10 });
    await abrirBitacora(request, R.token, id); // para que el asentar tenga éxito

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, VIEW_PATH);
    await expectSinAvisoSoloConsulta(page);
    await page.getByTestId('select-contrato').selectOption(String(id));

    await expect(page.getByTestId('tabla-atrasos')).toBeVisible();
    await expect(page.getByTestId('periodo-actual')).toContainText('periodo 1');
    await expect(page.getByTestId(`fila-atraso-${ccid}`)).toBeVisible();
    await expect(page.getByTestId(`deficit-${ccid}`)).toContainText('90');

    await page.getByTestId(`btn-asentar-${ccid}`).click();
    await expect(page.getByTestId('aviso-ok')).toContainText('asentado en la bitácora');
  });

  test('banner al iniciar sesión + número en la campana (residente con déficit)', async ({ page, request }) => {
    await crearContratoConDeficit(request, { avance: 10 });
    await freshHome(page);
    await enterAppMode(page, 'residente'); // aterriza en Inicio
    await expect(page.getByTestId('banner-atrasos')).toBeVisible();
    await expect(page.getByTestId('banner-atrasos')).toContainText('déficit');
    await expect(page.getByTestId('campana-atrasos')).toBeVisible();
  });
});

test.describe('HU-07 v2 — modo aplicación (Supervisión: consulta)', () => {
  test('aviso de solo consulta; tabla visible pero sin botón "Asentar"', async ({ page, request }) => {
    const { id, ccid } = await crearContratoConDeficit(request, { avance: 10, conSupervision: true });
    await freshHome(page);
    await enterAppMode(page, 'supervision');
    await goToViaSidebar(page, VIEW_PATH);
    await expectAvisoSoloConsulta(page);
    await page.getByTestId('select-contrato').selectOption(String(id));
    await expect(page.getByTestId('tabla-atrasos')).toBeVisible();
    await expect(page.getByTestId(`fila-atraso-${ccid}`)).toBeVisible();
    await expect(page.getByTestId(`btn-asentar-${ccid}`)).toHaveCount(0);
  });
});

test.describe('HU-07 v2 — modo aplicación (Contratista / Dependencia / Finanzas: sin acceso)', () => {
  test('contratista con déficit no ve banner ni campana de atraso', async ({ page, request }) => {
    await crearContratoConDeficit(request, { avance: 10 });
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await expect(page.getByTestId('banner-atrasos')).toHaveCount(0);
    await expect(page.getByTestId('campana-atrasos')).toHaveCount(0);
  });

  for (const rol of [
    { id: 'contratista', alias: 'Contratista' },
    { id: 'dependencia', alias: 'Dependencia' },
    { id: 'finanzas', alias: 'Finanzas' }
  ]) {
    test(`HU-07 NO aparece ni en Sidebar ni en Inicio (${rol.alias})`, async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  }
});
