// @ts-check
// FASE 4 / HU-24 (revisión profe 16-jun) — FINIQUITO Y CIERRE DEL CONTRATO.
// El profe: "debe haber un cierre a fuerzas, hay que agregar finiquito… es una nota de bitácora y el
// cálculo de lo que te debo / lo que me debes". Fundamento: LOPSRM art. 64, RLOPSRM arts. 168-172/170.
// Cubre: el sistema calcula el saldo (server-side), lo elabora como nota de bitácora, CIERRA el
// contrato (inalterable, 1 por contrato) y ofrece el documento imprimible (art. 170).
// Caso: contrato con anticipo y SIN estimaciones aprobadas → saldo a favor de la DEPENDENCIA (el
// contratista reintegra el anticipo no amortizado, art. 143/171).
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'FASE 4: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

async function sembrarContratoConBitacora(request) {
  const R = await loginApi(request, 'residente@sigecop.test');
  const [S, V, D] = await Promise.all([
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
  ]);
  const folio = `E2E-FINIQ-${Date.now()}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Finiquito E2E',
      ubicacion: 'Chilpancingo, Gro.', plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 30, juridicos: {},
      conceptos: [{ clave: 'C1', concepto: 'Concepto', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'C1', periodoNumero: 1, cantidad: 100 }], garantias: [],
      planAmortizacion: [{ periodoNumero: 1, monto: 1500 }],
    },
  });
  expect(cr.status()).toBe(201);
  const contratoId = (await cr.json()).id;
  // Abrir bitácora (el finiquito se asienta como nota de bitácora).
  const ab = await request.post(`${API}/bitacora/apertura`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      contratoId, fechaEntregaSitio: '2026-06-01', plazoFirmaDias: 2,
      domicilioDependencia: 'Gob', telefonoDependencia: '7470000', domicilioContratista: 'Calle 1',
      telefonoContratista: '7471111', descripcionTrabajos: 'Trabajos', caracteristicasSitio: 'Sitio',
    },
  });
  expect(ab.status()).toBe(201);
  return { contratoId, folio };
}

test.describe('FASE 4 / HU-24 — finiquito y cierre del contrato', () => {
  test('calcula el saldo, elabora el finiquito (nota + cierre) y ofrece el documento imprimible', async ({ page, request }) => {
    const { contratoId } = await sembrarContratoConBitacora(request);

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/finiquito');
    await page.getByTestId('select-contrato').selectOption({ value: String(contratoId) });

    // Desglose: sin estimaciones aprobadas → saldo = anticipo no amortizado ($1,500) a favor de la dependencia.
    await expect(page.getByTestId('finiquito-desglose')).toBeVisible();
    await expect(page.getByTestId('finiquito-saldo')).toContainText('1,500');
    await expect(page.getByTestId('finiquito-afavor')).toContainText('DEPENDENCIA');

    // Cerrar el contrato (candado de confirmación).
    await page.getByTestId('btn-abrir-cierre').click();
    await expect(page.getByTestId('finiquito-confirmar')).toBeVisible();
    await page.getByTestId('btn-confirmar-cierre').click();

    // Tras cerrar: aviso de contrato cerrado + documento imprimible (art. 170).
    await expect(page.getByTestId('finiquito-cerrado')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('documento-finiquito')).toBeVisible();
    await expect(page.getByTestId('btn-imprimir-finiquito')).toBeVisible();
    await expect(page.getByTestId('finiquito-doc-saldos')).toContainText('Saldo resultante');

    // El backend confirma: contrato cerrado + finiquito inalterable (re-cerrar → 409).
    const R = await loginApi(request, 'residente@sigecop.test');
    const recerrar = await request.post(`${API}/finiquito/contrato/${contratoId}`, { headers: { Authorization: `Bearer ${R.token}` }, data: {} });
    expect(recerrar.status()).toBe(409);
  });
});
