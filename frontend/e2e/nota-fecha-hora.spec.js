// @ts-check
// Plan2 Pase 2.2 — cada nota de bitácora muestra FECHA Y HORA de creación (la columna `fecha` es
// TIMESTAMPTZ; antes la UI la recortaba con soloFecha a solo el día). Cambio frontend-puro.
//
// Siembra por API (patrón de bitácora-v2): contrato + apertura + 3 firmas + nota emitida; luego en la
// UI (HU-09, /bitacora/notas) se verifica que la fecha de la nota incluye la hora (formato HH:MM).
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'Plan2 Pase2.2: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const login = async (ctx, email) => (await ctx.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function actores(ctx) {
  const R = await login(ctx, 'residente@sigecop.test');
  const S = await login(ctx, 'contratista@sigecop.test');
  const V = await login(ctx, 'supervision@sigecop.test');
  return { R, S, V };
}
async function crearContrato(ctx, token, folio, superId, supId) {
  const D = await login(ctx, 'dependencia@sigecop.test');
  const r = await ctx.post(`${API}/contratos`, {
    headers: auth(token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Obra e2e fecha+hora',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: superId, supervisionId: supId, dependenciaId: D.user.id, anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'Concepto e2e', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: [],
    },
  });
  expect(r.status(), 'crear contrato').toBe(201);
  return (await r.json()).id;
}
async function aperturar(ctx, token, contratoId) {
  const r = await ctx.post(`${API}/bitacora/apertura`, {
    headers: auth(token),
    data: {
      contratoId, fechaEntregaSitio: '2026-06-01', plazoFirmaDias: 2,
      domicilioDependencia: 'Av. Reforma 1', telefonoDependencia: '7471234567',
      domicilioContratista: 'Calle Obra 2', telefonoContratista: '7479876543',
      descripcionTrabajos: 'Construcción de nave', caracteristicasSitio: 'Terreno plano',
    },
  });
  expect(r.status(), 'apertura').toBe(201);
  return (await r.json()).id;
}
const firmarApertura = (ctx, token, apId) => ctx.post(`${API}/bitacora/${apId}/firmar`, { headers: auth(token) });
const emitir = (ctx, token, apId, body) => ctx.post(`${API}/bitacora/${apId}/notas`, { headers: auth(token), data: body });

test('Plan2 Pase2.2 — la nota de bitácora muestra fecha Y hora de creación', async ({ page, request }) => {
  const { R, S, V } = await actores(request);
  const folio = `E2E-FH-${Date.now()}`;
  const cid = await crearContrato(request, R.token, folio, S.user.id, V.user.id);
  const apId = await aperturar(request, R.token, cid);
  await firmarApertura(request, R.token, apId);
  await firmarApertura(request, S.token, apId);
  await firmarApertura(request, V.token, apId);
  const em = await emitir(request, R.token, apId, { tipo: 'res_estimaciones', contenido: 'Autorizo estimación' });
  expect(em.status()).toBe(201); // nota #2 (la apertura es la #1)

  await freshHome(page);
  await enterAppMode(page, 'residente');
  await goToViaSidebar(page, '/bitacora/notas');
  await page.getByTestId('select-contrato').selectOption({ value: String(cid) });
  // El libro de bitácora (lista de notas) va detrás de "Ver bitácora".
  await page.getByTestId('btn-ver-bitacora').click();

  // La fecha de la nota emitida (#2) ahora incluye HORA (HH:MM), no solo el día.
  const fecha = page.getByTestId('nota-fecha-2');
  await expect(fecha).toBeVisible();
  await expect(fecha, 'incluye la fecha (dd/mm/aa)').toContainText(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  await expect(fecha, 'incluye la hora (HH:MM)').toContainText(/\d{1,2}:\d{2}/);
});
