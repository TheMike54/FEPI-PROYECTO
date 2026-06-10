// @ts-check
// O4 — HU-06 v2: registro de avance POR PERIODO + NOTA automática + validación contra el programa
// VIGENTE (P14 del profe). Cubre:
//   · registro dentro del periodo (UI: selector + toggle "ejecuté todo") → OK + nota asentada.
//   · excede lo programado del periodo → BLOQUEA (409, art. 59).
//   · concepto no programado en el periodo → BLOQUEA (409).
//   · convenio que AMPLÍA el periodo → el avance que excedía ahora PASA (programa vigente).
//   · sin bitácora → la nota se DIFIERE y se asienta sola al abrir la bitácora.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'O4: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

// Contrato con C-001 contratado 1000 (programa P1=400, P2=600) y, opcionalmente, C-002 contratado
// 500 programado SOLO en P2 (P1=0) para el caso "no programado en el periodo 1".
async function crearContrato(request, { conSegundo = false } = {}) {
  const [R, S, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-O4-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const conceptos = [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad: 1000, pu: 50 }];
  const programa = [
    { clave: 'C-001', periodoNumero: 1, cantidad: 400 },
    { clave: 'C-001', periodoNumero: 2, cantidad: 600 }
  ];
  if (conSegundo) {
    conceptos.push({ clave: 'C-002', concepto: 'Relleno', unidad: 'm³', cantidad: 500, pu: 30 });
    programa.push({ clave: 'C-002', periodoNumero: 2, cantidad: 500 }); // 0 en P1 (no programado en P1)
  }
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Avance por periodo O4',
      plazoDias: 60, fechaInicio: '2026-06-01', superintendenteId: S.user.id, dependenciaId: D.user.id,
      anticipoPct: null, juridicos: {}, conceptos, ciclo: 'mensual', programa, garantias: []
    }
  });
  expect(r.status(), 'crear contrato O4').toBe(201);
  const id = (await r.json()).id;
  return { id, folio, R, S, D };
}

const trabajos = async (request, token, id) => (await request.get(`${API}/trabajos/contrato/${id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
const registrar = (request, token, data) => request.post(`${API}/trabajos`, { headers: { Authorization: `Bearer ${token}` }, data });
const abrirBitacora = (request, token, contratoId) => request.post(`${API}/bitacora/apertura`, {
  headers: { Authorization: `Bearer ${token}` },
  data: {
    contratoId, fechaEntregaSitio: '2026-06-02',
    datosMinimos: { domicilioDependencia: 'Calle 1', telefonoDependencia: '5550001', domicilioContratista: 'Calle 2', telefonoContratista: '5550002', descripcionTrabajos: 'Obra', caracteristicasSitio: 'Terreno' }
  }
});

test.describe('O4 — avance por periodo + nota + validación vs programa vigente', () => {

  test('excede lo programado del periodo → BLOQUEA (art. 59); concepto no programado → BLOQUEA', async ({ request }) => {
    const { id, S } = await crearContrato(request, { conSegundo: true });
    const t = await trabajos(request, S.token, id);
    const c1 = t.conceptos.find((c) => c.clave === 'C-001').contrato_concepto_id;
    const c2 = t.conceptos.find((c) => c.clave === 'C-002').contrato_concepto_id;

    // Dentro de lo programado del periodo 1 (400) → OK.
    expect((await registrar(request, S.token, { contrato_concepto_id: c1, periodo_numero: 1, cantidad: 400 })).status()).toBe(201);
    // 400 + 100 = 500 > 400 programado en P1 → 409.
    const exc = await registrar(request, S.token, { contrato_concepto_id: c1, periodo_numero: 1, cantidad: 100 });
    expect(exc.status()).toBe(409);
    expect(((await exc.json()).error || '')).toContain('programado del periodo');
    // C-002 NO está programado en el periodo 1 (programado acum = 0) → 409 "no está programado".
    const np = await registrar(request, S.token, { contrato_concepto_id: c2, periodo_numero: 1, cantidad: 10 });
    expect(np.status()).toBe(409);
    expect(((await np.json()).error || '')).toContain('no está programado');
  });

  test('un convenio que AMPLÍA el periodo deja pasar el avance que antes excedía (programa vigente)', async ({ request }) => {
    const { id, R, S } = await crearContrato(request);
    const t = await trabajos(request, S.token, id);
    const c1 = t.conceptos.find((c) => c.clave === 'C-001').contrato_concepto_id;

    // P1 programado = 400. Registrar 400 (OK), luego 200 más excede (600 > 400) → 409.
    expect((await registrar(request, S.token, { contrato_concepto_id: c1, periodo_numero: 1, cantidad: 400 })).status()).toBe(201);
    const exc = await registrar(request, S.token, { contrato_concepto_id: c1, periodo_numero: 1, cantidad: 200 });
    expect(exc.status()).toBe(409);

    // Convenio tipo 'programa' que REDISTRIBUYE el volumen a P1 (600/400 en vez de 400/600). El
    // catálogo no cambia → variación de monto 0% (esquiva el guardrail). El programa VIGENTE
    // (programa_obra) queda con P1=600, así que el mismo avance ahora cabe.
    const conv = await request.post(`${API}/convenios/contrato/${id}`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: {
        tipo: 'programa', motivo: 'Adelanto de volumen al periodo 1 por condiciones de obra (art. 59 LOPSRM).',
        conceptos: [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad: 1000, pu: 50 }],
        celdas: [{ clave: 'C-001', periodoNumero: 1, cantidad: 600 }, { clave: 'C-001', periodoNumero: 2, cantidad: 400 }]
      }
    });
    expect(conv.status(), 'crear convenio de programa').toBe(201);

    // Ahora P1 programado = 600; 400 + 200 = 600 <= 600 → PASA automáticamente (sin tocar O4).
    const ok = await registrar(request, S.token, { contrato_concepto_id: c1, periodo_numero: 1, cantidad: 200 });
    expect(ok.status(), 'tras el convenio, el avance cabe').toBe(201);
  });

  test('sin bitácora la nota se DIFIERE; al abrir la bitácora se asienta sola', async ({ request }) => {
    const { id, R, S } = await crearContrato(request);
    const t = await trabajos(request, S.token, id);
    const c1 = t.conceptos.find((c) => c.clave === 'C-001').contrato_concepto_id;

    // Sin bitácora abierta → 201 con nota_diferida=true (la nota aún no existe).
    const reg = await registrar(request, S.token, { contrato_concepto_id: c1, periodo_numero: 1, cantidad: 300 });
    expect(reg.status()).toBe(201);
    const body = await reg.json();
    expect(body.nota_diferida).toBe(true);
    expect(body.nota).toBeNull();

    // Abrir la bitácora (residente) → la nota de avance se asienta sola.
    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);
    const notas = await (await request.get(`${API}/bitacora/contrato/${id}/notas`, { headers: { Authorization: `Bearer ${R.token}` } })).json();
    const blob = JSON.stringify(notas);
    expect(blob).toContain('Avance de trabajos');
    expect(blob).toContain('asentado al abrirla'); // la aclaración del asiento diferido

    // El avance ya tiene la nota ligada (nota_id no nulo en trabajosDeContrato).
    const t2 = await trabajos(request, S.token, id);
    expect(t2.avances[0].nota_id).not.toBeNull();
  });

  test('UI: selector de periodo + renglón del programa + toggle "ejecuté todo" → registra con nota en vivo', async ({ page, request }) => {
    const { id, R } = await crearContrato(request);
    // Bitácora abierta de antemano → la nota se asienta en vivo (no diferida).
    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);

    await freshHome(page);
    await enterAppMode(page, 'contratista'); // superintendente del contrato
    await goToViaSidebar(page, '/seguimiento/trabajos-terminados');
    await page.getByTestId('select-contrato').selectOption({ value: String(id) });

    await page.getByTestId('cap-concepto').selectOption({ index: 1 }); // C-001
    await page.getByTestId('cap-periodo').selectOption('1');
    // El renglón del programa muestra lo programado del periodo 1 (400).
    await expect(page.getByTestId('ref-programa')).toBeVisible();
    await expect(page.getByTestId('ref-programado-periodo')).toContainText('400');
    await expect(page.getByTestId('ref-disponible')).toContainText('400');
    // Toggle "ejecuté todo lo programado del periodo" → autollena 400.
    await page.getByTestId('toggle-todo-periodo').check();
    await expect(page.getByTestId('cap-cantidad')).toHaveValue('400');
    // Registrar → éxito; el avance aparece con su periodo y una nota (en vivo).
    await page.getByTestId('btn-registrar-avance').click();
    await expect(page.getByTestId('tabla-avances')).toContainText('Periodo 1');
    await expect(page.getByTestId('tabla-avances')).toContainText('#'); // número de nota asentada
  });
});
