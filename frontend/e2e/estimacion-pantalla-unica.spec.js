// @ts-check
// FASE 3 — Wizard "Nueva estimación" (antes pantalla única). La captura de HU-12 se presenta como
// PASOS encadenados (Periodo → Generadores → Carátula → Soportes → Integrar), patrón del Alta,
// reusando los MISMOS componentes/testids. Verifica:
//   · carátula VIVA: recalcula al teclear (el neto oficial lo materializa el backend).
//   · ejemplo guía: C-001 PU=200, anticipo 30%, vol=400 → bruto 80,000 − amort 24,000 (art.143 fr. I)
//     − 5 al millar 400 (art.191) = neto $55,600.
//   · semáforo de PLAN: si el volumen excede lo planeado para el periodo, marca rojo y BLOQUEA el
//     avance al siguiente paso (solo ADELANTA la validación del server; el server sigue validando).
// Núcleo server-side (G1-G8) intacto: estos tests NO integran; ejercitan la presentación viva.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, irPasoEstimacion } from './_helpers.js';

test.skip(!!process.env.CI, 'Wizard estimación: login real requiere backend+BD; se corre en local');

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

// Abre el wizard y selecciona el contrato guía (queda en el paso 1 · Periodo). Fija el periodo P1.
async function abrirEnPeriodo(page, request) {
  const folio = await crearContratoGuia(request);
  await freshHome(page);
  await enterAppMode(page, 'contratista'); // superintendente del contrato guía
  await goToViaSidebar(page, VIEW);
  const sel = page.getByTestId('select-contrato');
  const val = await sel.locator('option', { hasText: folio }).first().getAttribute('value');
  await sel.selectOption(val);
  await expect(page.getByTestId('wstep-periodo')).toBeVisible(); // paso 1 · Periodo
  await page.getByTestId('periodo-inicio').fill('2026-06-01');
  await page.getByTestId('periodo-fin').fill('2026-06-30');
  return folio;
}

const volInput = (page) => page.getByTestId('tabla-generadores').locator('input[type="number"]').first();

test.describe('FASE 3 — wizard de estimación (carátula viva por pasos)', () => {
  test('carátula viva: C-001 vol=400 (PU 200, anticipo 30%) → neto $55,600 y recalcula al teclear', async ({ page, request }) => {
    await abrirEnPeriodo(page, request);
    await irPasoEstimacion(page, 'generadores');
    await expect(page.getByTestId('barras-avance')).toBeVisible(); // prep (solo lectura) cargó
    const vol = volInput(page);
    await vol.fill('400');
    await irPasoEstimacion(page, 'caratula');
    // bruto 80,000 − amort 24,000 − 5 al millar 400 = neto 55,600 (mismo redondeo que el server).
    await expect(page.getByTestId('caratula-neto-preview')).toContainText('55,600');
    await expect(page.getByTestId('saldo-estimacion-actual')).toContainText('80,000'); // bruto de este periodo
    // RECALCULA al teclear: 200 × 200 × (1 − 0.30 − 0.005) = 27,800.
    await irPasoEstimacion(page, 'generadores');
    await vol.fill('200');
    await irPasoEstimacion(page, 'caratula');
    await expect(page.getByTestId('caratula-neto-preview')).toContainText('27,800');
    await expect(page.getByTestId('caratula-neto-preview')).not.toContainText('55,600');
  });

  // O1-P17 (revisión profe, 09-jun): la carátula dice QUÉ estimación se está formando, con número
  // correlativo (próximo = MAX+1 del historial) ligado al periodo del programa de obra.
  test('P17: la carátula muestra "Estimación No. N — Periodo P" prominente', async ({ page, request }) => {
    await abrirEnPeriodo(page, request);
    // Contrato nuevo sin estimaciones → la próxima es la No. 1. El periodo se deriva del programa
    // (cierre del P1 = 2026-06-30, fijado en abrirEnPeriodo). Capturo un volumen para pasar a Carátula.
    await irPasoEstimacion(page, 'generadores');
    await volInput(page).fill('400');
    await irPasoEstimacion(page, 'caratula');
    const numero = page.getByTestId('caratula-numero-estimacion');
    await expect(numero).toBeVisible();
    await expect(numero).toContainText('Estimación No. 1');
    await expect(numero).toContainText('Periodo 1');
  });

  test('semáforo de plan: vol > planeado del periodo → rojo + Siguiente deshabilitado (no avanza)', async ({ page, request }) => {
    await abrirEnPeriodo(page, request);
    await irPasoEstimacion(page, 'generadores');
    await expect(page.getByTestId('barras-avance')).toBeVisible(); // prep recargó con el corte del periodo
    const disp = page.locator('[data-testid^="gen-disponible-"]').first();
    await expect(disp).toContainText('400'); // disponible este periodo = planeado P1 = 400
    const vol = volInput(page);
    // 400 = exactamente lo planeado → dentro del plan, se puede avanzar.
    await vol.fill('400');
    await expect(page.getByTestId('semaforo-plan-exceso')).toHaveCount(0);
    await expect(page.getByTestId('btn-wsiguiente')).toBeEnabled();
    // 500 > 400 planeado (pero < 1000 contratado: es el PLAN, no art.118) → rojo + bloquea el avance.
    await vol.fill('500');
    await expect(page.getByTestId('semaforo-plan-exceso')).toBeVisible();
    await expect(page.getByTestId('btn-wsiguiente')).toBeDisabled();
  });
});
