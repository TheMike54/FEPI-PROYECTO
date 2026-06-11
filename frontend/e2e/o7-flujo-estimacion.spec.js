// @ts-check
// E2E O7 — FLUJO LEGAL invertido de la estimación (art. 54 LOPSRM, confirmado por el profe): el
// CONTRATISTA PRESENTA (HU-12, 'integrada' = "Presentada"); la RESIDENCIA REVISA y AUTORIZA (HU-13,
// 'enviada' = "Autorizada", actor superintendente→RESIDENTE); finanzas PAGA lo autorizado (HU-21).
// Cubre el ciclo completo con los roles NUEVOS + los candados (el superintendente ya no autoriza).
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'O7: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const PDF = Buffer.from('%PDF-1.4\n%E2E\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// Crea contrato (R residente/creador, S superintendente, D dependencia) + PDF firmado y PRESENTA una
// estimación COMO EL CONTRATISTA (S, superintendente). Devuelve { cid, est, R, S, F }.
async function presentarEstimacion(request) {
  const [R, S, V, D, F] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
    loginApi(request, 'finanzas@sigecop.test'),
  ]);
  const folio = `E2E-O7-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Flujo O7', plazoDias: 60,
      fechaInicio: '2026-06-01', superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 0, juridicos: {},
      conceptos: [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad: 1000, pu: 200 }],
      ciclo: 'mensual', programa: [{ clave: 'C-001', periodoNumero: 1, cantidad: 1000 }], garantias: [],
    },
  });
  expect(cr.status(), 'crear contrato').toBe(201);
  const cid = (await cr.json()).id;
  // PDF firmado ligado: requisito de la integración (formalización HU-01).
  const up = await request.post(`${API}/contratos/${cid}/documento`, {
    headers: auth(R.token), multipart: { documento: { name: 'firmado.pdf', mimeType: 'application/pdf', buffer: PDF } },
  });
  expect(up.status(), 'subir PDF firmado').toBe(201);
  const av = await request.get(`${API}/estimaciones/contrato/${cid}/avance`, { headers: auth(S.token) });
  const ccid = (await av.json())[0].contrato_concepto_id;
  // El CONTRATISTA (superintendente) PRESENTA la estimación.
  const er = await request.post(`${API}/estimaciones`, {
    headers: auth(S.token),
    data: { contrato_id: cid, periodo_inicio: '2026-06-01', periodo_fin: '2026-06-30', generadores: [{ contrato_concepto_id: ccid, cantidad_periodo: 400 }], notas: [] },
  });
  expect(er.status(), 'contratista presenta').toBe(201);
  const est = await er.json();
  expect(est.estado, 'estado interno integrada').toBe('integrada');
  return { cid, est, R, S, F };
}

const autorizar = (request, token, id) => request.post(`${API}/estimaciones-ciclo/estimacion/${id}/enviar`, { headers: auth(token) });
const pagar = (request, token, cid, estId) => request.post(`${API}/pagos`, {
  headers: auth(token),
  data: { contrato_id: cid, estimacion_id: estId, fecha_pago: '2026-06-30', referencia: 'SPEI-O7', factura_cfdi: 'CFDI-O7', fecha_factura: '2026-06-30' },
});

test.describe('O7 — flujo legal invertido de la estimación (art. 54)', () => {
  test('API: el superintendente NO autoriza; la RESIDENCIA autoriza; finanzas paga lo autorizado', async ({ request }) => {
    const { cid, est, R, S, F } = await presentarEstimacion(request);

    // El superintendente (antes autorizaba) ya NO: el candado pasó a la residencia.
    const noSup = await autorizar(request, S.token, est.id);
    expect(noSup.status(), 'el superintendente NO autoriza').toBe(403);

    // La RESIDENCIA revisa y autoriza → 'enviada' (Autorizada) + sello de autorización.
    const aut = await autorizar(request, R.token, est.id);
    expect(aut.status(), 'la residencia autoriza').toBe(200);
    const aj = await aut.json();
    expect(aj.estado, "avanza a 'enviada' (= Autorizada)").toBe('enviada');
    expect(aj.enviada_en, 'sella la fecha de autorización').toBeTruthy();

    // No se reautoriza.
    expect((await autorizar(request, R.token, est.id)).status(), 'reautorizar 409').toBe(409);

    // Finanzas paga la estimación AUTORIZADA ('enviada') → 201 (Opción A: 'enviada' es pagable).
    const pago = await pagar(request, F.token, cid, est.id);
    expect(pago.status(), 'finanzas paga lo autorizado').toBe(201);
  });

  test('Opción A (no bloqueante esta fase): pagar una PRESENTADA (sin autorizar) AÚN se permite (201)', async ({ request }) => {
    // Decisión de Maiki: el candado de pago conserva 'integrada' (permisivo) mientras los plazos del
    // art. 54 son referencia visual. Este test DOCUMENTA y BLINDA esa decisión: si alguien endurece el
    // candado a solo-autorizado (quita 'integrada'), este test fallará y forzará una decisión consciente.
    const { cid, est, F } = await presentarEstimacion(request); // estimación en 'integrada' (Presentada)
    const pago = await pagar(request, F.token, cid, est.id);
    expect(pago.status(), "Opción A: pagar la 'Presentada' (integrada) sigue permitido").toBe(201);
  });

  test('UI: la residencia ve "Presentada", autoriza, y la fila pasa a "Autorizada"', async ({ page, request }) => {
    const { cid, est } = await presentarEstimacion(request);

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/estimaciones/envio');
    await page.getByTestId('select-contrato').selectOption(String(cid));

    const fila = page.getByTestId(`fila-envio-${est.id}`);
    await expect(fila).toContainText('Presentada');
    await fila.getByRole('button', { name: 'Autorizar estimación' }).click();
    await expect(fila).toContainText('Autorizada');
    const sello = fila.locator('[data-testid^="sello-autorizacion-"]');
    await expect(sello).toContainText('Autorizada el');
    // Tras autorizar, aparece el semáforo del plazo de PAGO (20 días, art. 54) — referencia visual.
    await expect(sello).toContainText('Pago: día');
  });

  test('UI: HU-12 quedó reetiquetada para "Formular y presentar" (contratista)', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, '/estimaciones/integracion');
    await expect(page.getByRole('heading', { name: 'Formular y presentar la estimación' })).toBeVisible();
  });
});
