// @ts-check
// ITEM 3.2 (Oleada 3) — Acto de AUTORIZACIÓN explícito del convenio por el servidor FACULTADO.
// Fundamento: LOPSRM art. 59 párr. 3 (el convenio debe ser AUTORIZADO por la persona servidora pública
// facultada) + RLOPSRM art. 99 p5 (suscripción por el servidor facultado, distinto del residente que
// sustenta) + art. 102 fr. I-III (variación > 25% exige el oficio/soporte antes de autorizar). El rol
// facultado se mapea a 'dependencia'. El convenio NACE 'registrado'; el acto de autorización (sella
// estado/autorizado_por/autorizado_en) es append-only y único.
//
// API-directa (login real). Requiere backend+BD; se salta en CI.
import { test, expect } from '@playwright/test';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const PDF = Buffer.from('%PDF-1.4\n%E2E\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const autorizar = (request, tok, id) => request.post(`${API}/convenios/${id}/autorizar`, { headers: auth(tok) });
const listar = (request, tok, cid) => request.get(`${API}/convenios/contrato/${cid}`, { headers: auth(tok) }).then((r) => r.json());

async function sesiones(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
  ]);
  return { R, S, V, D };
}

async function seedContrato(request, { R, S, V, D }) {
  const folio = `E2E-CONVAUT-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Autorización convenio e2e',
      plazoDias: 60, fechaInicio: '2026-06-01', superintendenteId: S.user.id, supervisionId: V.user.id,
      dependenciaId: D.user.id, anticipoPct: 0, juridicos: {},
      conceptos: [{ clave: 'C1', concepto: 'Excavación', unidad: 'm³', cantidad: 100, pu: 100 }],
      ciclo: 'mensual', programa: [{ clave: 'C1', periodoNumero: 1, cantidad: 100 }], garantias: [],
    },
  });
  expect(cr.status(), 'crear contrato').toBe(201);
  return (await cr.json()).id;
}

async function crearConvenioPlazo(request, R, cid, plazoNuevo) {
  const r = await request.post(`${API}/convenios/contrato/${cid}`, {
    headers: auth(R.token),
    data: { tipo: 'plazo', motivo: 'Causa fundada (dictamen técnico, art. 99 RLOPSRM)', plazo_nuevo_dias: plazoNuevo },
  });
  expect(r.status(), 'crear convenio').toBe(201);
  return r.json();
}

test.describe('ITEM 3.2 — autorización del convenio (art. 59 párr. 3 LOPSRM)', () => {
  test('nace REGISTRADO; solo la dependencia autoriza; el sello es único e inmutable', async ({ request }) => {
    const s = await sesiones(request);
    const cid = await seedContrato(request, s);
    const conv = await crearConvenioPlazo(request, s.R, cid, 66); // +10% (<=25%)
    expect(conv.estado, 'el convenio nace registrado').toBe('registrado');

    // listar → registrado, sin autorizador.
    let data = await listar(request, s.R.token, cid);
    let row = data.convenios.find((c) => c.id === conv.convenio_id);
    expect(row.estado).toBe('registrado');
    expect(row.autorizado_por, 'autorizado_por NULL hasta el acto formal').toBeNull();

    // autorizar como residente / contratista → 403 (no son el servidor facultado).
    expect((await autorizar(request, s.R.token, conv.convenio_id)).status(), 'residente no autoriza').toBe(403);
    expect((await autorizar(request, s.S.token, conv.convenio_id)).status(), 'contratista no autoriza').toBe(403);

    // autorizar como dependencia → 200, sella estado + autorizado_por + autorizado_en.
    const ok = await autorizar(request, s.D.token, conv.convenio_id);
    expect(ok.status(), 'dependencia autoriza').toBe(200);
    const oj = await ok.json();
    expect(oj.estado).toBe('autorizado');
    expect(oj.autorizado_por).toBe(s.D.user.id);
    expect(oj.autorizado_en).toBeTruthy();

    // re-autorizar → 409 (acto único).
    expect((await autorizar(request, s.D.token, conv.convenio_id)).status(), 're-autorizar es 409').toBe(409);

    // listar → autorizado, con autorizador.
    data = await listar(request, s.D.token, cid);
    row = data.convenios.find((c) => c.id === conv.convenio_id);
    expect(row.estado).toBe('autorizado');
    expect(row.autorizado_por).toBe(s.D.user.id);
    expect(row.autorizado_en).toBeTruthy();
  });

  test('guardrail art. 102: variación > 25% exige el oficio cargado antes de autorizar', async ({ request }) => {
    const s = await sesiones(request);
    const cid = await seedContrato(request, s);
    const conv = await crearConvenioPlazo(request, s.R, cid, 100); // +66% (>25%)
    expect(Math.abs(Number(conv.delta_plazo_pct))).toBeGreaterThan(25);

    // autorizar SIN oficio → 409 (art. 102).
    const sinOficio = await autorizar(request, s.D.token, conv.convenio_id);
    expect(sinOficio.status(), '>25% sin oficio es 409').toBe(409);
    expect((await sinOficio.json()).error).toContain('102');

    // cargar el oficio de aprobación (PDF) → reintentar autoriza → 200.
    const up = await request.post(`${API}/convenios/${conv.convenio_id}/oficio`, {
      headers: auth(s.D.token),
      multipart: { documento: { name: 'oficio.pdf', mimeType: 'application/pdf', buffer: PDF } },
    });
    expect(up.status(), 'subir oficio de aprobación').toBe(201);
    const ok = await autorizar(request, s.D.token, conv.convenio_id);
    expect(ok.status(), 'con oficio sí autoriza').toBe(200);
    expect((await ok.json()).estado).toBe('autorizado');
  });
});
