// @ts-check
// Etapa C — Retención por ATRASO (penas convencionales, art. 138/139 RLOPSRM) + avance físico/financiero.
//   · Carátula viva: con pena pactada y atraso (ejecutado < programado) → retención = pena × bruto.
//   · Sin pena pactada (NULL) → retención por atraso $0 (aunque haya atraso).
//   · Server (integrar): guarda retencion_atraso + avance_fisico_pct/avance_financiero_pct (snapshot).
// Ejemplo guía: C-001 400×$200 (anticipo 30%, pena 0.05, atraso) → bruto 80,000 − amort 24,000
//   − 5 al millar 400 − retención atraso 4,000 = neto $51,600.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'Etapa C: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const VIEW = '/estimaciones/integracion';
const PDF = Buffer.from('%PDF-1.4\n%E2E\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

// Contrato: C-001 PU200 contratado 1000, anticipo 30%, programa P1=800 + P2=200 (cuadra 100%).
// P1 = 2026-06-01..2026-06-30. Estimar 400 en P1: ejecutado 80,000 < programado 160,000 → ATRASO.
async function crearContrato(request, { pena, conPdf = false } = {}) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'), loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'), loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-RETC-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Retención atraso e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 30, penaConvencionalPct: pena ?? null, juridicos: {},
      conceptos: [{ clave: 'C-001', concepto: 'Concepto guía', unidad: 'm³', cantidad: 1000, pu: 200 }],
      ciclo: 'mensual',
      programa: [{ clave: 'C-001', periodoNumero: 1, cantidad: 800 }, { clave: 'C-001', periodoNumero: 2, cantidad: 200 }],
      garantias: []
    }
  });
  expect(r.status(), 'crear contrato').toBe(201);
  const cid = (await r.json()).id;
  if (conPdf) {
    const up = await request.post(`${API}/contratos/${cid}/documento`, {
      headers: { Authorization: `Bearer ${R.token}` },
      multipart: { documento: { name: 'firmado.pdf', mimeType: 'application/pdf', buffer: PDF } }
    });
    expect(up.status(), 'subir PDF firmado').toBe(201);
  }
  return { cid, folio, S };
}

async function abrir(page, request, opts) {
  const { folio } = await crearContrato(request, opts);
  await freshHome(page);
  await enterAppMode(page, 'contratista'); // superintendente del contrato
  await goToViaSidebar(page, VIEW);
  const sel = page.getByTestId('select-contrato');
  const val = await sel.locator('option', { hasText: folio }).first().getAttribute('value');
  await sel.selectOption(val);
  await expect(page.getByTestId('barras-avance')).toBeVisible();
  await page.getByTestId('periodo-inicio').fill('2026-06-01');
  await page.getByTestId('periodo-fin').fill('2026-06-30');
}
const volInput = (page) => page.getByTestId('tabla-generadores').locator('input[type="number"]').first();

test.describe('Etapa C — retención por atraso (carátula viva + server)', () => {
  test('carátula viva: pena 5% + atraso → retención $4,000 (badge atraso) y neto $51,600', async ({ page, request }) => {
    await abrir(page, request, { pena: 0.05 });
    await volInput(page).fill('400');
    await expect(page.getByTestId('caratula-retencion-atraso')).toContainText('4,000');
    await expect(page.getByTestId('badge-atraso')).toBeVisible();
    await expect(page.getByTestId('caratula-neto-preview')).toContainText('51,600');
  });

  test('sin pena pactada (NULL) → retención por atraso $0 aunque haya atraso (neto $55,600)', async ({ page, request }) => {
    await abrir(page, request, { pena: null });
    await volInput(page).fill('400');
    await expect(page.getByTestId('caratula-retencion-atraso')).toContainText('$0.00');
    await expect(page.getByTestId('badge-atraso')).toHaveCount(0);
    await expect(page.getByTestId('caratula-neto-preview')).toContainText('55,600');
  });

  test('server (integrar): guarda retención atraso $4,000, neto $51,600 y avances físico/financiero', async ({ request }) => {
    const { cid, S } = await crearContrato(request, { pena: 0.05, conPdf: true });
    const av = await request.get(`${API}/estimaciones/contrato/${cid}/avance`, { headers: { Authorization: `Bearer ${S.token}` } });
    const ccid = (await av.json())[0].contrato_concepto_id;
    const r = await request.post(`${API}/estimaciones`, {
      headers: { Authorization: `Bearer ${S.token}` },
      data: { contrato_id: cid, periodo_inicio: '2026-06-01', periodo_fin: '2026-06-30',
        generadores: [{ contrato_concepto_id: ccid, cantidad_periodo: 400 }], notas: [] }
    });
    expect(r.status(), 'integrar estimación').toBe(201);
    const est = await r.json();
    expect(Number(est.subtotal)).toBe(80000);
    expect(Number(est.amortizacion)).toBe(24000);
    expect(Number(est.retencion)).toBe(400);
    expect(Number(est.retencion_atraso), 'retención por atraso = 0.05 × 80,000').toBe(4000);
    expect(Number(est.neto), 'neto = 80,000 − 24,000 − 400 − 4,000').toBe(51600);
    expect(Number(est.avance_fisico_pct), 'físico = 80,000/200,000').toBeCloseTo(40, 2);
    expect(Number(est.avance_financiero_pct), 'financiero = pagado(0)/monto').toBe(0);
  });
});
