// @ts-check
// O2 — PLAN DE AMORTIZACIÓN (forma de aplicación) del anticipo (criterio de HU-01; art. 138 párr. 3 RLOPSRM).
// El profe (revisión 8-9 jun): "es en qué mes voy a devolver el dinero… muy parecido al programa
// de obra… No hay límites". Fase A: captura en el alta (default proporcional, editable, Σ =
// anticipo al CENTAVO) + lectura en el expediente. La carátula (G2) sigue proporcional.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos, altaLlenarGarantias,
  altaAdjuntarPdfFirmado,
} from './_helpers.js';

test.skip(!!process.env.CI, 'O2: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

// Lleva el alta hasta GARANTÍAS con anticipo 30% (= umbral, NO exige PDF de autorización).
// Contrato de $5,000 → anticipo $1,500; 60 días mensuales → 2 periodos ($750 + $750).
async function irAGarantiasConAnticipo(page, { folio } = {}) {
  await altaLlenarDatosGenerales(page, { folio, plazo: 60, fechaInicio: '2026-06-01' });
  await page.getByTestId('btn-siguiente').click();               // 1 · catálogo
  await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 }); // monto 5,000
  await page.getByTestId('btn-siguiente').click();               // 2 · programa
  await page.getByTestId('celda-0-1').fill('100');               // cuadra 100%
  await page.getByTestId('btn-siguiente').click();               // 3 · jurídicos
  await altaLlenarJuridicos(page);
  await page.getByTestId('btn-siguiente').click();               // 4 · garantías
  await page.getByTestId('anticipo-input').fill('30');           // anticipo 30% = $1,500
  await altaLlenarGarantias(page, { conAnticipo: true });        // cumplimiento + anticipo
}

test.describe('O2 — plan de amortización del anticipo', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');
  });

  test('con anticipo: default proporcional cuadra; editar descuadra y BLOQUEA; restablecer desbloquea', async ({ page }) => {
    await irAGarantiasConAnticipo(page);
    await page.getByTestId('btn-siguiente').click();             // → 5 · plan de amortización
    // Default PROPORCIONAL precargado: $750 + $750 = $1,500 → cuadra.
    await expect(page.getByTestId('plan-monto-1')).toHaveValue('750');
    await expect(page.getByTestId('plan-monto-2')).toHaveValue('750');
    await expect(page.getByTestId('plan-cuadra')).toBeVisible();
    // Editar un periodo SIN compensar descuadra y el avance se BLOQUEA (Σ ≠ anticipo).
    await page.getByTestId('plan-monto-1').fill('1000');
    await expect(page.getByTestId('plan-descuadre')).toBeVisible();
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByTestId('error-wizard')).toContainText('amortización');
    await expect(page.getByTestId('plan-amortizacion-tabla')).toBeVisible(); // sigue en el paso
    // "Restablecer proporcional" repone el default y desbloquea.
    await page.getByTestId('plan-restablecer').click();
    await expect(page.getByTestId('plan-cuadra')).toBeVisible();
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('pdf-firmado-precaptura')).toBeVisible();
  });

  test('el plan EDITADO (todo en el periodo 1) se guarda y persiste tal cual', async ({ page, request }) => {
    page.on('dialog', (d) => d.accept());
    const folio = `E2E-O2-EDIT-${Date.now()}`;
    await irAGarantiasConAnticipo(page, { folio });
    await page.getByTestId('btn-siguiente').click();             // → 5 · plan
    // "No hay límites" (profe): amortizar TODO en el primer periodo. $1,500 + $0 = cuadra.
    await page.getByTestId('plan-monto-1').fill('1500');
    await page.getByTestId('plan-monto-2').fill('0');
    await expect(page.getByTestId('plan-cuadra')).toBeVisible();
    await page.getByTestId('btn-siguiente').click();             // → 6 · PDF firmado
    await altaAdjuntarPdfFirmado(page);
    await page.getByTestId('btn-guardar').click();
    await expect(page.locator('tr', { hasText: folio })).toBeVisible();
    // El plan persistido es el EDITADO (no el proporcional): P1=$1,500, P2=$0.
    const R = await loginApi(request, 'residente@sigecop.test');
    const lista = await (await request.get(`${API}/contratos`, { headers: { Authorization: `Bearer ${R.token}` } })).json();
    const id = lista.find((c) => c.folio === folio).id;
    const plan = await (await request.get(`${API}/contratos/${id}/plan-amortizacion`, { headers: { Authorization: `Bearer ${R.token}` } })).json();
    expect(plan.plan.length).toBe(2);
    expect(Number(plan.plan[0].monto)).toBe(1500);
    expect(Number(plan.plan[1].monto)).toBe(0);
  });

  test('sin anticipo: la pestaña NO existe y de garantías se pasa directo al PDF', async ({ page }) => {
    await altaLlenarDatosGenerales(page, { plazo: 60, fechaInicio: '2026-06-01' });
    await page.getByTestId('btn-siguiente').click();
    await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 });
    await page.getByTestId('btn-siguiente').click();
    await page.getByTestId('celda-0-1').fill('100');
    await page.getByTestId('btn-siguiente').click();
    await altaLlenarJuridicos(page);
    await page.getByTestId('btn-siguiente').click();
    await altaLlenarGarantias(page);                              // sin anticipo
    // La pestaña "Plan de amortización" está OCULTA (el paso se omite).
    await expect(page.getByRole('button', { name: /Plan de amortización/ })).toHaveCount(0);
    await page.getByTestId('btn-siguiente').click();              // → directo al PDF firmado
    await expect(page.getByTestId('pdf-firmado-precaptura')).toBeVisible();
    // «Atrás» desde el PDF también SALTA el paso omitido (regresa a garantías).
    await page.getByTestId('btn-atras').click();
    await expect(page.getByTestId('garantias-requeridas')).toBeVisible();
  });

  test('API sin plan: el backend DERIVA el proporcional; API con plan que no cuadra: 400 (art. 138)', async ({ request }) => {
    const [R, S, V, D] = await Promise.all([
      loginApi(request, 'residente@sigecop.test'),
      loginApi(request, 'contratista@sigecop.test'),
      loginApi(request, 'supervision@sigecop.test'),
      loginApi(request, 'dependencia@sigecop.test')
    ]);
    const base = {
      tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'O2 API e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 30, juridicos: {},
      conceptos: [{ clave: 'O2A', concepto: 'Concepto O2', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'O2A', periodoNumero: 1, cantidad: 100 }], garantias: []
    };
    // (a) SIN plan en el payload → el backend deriva el PROPORCIONAL ($750 + $750 = $1,500).
    const r1 = await request.post(`${API}/contratos`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: { ...base, folio: `E2E-O2-DERIV-${Date.now()}` }
    });
    expect(r1.status()).toBe(201);
    const id1 = (await r1.json()).id;
    const plan1 = await (await request.get(`${API}/contratos/${id1}/plan-amortizacion`, { headers: { Authorization: `Bearer ${R.token}` } })).json();
    expect(plan1.plan.length).toBe(2);
    expect(Number(plan1.plan[0].monto) + Number(plan1.plan[1].monto)).toBe(1500);
    // (b) Plan que NO suma el anticipo → 400 citando el art. 138.
    const r2 = await request.post(`${API}/contratos`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: {
        ...base, folio: `E2E-O2-BAD-${Date.now()}`,
        planAmortizacion: [{ periodoNumero: 1, monto: 100 }, { periodoNumero: 2, monto: 100 }] // Σ 200 ≠ 1500
      }
    });
    expect(r2.status()).toBe(400);
    expect(((await r2.json()).error || '')).toContain('138');
  });
});
