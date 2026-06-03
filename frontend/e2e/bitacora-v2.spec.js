// @ts-check
// E2E pasada BITÁCORA (HU-08/09/10) — comportamientos nuevos verificados en la UI.
// El armado de datos (contrato, apertura, firmas, nota) se hace por API (Playwright request);
// la UI se usa para VERIFICAR: (a) apertura = nota #1; (b) firma con botón registra firmante;
// (c) candado de emisión sin firma completa; (d) tipos por rol (art. 125); (e) datos mínimos
// de apertura (incl. teléfono/domicilio); (f) búsqueda por tag. La lógica server-side completa
// (multi-firma + emisión post-firma + anular) está en backend/scripts/smoke-bitacora-v2.mjs.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'bitácora-v2: login real + backend; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';

async function login(ctx, email) {
  const r = await ctx.post(`${API}/auth/login`, { data: { email, password: PASS } });
  return r.json();
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function crearContrato(ctx, token, folio, superId, supId) {
  const r = await ctx.post(`${API}/contratos`, {
    headers: auth(token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Obra e2e bitácora',
      contratista: 'Constructora E2E', dependencia: 'Dependencia E2E', plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: superId, supervisionId: supId, anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'Concepto e2e', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
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
      descripcionTrabajos: 'Construcción de nave', caracteristicasSitio: 'Terreno plano'
    }
  });
  expect(r.status(), 'apertura').toBe(201);
  return (await r.json()).id;
}
const firmarApertura = (ctx, token, apId) => ctx.post(`${API}/bitacora/${apId}/firmar`, { headers: auth(token) });
const emitir = (ctx, token, apId, body) => ctx.post(`${API}/bitacora/${apId}/notas`, { headers: auth(token), data: body });

// Tokens/ids de las cuentas semilla (residente=1, contratista/superintendente=2, supervisión=3).
async function actores(ctx) {
  const R = await login(ctx, 'residente@sigecop.test');
  const S = await login(ctx, 'contratista@sigecop.test');
  const V = await login(ctx, 'supervision@sigecop.test');
  return { R, S, V };
}

test.describe('Bitácora v2 — apertura=nota#1, firma, candado, tipos, datos mínimos, tag', () => {
  test('(e) la apertura EXIGE los datos mínimos (incl. teléfono y domicilio)', async ({ page, request }) => {
    const { R, S, V } = await actores(request);
    const folio = `BITUI-E-${Date.now()}`;
    await crearContrato(request, R.token, folio, S.user.id, V.user.id); // sin aperturar

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/bitacora/apertura');
    await page.getByTestId('select-contrato').selectOption({ label: `${folio} · Obra e2e bitácora` });
    // Sin datos mínimos: "Iniciar apertura" deshabilitado + aviso.
    await expect(page.getByTestId('md-incompleto')).toBeVisible();
    await expect(page.getByTestId('btn-aperturar')).toBeDisabled();
    // Capturar TODOS los datos mínimos (domicilios + TELÉFONOS + alcance + sitio) lo habilita.
    await page.getByTestId('md-domicilio-dependencia').fill('Av. Reforma 1');
    await page.getByTestId('md-telefono-dependencia').fill('7471234567');
    await page.getByTestId('md-domicilio-contratista').fill('Calle Obra 2');
    await page.getByTestId('md-telefono-contratista').fill('7479876543');
    await page.getByTestId('md-descripcion-trabajos').fill('Construcción de nave');
    await page.getByTestId('md-caracteristicas-sitio').fill('Terreno plano');
    await expect(page.getByTestId('btn-aperturar')).toBeEnabled();
  });

  test('(a) la apertura aparece como nota #1 y (c) candado: sin firma completa no se emite', async ({ page, request }) => {
    const { R, S, V } = await actores(request);
    const folio = `BITUI-AC-${Date.now()}`;
    const cid = await crearContrato(request, R.token, folio, S.user.id, V.user.id);
    await aperturar(request, R.token, cid); // aperturada, SIN firmar

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/bitacora/notas');
    await page.getByTestId('select-contrato').selectOption({ value: String(cid) });
    // (a) la nota #1 es la apertura.
    await expect(page.getByTestId('apertura-nota')).toBeVisible();
    await expect(page.getByTestId('apertura-nota')).toContainText('BIT-0001');
    await expect(page.getByTestId('apertura-nota')).toContainText('Apertura de bitácora');
    // (c) candado de emisión: banner + botón emitir deshabilitado (apertura sin firmar).
    await expect(page.getByTestId('gate-emision')).toBeVisible();
    await expect(page.getByTestId('btn-emitir')).toBeDisabled();
  });

  test('(b) firmar la apertura con el BOTÓN registra al firmante + fecha', async ({ page, request }) => {
    const { R, S, V } = await actores(request);
    const folio = `BITUI-B-${Date.now()}`;
    const cid = await crearContrato(request, R.token, folio, S.user.id, V.user.id);
    await aperturar(request, R.token, cid);

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/bitacora/notas');
    await page.getByTestId('select-contrato').selectOption({ value: String(cid) });
    await expect(page.getByTestId('apertura-firma-estado')).toContainText('0/3');
    await page.getByTestId('btn-firmar-apertura').click();
    // Tras firmar, el estado pasa a 1/3 y el firmante (residente) queda registrado con ✓.
    await expect(page.getByTestId('apertura-firma-estado')).toContainText('1/3');
    await expect(page.getByTestId('apertura-firmante-residente')).toContainText('✓');
  });

  test('(d) tipos de nota por rol: el residente ve los tipos granulares del art. 125 fr. I', async ({ page, request }) => {
    const { R, S, V } = await actores(request);
    const folio = `BITUI-D-${Date.now()}`;
    const cid = await crearContrato(request, R.token, folio, S.user.id, V.user.id);
    await aperturar(request, R.token, cid);

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/bitacora/notas');
    await page.getByTestId('select-contrato').selectOption({ value: String(cid) });
    const sel = page.getByTestId('select-tipo');
    // Granulares del residente (art. 125 fr. I); auto-retry hasta que cargue el catálogo.
    await expect(sel.locator('option', { hasText: 'Sustitución del superintendente' })).toHaveCount(1);
    await expect(sel.locator('option', { hasText: 'Suspensión de trabajos' })).toHaveCount(1);
    expect(await sel.locator('option').count()).toBeGreaterThanOrEqual(10);
  });

  test('(f) búsqueda por TAG encuentra la nota en HU-10', async ({ page, request }) => {
    const { R, S, V } = await actores(request);
    const folio = `BITUI-F-${Date.now()}`;
    const cid = await crearContrato(request, R.token, folio, S.user.id, V.user.id);
    const apId = await aperturar(request, R.token, cid);
    // Firmar la apertura por los 3 y emitir una nota con tag (todo por API).
    await firmarApertura(request, R.token, apId);
    await firmarApertura(request, S.token, apId);
    await firmarApertura(request, V.token, apId);
    const em = await emitir(request, R.token, apId, { tipo: 'res_estimaciones', contenido: 'Autorizo estimación', tag: 'ESTIM-UI-7' });
    expect(em.status()).toBe(201);

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/bitacora/consulta');
    await page.getByTestId('select-contrato').selectOption({ value: String(cid) });
    // Buscar por el tag: aparece 1 resultado y el chip del tag.
    await page.getByTestId('filtro-palabra').fill('ESTIM-UI-7');
    await expect(page.getByTestId('contador-resultados')).toHaveText('1');
    await expect(page.locator('[data-testid^="tag-resultado-"]').first()).toContainText('ESTIM-UI-7');
  });

  test('(BUG 2+3) nota con TODAS las firmas → "Firmada"; botón de anular dice "Anular" (sin placeholder)', async ({ page, request }) => {
    const { R, S, V } = await actores(request);
    const folio = `BITUI-G-${Date.now()}`;
    const cid = await crearContrato(request, R.token, folio, S.user.id, V.user.id);
    const apId = await aperturar(request, R.token, cid);
    await firmarApertura(request, R.token, apId);
    await firmarApertura(request, S.token, apId);
    await firmarApertura(request, V.token, apId);
    // Nota #2 (residente). Las contrapartes (superintendente + supervisión) la firman → todas las firmas.
    const em2 = await emitir(request, R.token, apId, { tipo: 'res_estimaciones', contenido: 'Autorizo' });
    const nota2 = (await em2.json()).id;
    await request.post(`${API}/bitacora/notas/${nota2}/firmar`, { headers: auth(S.token) });
    await request.post(`${API}/bitacora/notas/${nota2}/firmar`, { headers: auth(V.token) });
    // Nota #3 (residente, SIN firmar por contrapartes) — para el botón de anular limpio.
    await emitir(request, R.token, apId, { tipo: 'res_estimaciones', contenido: 'Otra nota' });

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/bitacora/notas');
    await page.getByTestId('select-contrato').selectOption({ value: String(cid) });
    await page.getByTestId('btn-ver-bitacora').click();
    // BUG 2: la nota #2 con todas las firmas requeridas muestra "Firmada" (no "En plazo de firma").
    await expect(page.getByTestId('aceptacion-2')).toHaveText('Firmada');
    // BUG 3: el botón de anular dice exactamente "Anular" (sin la anotación "(dice/debe decir)").
    await expect(page.getByTestId('btn-anular-3')).toHaveText('Anular');
  });
});
