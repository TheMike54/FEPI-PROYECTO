// @ts-check
// ITEM 3.1 (Oleada 3) — HU-20: partida presupuestal OBLIGATORIA + join por FK dependencia_id.
// Fundamento: art. 24 párr. 2 LOPSRM ("...suficiencia presupuestaria en la PARTIDA O PARTIDAS
// ESPECÍFICAS..."). La ley ata la suficiencia a la PARTIDA específica → la partida es obligatoria al
// cargar el techo, y la unicidad del techo es (ejercicio, dependencia_id, partida). El join
// contrato↔presupuesto se hace por la FK estable contratos.dependencia_id (no por el texto, que se
// rompe al renombrar la cuenta).
//
// API-directa (login real). Requiere backend+BD; se salta en CI. Usa ejercicios "raros" (2030/2031)
// para no cruzarse con flujos reales y partidas FIJAS (ON CONFLICT actualiza, no duplica).
import { test, expect } from '@playwright/test';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const PDF = Buffer.from('%PDF-1.4\n%E2E\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const presupuesto = (request, F, data) => request.post(`${API}/instruccion-pago/presupuesto`, { headers: auth(F.token), data });
const transito = (request, F, id) => request.get(`${API}/instruccion-pago/estimacion/${id}`, { headers: auth(F.token) }).then((r) => r.json());

// Siembra contrato (dependencia depEmail) + estimación AUTORIZADA. Anticipo 0 (sin amortización ni PDF de
// autorización). conceptos C-001 cant 1000 pu 200; generadores 400 → importe 80 000, neto ≈ 79 600.
async function sembrarEstimacionAutorizada(request, depEmail, fechaInicio, periodoIni, periodoFin) {
  const [R, S, V, F] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'finanzas@sigecop.test'),
  ]);
  const D = await loginApi(request, depEmail);
  const folio = `E2E-P31-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Partida+FK e2e',
      plazoDias: 60, fechaInicio,
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 0, penaConvencionalPct: null, juridicos: {},
      conceptos: [{ clave: 'C-001', concepto: 'Concepto guía', unidad: 'm³', cantidad: 1000, pu: 200 }],
      ciclo: 'mensual', programa: [{ clave: 'C-001', periodoNumero: 1, cantidad: 1000 }], garantias: [],
    },
  });
  expect(cr.status(), 'crear contrato').toBe(201);
  const cid = (await cr.json()).id;

  const up = await request.post(`${API}/contratos/${cid}/documento`, {
    headers: auth(R.token),
    multipart: { documento: { name: 'firmado.pdf', mimeType: 'application/pdf', buffer: PDF } },
  });
  expect(up.status(), 'subir PDF firmado').toBe(201);

  const av = await request.get(`${API}/estimaciones/contrato/${cid}/avance`, { headers: auth(S.token) });
  const ccid = (await av.json())[0].contrato_concepto_id;

  const er = await request.post(`${API}/estimaciones`, {
    headers: auth(S.token),
    data: { contrato_id: cid, periodo_inicio: periodoIni, periodo_fin: periodoFin, generadores: [{ contrato_concepto_id: ccid, cantidad_periodo: 400 }], notas: [] },
  });
  expect(er.status(), 'integrar estimación').toBe(201);
  const est = await er.json();

  const Cic = (id) => `${API}/estimaciones-ciclo/estimacion/${id}`;
  expect((await request.post(`${Cic(est.id)}/enviar`, { headers: auth(S.token) })).status(), 'presentar').toBe(200);
  expect((await request.post(`${Cic(est.id)}/turnar`, { headers: auth(V.token), data: { sin_observaciones: true } })).status(), 'turnar').toBe(200);
  expect((await request.post(`${Cic(est.id)}/autorizar`, { headers: auth(R.token) })).status(), 'autorizar').toBe(200);
  return { cid, est, F, D };
}

test.describe('ITEM 3.1 — HU-20 partida obligatoria + join por FK dependencia_id', () => {
  test('crearPresupuesto exige partida (art. 24) y la unicidad es (ejercicio, dependencia_id, partida)', async ({ request }) => {
    const F = await loginApi(request, 'finanzas@sigecop.test');
    const D = await loginApi(request, 'dependencia@sigecop.test');
    const ej = 2031; // ejercicio aislado para este caso (no toca flujos reales)
    const partida = 'P31-UNIQ-A';

    // sin partida → 400 (art. 24).
    const r1 = await presupuesto(request, F, { ejercicio: ej, dependenciaId: D.user.id, techo: 1000 });
    expect(r1.status(), 'sin partida debe rechazarse').toBe(400);
    expect((await r1.json()).error).toContain('partida');

    // con partida + dependenciaId → 201, fila con FK y partida; el texto se resuelve de la cuenta.
    const r2 = await presupuesto(request, F, { ejercicio: ej, dependenciaId: D.user.id, partida, techo: 1000 });
    expect(r2.status()).toBe(201);
    const row2 = await r2.json();
    expect(row2.dependencia_id).toBe(D.user.id);
    expect(row2.partida).toBe(partida);
    expect(row2.dependencia).toBe(D.user.nombre);

    // ON CONFLICT (mismo ejercicio, dependencia_id, partida) → MISMA fila, actualiza techo.
    const r3 = await presupuesto(request, F, { ejercicio: ej, dependenciaId: D.user.id, partida, techo: 2000 });
    expect(r3.status()).toBe(201);
    const row3 = await r3.json();
    expect(row3.id).toBe(row2.id);
    expect(Number(row3.techo)).toBe(2000);

    // otra partida, misma dependencia/ejercicio → SEGUNDA fila (la unicidad incluye partida).
    const r4 = await presupuesto(request, F, { ejercicio: ej, dependenciaId: D.user.id, partida: 'P31-UNIQ-B', techo: 500 });
    expect(r4.status()).toBe(201);
    expect((await r4.json()).id).not.toBe(row2.id);

    // dependenciaId que no es una cuenta de dependencia → 400.
    const r5 = await presupuesto(request, F, { ejercicio: ej, dependenciaId: 999999, partida, techo: 1000 });
    expect(r5.status()).toBe(400);
  });

  test('la suficiencia se ata por FK dependencia_id: el techo de OTRA dependencia no se cruza', async ({ request }) => {
    // ejercicio 2030 dedicado a este test (ningún flujo real lo usa) + partidas FIJAS por dependencia
    // (ON CONFLICT actualiza, no duplica) → re-ejecutable: el techo de D es SIEMPRE su valor conocido.
    const { est, F, D } = await sembrarEstimacionAutorizada(request, 'dependencia@sigecop.test', '2030-06-01', '2030-06-01', '2030-06-30');
    const D2 = await loginApi(request, 'dep2@sigecop.test');
    const ej = 2030;

    // La estimación expone la FK de SU dependencia.
    let t = await transito(request, F, est.id);
    expect(t.estimacion.dependencia_id, 'estadoTransito expone la FK de la dependencia').toBe(D.user.id);

    // Techo de OTRA dependencia (D2) con monto DISTINTIVO (123): NO debe filtrarse al techo de D.
    expect((await presupuesto(request, F, { ejercicio: ej, dependenciaId: D2.user.id, partida: 'P31-JOIN-D2', techo: 123 })).status()).toBe(201);
    // Techo de D con monto CONOCIDO (ON CONFLICT lo fija; D/2030 tiene una sola partida en este test).
    const techoD = await presupuesto(request, F, { ejercicio: ej, dependenciaId: D.user.id, partida: 'P31-JOIN-D', techo: 900_000_000 });
    expect(techoD.status()).toBe(201);

    t = await transito(request, F, est.id);
    expect(t.suficiencia.sin_presupuesto).toBe(false);
    // El techo de D es EXACTAMENTE el suyo (900M), no 900M+123: la partida de D2 NO se cruza (join por FK).
    expect(Number(t.suficiencia.techo), 'el techo de D2 no se suma al de D').toBe(900000000);
    expect(t.suficiencia.excede).toBe(false);
    const presId = t.suficiencia.presupuesto_id;
    expect(presId).toBeTruthy();

    // Soportes + generar instrucción → liga la partida de D (misma fila que usó la suficiencia).
    await request.post(`${API}/instruccion-pago/estimacion/${est.id}/soportes`, { headers: auth(F.token), data: { nombre: 'Factura', descripcion: 'F-1' } });
    await request.post(`${API}/instruccion-pago/estimacion/${est.id}/soportes`, { headers: auth(F.token), data: { nombre: 'CFDI', descripcion: 'CFDI-123' } });
    const gen = await request.post(`${API}/instruccion-pago/estimacion/${est.id}`, { headers: auth(F.token) });
    expect(gen.status(), 'generar instrucción').toBe(201);
    expect((await gen.json()).instruccion.presupuesto_anual_id, 'la instrucción liga el techo de la partida de D').toBe(presId);
  });
});
