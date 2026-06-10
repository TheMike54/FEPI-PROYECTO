// @ts-check
// Etapa A — Pantalla ÚNICA de estimación (presentación). Verifica:
//   · carátula VIVA: recalcula al teclear (el neto oficial lo materializa el backend).
//   · ejemplo guía: C-001 PU=200, anticipo 30%, vol=400 → bruto 80,000 − amort 24,000 (art.143)
//     − 5 al millar 400 (art.191) = neto $55,600.
//   · semáforo de PLAN: si el volumen excede lo planeado para el periodo, marca rojo y DESHABILITA
//     "Confirmar" (solo ADELANTA la validación del server; el server sigue validando al integrar).
// Núcleo server-side (G1-G8) intacto: estos tests NO integran; ejercitan la presentación viva.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'Etapa A estimación: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const VIEW = '/estimaciones/integracion';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

// Contrato guía: 1 concepto C-001 PU=200, contratado 1000, anticipo 30%, programa 400@P1 + 600@P2
// (cuadra 100%). Mensual desde 2026-06-01 → P1 = 2026-06-01..2026-06-30 (planeado hasta 06-30 = 400).
// El contratista (= superintendente del contrato) integra; lo creamos como residente por API.
async function crearContratoGuia(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-EST-${Date.now()}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Estimación e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 30, juridicos: {},
      conceptos: [{ clave: 'C-001', concepto: 'Concepto guía', unidad: 'm³', cantidad: 1000, pu: 200 }],
      ciclo: 'mensual',
      programa: [
        { clave: 'C-001', periodoNumero: 1, cantidad: 400 },
        { clave: 'C-001', periodoNumero: 2, cantidad: 600 }
      ],
      garantias: []
    }
  });
  expect(r.status(), 'crear contrato guía').toBe(201);
  return folio;
}

async function abrirEstimacion(page, request) {
  const folio = await crearContratoGuia(request);
  await freshHome(page);
  await enterAppMode(page, 'contratista'); // superintendente del contrato guía
  await goToViaSidebar(page, VIEW);
  const sel = page.getByTestId('select-contrato');
  const val = await sel.locator('option', { hasText: folio }).first().getAttribute('value');
  await sel.selectOption(val);
  await expect(page.getByTestId('barras-avance')).toBeVisible(); // prep (solo lectura) cargó
  return folio;
}

const volInput = (page) => page.getByTestId('tabla-generadores').locator('input[type="number"]').first();

test.describe('Etapa A — pantalla única de estimación', () => {
  test('carátula viva: C-001 vol=400 (PU 200, anticipo 30%) → neto $55,600 y recalcula al teclear', async ({ page, request }) => {
    await abrirEstimacion(page, request);
    const vol = volInput(page);
    await vol.fill('400');
    // bruto 80,000 − amort 24,000 − 5 al millar 400 = neto 55,600 (mismo redondeo que el server).
    await expect(page.getByTestId('caratula-neto-preview')).toContainText('55,600');
    await expect(page.getByTestId('saldo-estimacion-actual')).toContainText('80,000'); // bruto de este periodo
    // RECALCULA al teclear: 200 × 200 × (1 − 0.30 − 0.005) = 27,800.
    await vol.fill('200');
    await expect(page.getByTestId('caratula-neto-preview')).toContainText('27,800');
    await expect(page.getByTestId('caratula-neto-preview')).not.toContainText('55,600');
  });

  // O1-P17 (revisión profe, 09-jun): la carátula dice QUÉ estimación se está formando, con número
  // correlativo (próximo = MAX+1 del historial) ligado al periodo del programa de obra.
  test('P17: la carátula muestra "Estimación No. N — Periodo P" prominente', async ({ page, request }) => {
    await abrirEstimacion(page, request);
    // Contrato nuevo sin estimaciones → la próxima es la No. 1. El periodo se deriva del programa
    // al capturar el periodo-fin (cierre del P1 = 2026-06-30).
    await page.getByTestId('periodo-inicio').fill('2026-06-01');
    await page.getByTestId('periodo-fin').fill('2026-06-30');
    const numero = page.getByTestId('caratula-numero-estimacion');
    await expect(numero).toBeVisible();
    await expect(numero).toContainText('Estimación No. 1');
    await expect(numero).toContainText('Periodo 1');
  });

  test('semáforo de plan: vol > planeado del periodo → rojo + Confirmar deshabilitado', async ({ page, request }) => {
    await abrirEstimacion(page, request);
    // Acota el plan al periodo P1 (planeado = 400): el corte usa periodo_fin (mismo que valida el server).
    await page.getByTestId('periodo-inicio').fill('2026-06-01');
    await page.getByTestId('periodo-fin').fill('2026-06-30');
    const disp = page.locator('[data-testid^="gen-disponible-"]').first();
    await expect(disp).toContainText('400'); // prep recargó con el corte → disponible este periodo = 400
    const vol = volInput(page);
    // 400 = exactamente lo planeado → dentro del plan, Confirmar habilitado.
    await vol.fill('400');
    await expect(page.getByTestId('semaforo-plan-exceso')).toHaveCount(0);
    await expect(page.getByTestId('btn-integrar')).toBeEnabled();
    // 500 > 400 planeado (pero < 1000 contratado: es el PLAN, no art.118) → rojo + bloquea Confirmar.
    await vol.fill('500');
    await expect(page.getByTestId('semaforo-plan-exceso')).toBeVisible();
    await expect(page.getByTestId('btn-integrar')).toBeDisabled();
  });
});
