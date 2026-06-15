// @ts-check
// Plan2 Pase3 — HU-21: la fecha del pago NO puede ser anterior a la fecha de integración de la
// estimación (integrada_en). No se paga antes de que la estimación se integre.
//
// API-directa (sin UI): siembra contrato + PDF firmado ligado (requisito de integración) + estimación
// integrada, y luego registra el pago como FINANZAS. La validación es server-side en pagos.controller.
// SOLO se añade la validación de fecha; el cálculo del monto (importe = neto) NO se toca.
//
// LOGIN REAL (requiere backend+BD; cuentas semilla). No corre en CI.
import { test, expect } from '@playwright/test';

test.skip(!!process.env.CI, 'Plan2 Pase3: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const PDF = Buffer.from('%PDF-1.4\n%E2E\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// Siembra un contrato (con PDF firmado) e integra UNA estimación. Devuelve { cid, est, F }, donde
// `est` es la estimación integrada (incluye integrada_en y neto) y `F` el token de finanzas.
// Anticipo 0 → sin amortización y sin PDF de autorización (no supera el umbral del 30%).
async function sembrarEstimacionIntegrada(request) {
  const [R, S, V, D, F] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
    loginApi(request, 'finanzas@sigecop.test'),
  ]);
  const folio = `E2E-PAGO-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Pago fecha e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 0, penaConvencionalPct: null, juridicos: {},
      conceptos: [{ clave: 'C-001', concepto: 'Concepto guía', unidad: 'm³', cantidad: 1000, pu: 200 }],
      ciclo: 'mensual',
      programa: [{ clave: 'C-001', periodoNumero: 1, cantidad: 1000 }],
      garantias: [],
    },
  });
  expect(cr.status(), 'crear contrato').toBe(201);
  const cid = (await cr.json()).id;

  // PDF firmado ligado: sin él, integrarEstimacion responde 409 (formalización HU-01).
  const up = await request.post(`${API}/contratos/${cid}/documento`, {
    headers: auth(R.token),
    multipart: { documento: { name: 'firmado.pdf', mimeType: 'application/pdf', buffer: PDF } },
  });
  expect(up.status(), 'subir PDF firmado').toBe(201);

  // contrato_concepto_id real (vía el avance del contrato).
  const av = await request.get(`${API}/estimaciones/contrato/${cid}/avance`, { headers: auth(S.token) });
  const ccid = (await av.json())[0].contrato_concepto_id;

  // Integra la estimación como superintendente (contratista). integrada_en = NOW() (al integrar).
  const er = await request.post(`${API}/estimaciones`, {
    headers: auth(S.token),
    data: {
      contrato_id: cid, periodo_inicio: '2026-06-01', periodo_fin: '2026-06-30',
      generadores: [{ contrato_concepto_id: ccid, cantidad_periodo: 400 }], notas: [],
    },
  });
  expect(er.status(), 'integrar estimación').toBe(201);
  const est = await er.json();

  // OLEADA PAGO (14-jun, art. 54): el pago exige estado 'autorizada'. Recorremos el ciclo (presentar →
  // turnar → autorizar). integrada_en y neto NO cambian, así que las pruebas de FECHA siguen siendo válidas.
  const Cic = (id) => `${API}/estimaciones-ciclo/estimacion/${id}`;
  expect((await request.post(`${Cic(est.id)}/enviar`, { headers: auth(S.token) })).status(), 'presentar').toBe(200);
  expect((await request.post(`${Cic(est.id)}/turnar`, { headers: auth(V.token), data: { sin_observaciones: true } })).status(), 'turnar').toBe(200);
  expect((await request.post(`${Cic(est.id)}/autorizar`, { headers: auth(R.token) })).status(), 'autorizar').toBe(200);
  return { cid, est, F };
}

// Cuerpo del pago. El importe NO se envía: se deriva del neto de la estimación (server-side).
const pagoBody = (cid, estId, fechaPago) => ({
  contrato_id: cid, estimacion_id: estId, fecha_pago: fechaPago,
  referencia: 'SPEI-E2E-0001', factura_cfdi: 'CFDI-E2E-0001', fecha_factura: fechaPago,
});

test.describe('Plan2 Pase3 — el pago no puede ser anterior a la integración de la estimación (HU-21)', () => {
  test('RECHAZO: fecha de pago anterior a integrada_en → 400 con mensaje claro', async ({ request }) => {
    const { cid, est, F } = await sembrarEstimacionIntegrada(request);
    const r = await request.post(`${API}/pagos`, {
      headers: auth(F.token),
      data: pagoBody(cid, est.id, '2000-01-01'), // claramente anterior a la integración
    });
    expect(r.status(), 'pago con fecha anterior a la integración').toBe(400);
    expect((await r.json()).error).toMatch(/integraci[oó]n|integrada/i);
  });

  test('FELIZ: fecha de pago = día de integración → 201 e importe = neto (cálculo intacto)', async ({ request }) => {
    const { cid, est, F } = await sembrarEstimacionIntegrada(request);
    const diaIntegracion = String(est.integrada_en).slice(0, 10); // mismo día (válido: comparación estricta <)
    const r = await request.post(`${API}/pagos`, {
      headers: auth(F.token),
      data: pagoBody(cid, est.id, diaIntegracion),
    });
    expect(r.status(), 'pago en el día de la integración').toBe(201);
    const pago = await r.json();
    expect(pago.estimacion_id, 'pago amarrado a la estimación').toBe(est.id);
    expect(Number(pago.importe), 'importe = neto de la estimación (no se tocó el cálculo)').toBe(Number(est.neto));
  });

  test('FELIZ: fecha de pago posterior a la integración → 201', async ({ request }) => {
    const { cid, est, F } = await sembrarEstimacionIntegrada(request);
    const r = await request.post(`${API}/pagos`, {
      headers: auth(F.token),
      data: pagoBody(cid, est.id, '2026-12-31'), // muy posterior a la integración
    });
    expect(r.status(), 'pago posterior a la integración').toBe(201);
  });
});
