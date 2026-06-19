// @ts-check
// FASE 4 — Wizard del TRÁNSITO A PAGO (HU-20): la pantalla presenta el flujo como PASOS encadenados
// (Suficiencia → Soportes → Instrucción), patrón del Alta/Estimación, reusando los mismos componentes/
// testids. Navegación libre entre pasos; el gate duro sigue siendo "Generar instrucción" (suficiencia +
// soportes, art. 24/54). Aquí se valida que la barra de pasos aparece y navega. LOGIN REAL → no CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'Wizard pago: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const PDF = Buffer.from('%PDF-1.4\n%E2E\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// Siembra un contrato con una estimación AUTORIZADA (lista para tránsito a pago). Devuelve el folio.
async function contratoConEstimacionAutorizada(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
  ]);
  const folio = `E2E-PWZ-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Wizard pago e2e',
      plazoDias: 60, fechaInicio: '2026-06-01', superintendenteId: S.user.id, supervisionId: V.user.id,
      dependenciaId: D.user.id, anticipoPct: 0, juridicos: {},
      conceptos: [{ clave: 'C1', concepto: 'Concepto', unidad: 'm³', cantidad: 1000, pu: 200 }],
      ciclo: 'mensual', programa: [{ clave: 'C1', periodoNumero: 1, cantidad: 1000 }], garantias: [],
    },
  });
  expect(cr.status(), 'crear contrato').toBe(201);
  const cid = (await cr.json()).id;
  await request.post(`${API}/contratos/${cid}/documento`, { headers: auth(R.token), multipart: { documento: { name: 'f.pdf', mimeType: 'application/pdf', buffer: PDF } } });
  const av = await request.get(`${API}/estimaciones/contrato/${cid}/avance`, { headers: auth(S.token) });
  const ccid = (await av.json())[0].contrato_concepto_id;
  const er = await request.post(`${API}/estimaciones`, { headers: auth(S.token), data: { contrato_id: cid, periodo_inicio: '2026-06-01', periodo_fin: '2026-06-30', generadores: [{ contrato_concepto_id: ccid, cantidad_periodo: 400 }], notas: [] } });
  expect(er.status(), 'integrar').toBe(201);
  const est = await er.json();
  const Cic = (id) => `${API}/estimaciones-ciclo/estimacion/${id}`;
  expect((await request.post(`${Cic(est.id)}/enviar`, { headers: auth(S.token) })).status()).toBe(200);
  expect((await request.post(`${Cic(est.id)}/turnar`, { headers: auth(V.token), data: { sin_observaciones: true } })).status()).toBe(200);
  expect((await request.post(`${Cic(est.id)}/autorizar`, { headers: auth(R.token) })).status()).toBe(200);
  return folio;
}

test.describe('FASE 4 — wizard del tránsito a pago (pasos)', () => {
  test('al elegir contrato + estimación autorizada aparece la barra de pasos y navega Suficiencia→Soportes→Instrucción', async ({ page, request }) => {
    const folio = await contratoConEstimacionAutorizada(request);
    await freshHome(page);
    await enterAppMode(page, 'finanzas'); // finanzas opera el tránsito a pago (HU-20 'E')
    await goToViaSidebar(page, '/pagos/transito');

    const selC = page.getByTestId('select-contrato');
    const valC = await selC.locator('option', { hasText: folio }).first().getAttribute('value');
    await selC.selectOption(valC);
    // La estimación autorizada aparece en su selector.
    const selE = page.getByTestId('select-estimacion');
    await expect(selE.locator('option')).toHaveCount(2); // placeholder + 1 autorizada
    await selE.selectOption({ index: 1 });

    // Barra de pasos del wizard de pago + paso 1 (Suficiencia).
    await expect(page.getByTestId('wizard-pago-pasos')).toBeVisible();
    await expect(page.getByTestId('wstep-pago-suficiencia')).toBeVisible();

    // Navega a Soportes (paso 2) y a Instrucción (paso 3).
    await page.getByTestId('wpaso-pago-soportes').click();
    await expect(page.getByTestId('wstep-pago-soportes')).toBeVisible();
    await page.getByTestId('wpaso-pago-instruccion').click();
    await expect(page.getByTestId('wstep-pago-instruccion')).toBeVisible();
    // En el paso de instrucción está el botón de generar (gateado por suficiencia/soportes) y el semáforo.
    await expect(page.getByTestId('btn-generar-instruccion')).toBeVisible();
    await expect(page.getByTestId('semaforo-pago-badge').or(page.getByTestId('semaforo-pago-deshabilitado'))).toBeVisible();
  });

  // F6 (match mockup): "Registrar pago" (HU-21) es el 4º PASO del wizard, con el form compartido embebido.
  test('el 4º paso "Registrar pago" embebe el form de HU-21 (finanzas SÍ puede registrar)', async ({ page, request }) => {
    const folio = await contratoConEstimacionAutorizada(request);
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
    await goToViaSidebar(page, '/pagos/transito');
    const selC = page.getByTestId('select-contrato');
    const valC = await selC.locator('option', { hasText: folio }).first().getAttribute('value');
    await selC.selectOption(valC);
    await page.getByTestId('select-estimacion').selectOption({ index: 1 });

    // 4º paso del wizard (HU-21 embebida) — el tab existe y abre el form compartido (mismos testids de HU-21).
    await expect(page.getByTestId('wpaso-pago-registro')).toBeVisible();
    await page.getByTestId('wpaso-pago-registro').click();
    await expect(page.getByTestId('wstep-pago-registro')).toBeVisible();
    await expect(page.getByTestId('pago-estimacion')).toBeVisible();
    await expect(page.getByTestId('btn-registrar-pago')).toBeVisible();
    await expect(page.getByTestId('pago-solo-finanzas')).toHaveCount(0); // finanzas SÍ ejecuta
  });

  test('el 4º paso NO deja registrar a quien no es finanzas (gate de UI; art. 54)', async ({ page, request }) => {
    const folio = await contratoConEstimacionAutorizada(request);
    await freshHome(page);
    await enterAppMode(page, 'contratista'); // contratista opera HU-20 ('E') pero NO registra el pago (HU-21)
    await goToViaSidebar(page, '/pagos/transito');
    const selC = page.getByTestId('select-contrato');
    const valC = await selC.locator('option', { hasText: folio }).first().getAttribute('value');
    await selC.selectOption(valC);
    await page.getByTestId('select-estimacion').selectOption({ index: 1 });

    await page.getByTestId('wpaso-pago-registro').click();
    await expect(page.getByTestId('wstep-pago-registro')).toBeVisible();
    // El registro lo EJECUTA finanzas: nota visible y botón deshabilitado para el contratista.
    await expect(page.getByTestId('pago-solo-finanzas')).toBeVisible();
    await expect(page.getByTestId('btn-registrar-pago')).toBeDisabled();
  });
});
