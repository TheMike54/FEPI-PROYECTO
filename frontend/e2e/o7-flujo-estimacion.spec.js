// @ts-check
// E2E — FLUJO RECONCILIADO de la estimación (art. 54 LOPSRM). RECONCILIACIÓN O7↔HU-15 (11-jun): con HU-15
// integrado, el ciclo REAL es: el CONTRATISTA INTEGRA (HU-12, 'integrada'="Integrada") y PRESENTA (HU-13,
// 'enviada'="Presentada"); SUPERVISIÓN revisa/turna y la RESIDENCIA autoriza/rechaza (HU-15,
// 'autorizada'="Autorizada" / 'rechazada'); finanzas PAGA (HU-21). (O7 había puesto la autorización del
// residente en HU-13 como solución temporal sin HU-15; aquí se reconcilia al flujo definitivo.)
// Cubre el ciclo completo + los candados de cada actor. LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const PDF = Buffer.from('%PDF-1.4\n%E2E\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// Higiene de BD de prueba: cada test crea un contrato E2E-RECON-* (uno con estimación 'rechazada'),
// que es append-only por diseño. Sin limpieza, la BD acumula rechazadas entre corridas y rompe métricas
// globales (p.ej. el contador del tablero HU-17). El afterAll revierte esos contratos vía psql, igual que
// hu-14/hu-17 con su unseed. Corre contra el stack local (docker); en CI el describe entero está skipped.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(__dirname, '../../backend/scripts');
function runSql(file) {
  const sql = readFileSync(path.join(SEED_DIR, file));
  execFileSync(
    'docker',
    ['exec', '-i', 'sigecop_db', 'psql', '-U', 'sigecop', '-d', 'sigecop_db', '-v', 'ON_ERROR_STOP=1', '-q'],
    { input: sql, stdio: ['pipe', 'ignore', 'inherit'] }
  );
}
test.afterAll(() => runSql('unseed_o7_recon.sql'));

// Crea contrato (R residente/creador, S superintendente, V supervisión, D dependencia) + PDF firmado e
// INTEGRA una estimación (HU-12, como el contratista). Devuelve { cid, est ('integrada'), R, S, V, F }.
async function crearEstimacionIntegrada(request) {
  const [R, S, V, D, F] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
    loginApi(request, 'finanzas@sigecop.test'),
  ]);
  const folio = `E2E-RECON-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Flujo reconciliado', plazoDias: 60,
      fechaInicio: '2026-06-01', superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 0, juridicos: {},
      conceptos: [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad: 1000, pu: 200 }],
      ciclo: 'mensual', programa: [{ clave: 'C-001', periodoNumero: 1, cantidad: 1000 }], garantias: [],
    },
  });
  expect(cr.status(), 'crear contrato').toBe(201);
  const cid = (await cr.json()).id;
  const up = await request.post(`${API}/contratos/${cid}/documento`, {
    headers: auth(R.token), multipart: { documento: { name: 'firmado.pdf', mimeType: 'application/pdf', buffer: PDF } },
  });
  expect(up.status(), 'subir PDF firmado').toBe(201);
  const av = await request.get(`${API}/estimaciones/contrato/${cid}/avance`, { headers: auth(S.token) });
  const ccid = (await av.json())[0].contrato_concepto_id;
  // El CONTRATISTA INTEGRA la estimación (HU-12).
  const er = await request.post(`${API}/estimaciones`, {
    headers: auth(S.token),
    data: { contrato_id: cid, periodo_inicio: '2026-06-01', periodo_fin: '2026-06-30', generadores: [{ contrato_concepto_id: ccid, cantidad_periodo: 400 }], notas: [] },
  });
  expect(er.status(), 'contratista integra').toBe(201);
  const est = await er.json();
  expect(est.estado, 'estado interno integrada').toBe('integrada');
  return { cid, est, R, S, V, F };
}

const C = (id) => `${API}/estimaciones-ciclo/estimacion/${id}`;
const presentar = (request, token, id) => request.post(`${C(id)}/enviar`, { headers: auth(token) });        // HU-13
const observar  = (request, token, id) => request.post(`${C(id)}/observaciones`, { headers: auth(token), data: { seccion: 'caratula', tipo: 'aclaracion', severidad: 'menor', descripcion: 'Revisar acumulado' } });
const turnar    = (request, token, id, body) => request.post(`${C(id)}/turnar`, { headers: auth(token), data: body || {} });
const autorizar = (request, token, id) => request.post(`${C(id)}/autorizar`, { headers: auth(token) });     // HU-15
const rechazar  = (request, token, id, body) => request.post(`${C(id)}/rechazar`, { headers: auth(token), data: body });
const pagar = (request, token, cid, estId) => request.post(`${API}/pagos`, {
  headers: auth(token),
  data: { contrato_id: cid, estimacion_id: estId, fecha_pago: '2026-06-30', referencia: 'SPEI-R', factura_cfdi: 'CFDI-R', fecha_factura: '2026-06-30' },
});

test.describe('Flujo reconciliado de la estimación (O7↔HU-15, art. 54)', () => {
  test('API: contratista presenta (residente NO); supervisión turna; residencia autoriza (superintendente NO); finanzas paga', async ({ request }) => {
    const { cid, est, R, S, V, F } = await crearEstimacionIntegrada(request);

    // HU-13: el residente NO presenta (candado = superintendente).
    expect((await presentar(request, R.token, est.id)).status(), 'residente NO presenta').toBe(403);
    // HU-13: el superintendente PRESENTA → 'enviada' (Presentada).
    const pres = await presentar(request, S.token, est.id);
    expect(pres.status(), 'contratista presenta').toBe(200);
    expect((await pres.json()).estado, "avanza a 'enviada' (= Presentada)").toBe('enviada');
    expect((await presentar(request, S.token, est.id)).status(), 're-presentar 409').toBe(409);

    // HU-15: autorizar ANTES de turnar → 409.
    expect((await autorizar(request, R.token, est.id)).status(), 'autorizar sin turnar 409').toBe(409);
    // HU-15: supervisión observa y turna (la residencia/superintendente NO observan).
    expect((await observar(request, V.token, est.id)).status(), 'supervisión observa').toBe(201);
    expect((await observar(request, R.token, est.id)).status(), 'residente NO observa').toBe(403);
    expect((await turnar(request, V.token, est.id)).status(), 'supervisión turna').toBe(200);

    // HU-15: el superintendente NO autoriza; la RESIDENCIA autoriza → 'autorizada' (Autorizada).
    expect((await autorizar(request, S.token, est.id)).status(), 'superintendente NO autoriza').toBe(403);
    const aut = await autorizar(request, R.token, est.id);
    expect(aut.status(), 'residencia autoriza').toBe(200);
    expect((await aut.json()).estado, "avanza a 'autorizada'").toBe('autorizada');

    // HU-21: finanzas paga la AUTORIZADA → 201.
    expect((await pagar(request, F.token, cid, est.id)).status(), 'finanzas paga la autorizada').toBe(201);
  });

  test('API: la residencia puede RECHAZAR la presentada (tras turnado) → rechazada + observación', async ({ request }) => {
    const { est, R, S, V } = await crearEstimacionIntegrada(request);
    expect((await presentar(request, S.token, est.id)).status()).toBe(200);
    expect((await turnar(request, V.token, est.id, { sin_observaciones: true })).status(), 'turna sin observaciones').toBe(200);
    const rech = await rechazar(request, R.token, est.id, { motivo: 'Carátula con error en amortización', seccion: 'caratula', severidad: 'mayor' });
    expect(rech.status(), 'residencia rechaza').toBe(200);
    const rj = await rech.json();
    expect(rj.estimacion.estado, "avanza a 'rechazada'").toBe('rechazada');
    expect(rj.observacion.tipo, 'registra la observación del rechazo').toBe('rechazo');
  });

  test('OLEADA PAGO (art. 54): pagar una INTEGRADA (sin presentar/autorizar) se RECHAZA (409)', async ({ request }) => {
    // Candado ESTRICTO (14-jun, confirmado por la ley): el art. 54 LOPSRM hace de la AUTORIZACIÓN de la
    // residencia el disparador del pago. Pagar una 'integrada'/'enviada' (no autorizada) responde 409.
    // El camino feliz —pagar la AUTORIZADA→201— ya lo cubre el primer test de este describe.
    const { cid, est, F } = await crearEstimacionIntegrada(request);
    const r = await pagar(request, F.token, cid, est.id);
    expect(r.status(), "pagar la 'Integrada' (no autorizada) → 409").toBe(409);
    expect((await r.json()).error, 'el mensaje cita la autorización (art. 54)').toMatch(/autorizada|art\. 54/i);
  });

  test('UI: el contratista ve "Integrada", presenta, y la fila pasa a "Presentada"', async ({ page, request }) => {
    const { cid, est } = await crearEstimacionIntegrada(request);

    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, '/estimaciones/envio');
    await page.getByTestId('select-contrato').selectOption(String(cid));

    const fila = page.getByTestId(`fila-envio-${est.id}`);
    await expect(fila).toContainText('Integrada');
    await fila.getByRole('button', { name: 'Presentar estimación' }).click();
    await expect(fila).toContainText('Presentada');
    const sello = fila.locator('[data-testid^="sello-presentacion-"]');
    await expect(sello).toContainText('Presentada el');
    // Tras presentar, aparece el semáforo del plazo de revisión (HU-15, 15 días, art. 54).
    await expect(sello).toContainText('Revisión (HU-15): día');
  });

  test('UI: HU-12 conserva su etiqueta de INTEGRACIÓN (contratista integra)', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
    await goToViaSidebar(page, '/estimaciones/integracion');
    await expect(page.getByRole('heading', { name: 'Apertura del periodo e integración de la estimación' })).toBeVisible();
  });
});
