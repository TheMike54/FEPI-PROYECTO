// @ts-check
// O2 / FASE 2 — PLAN DE AMORTIZACIÓN (forma de aplicación) del anticipo (criterio de HU-01).
// Citas: art. 138 párr. 3 RLOPSRM (programa de aplicación del anticipo = el plan; Σ = anticipo) y
// art. 143 fr. I RLOPSRM (la amortización se descuenta del importe de CADA estimación, proporcional
// al % de anticipo; el saldo se liquida en la estimación final, fr. III-d).
//
// El profe pidió en la revisión del 15-jun ligar el plan al programa: "no puedes amortizar todo en
// un solo mes; si en la última estimación no alcanza para pagar esa amortización, está mal". Por eso
// el default es PROPORCIONAL AL PROGRAMA y, además del cuadre Σ = anticipo, se valida: (R3) ningún
// periodo amortiza más de lo que se estima cobrar ese periodo; (R2) todo periodo con obra programada
// amortiza algo (0/0/todo-al-último se RECHAZA). La carátula (G2) sigue proporcional (Fase A).
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos, altaLlenarGarantias,
  altaAdjuntarPdfFirmado,
} from './_helpers.js';

test.skip(!!process.env.CI, 'O2/FASE2: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

// Lleva el alta hasta GARANTÍAS con anticipo 30% (= umbral, NO exige PDF de autorización).
// Contrato de $5,000 → anticipo $1,500; 60 días mensuales → 2 periodos. El programa reparte el
// concepto 50/50 entre los 2 periodos (cada uno se estima cobrar $2,500) → el default proporcional
// al programa es $750 + $750 y se pueden ejercitar las reglas R2/R3 contra lo programado.
async function irAGarantiasConAnticipo(page, { folio } = {}) {
  await altaLlenarDatosGenerales(page, { folio, plazo: 60, fechaInicio: '2026-06-01' });
  await page.getByTestId('btn-siguiente').click();               // 1 · catálogo
  await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 }); // monto 5,000
  await page.getByTestId('btn-siguiente').click();               // 2 · programa
  await page.getByTestId('celda-0-1').fill('50');                // P1: 50×50 = $2,500
  await page.getByTestId('celda-0-2').fill('50');                // P2: 50×50 = $2,500 (cuadra 100%)
  await page.getByTestId('btn-siguiente').click();               // 3 · jurídicos
  await altaLlenarJuridicos(page);
  await page.getByTestId('btn-siguiente').click();               // 4 · garantías
  await page.getByTestId('anticipo-input').fill('30');           // anticipo 30% = $1,500
  await altaLlenarGarantias(page, { conAnticipo: true });        // cumplimiento + anticipo
}

test.describe('O2/FASE2 — plan de amortización del anticipo', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');
  });

  test('default proporcional al programa cuadra; descuadre Σ BLOQUEA; restablecer desbloquea', async ({ page }) => {
    await irAGarantiasConAnticipo(page);
    await page.getByTestId('btn-siguiente').click();             // → 5 · plan de amortización
    // Default PROPORCIONAL AL PROGRAMA (50/50): $750 + $750 = $1,500 → cuadra.
    await expect(page.getByTestId('plan-monto-1')).toHaveValue('750');
    await expect(page.getByTestId('plan-monto-2')).toHaveValue('750');
    await expect(page.getByTestId('plan-cuadra')).toBeVisible();
    // Columna informativa de lo programado por periodo ($2,500 c/u).
    await expect(page.getByTestId('plan-programado-1')).toContainText('2,500');
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

  test('FASE 2: 0/0/todo-al-último se RECHAZA en el wizard (art. 143)', async ({ page }) => {
    await irAGarantiasConAnticipo(page);
    await page.getByTestId('btn-siguiente').click();             // → 5 · plan
    // El profe: amortizar TODO en el último periodo dejando el primero en cero. Σ = 1,500 (cuadra),
    // pero el periodo 1 tiene obra programada ($2,500) y no amortiza nada → R2 lo RECHAZA.
    await page.getByTestId('plan-monto-1').fill('0');
    await page.getByTestId('plan-monto-2').fill('1500');
    await expect(page.getByTestId('plan-cuadra')).toBeVisible();   // Σ cuadra...
    await expect(page.getByTestId('plan-falta-1')).toBeVisible();  // ...pero P1 no amortiza nada
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByTestId('error-wizard')).toContainText('143');
    await expect(page.getByTestId('plan-amortizacion-tabla')).toBeVisible(); // NO avanza
  });

  test('FASE 2: amortizar más de lo programado del periodo se RECHAZA (art. 143)', async ({ page }) => {
    // Programa ASIMÉTRICO: P1 se estima cobrar $1,000 (20×50) y P2 $4,000 (80×50). Anticipo $1,500.
    const folio = `E2E-O2-R3-${Date.now()}`;
    await altaLlenarDatosGenerales(page, { folio, plazo: 60, fechaInicio: '2026-06-01' });
    await page.getByTestId('btn-siguiente').click();             // 1 · catálogo
    await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 }); // monto 5,000
    await page.getByTestId('btn-siguiente').click();             // 2 · programa
    await page.getByTestId('celda-0-1').fill('20');             // P1: 20×50 = $1,000
    await page.getByTestId('celda-0-2').fill('80');             // P2: 80×50 = $4,000 (cuadra 100%)
    await page.getByTestId('btn-siguiente').click();             // 3 · jurídicos
    await altaLlenarJuridicos(page);
    await page.getByTestId('btn-siguiente').click();             // 4 · garantías
    await page.getByTestId('anticipo-input').fill('30');         // anticipo 30% = $1,500
    await altaLlenarGarantias(page, { conAnticipo: true });
    await page.getByTestId('btn-siguiente').click();             // → 5 · plan
    // Poner $1,500 en P1 (cuyo programado es solo $1,000) y $0 en P2: Σ = 1,500 (cuadra) pero P1
    // amortiza más de lo que se estima cobrar ese periodo → R3 lo RECHAZA.
    await page.getByTestId('plan-monto-1').fill('1500');
    await page.getByTestId('plan-monto-2').fill('0');
    await expect(page.getByTestId('plan-cuadra')).toBeVisible();   // Σ cuadra...
    await expect(page.getByTestId('plan-excede-1')).toBeVisible();  // ...pero P1 excede lo programado
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByTestId('error-wizard')).toContainText('143');
    await expect(page.getByTestId('plan-amortizacion-tabla')).toBeVisible(); // NO avanza
  });

  test('FASE 2: plan EDITADO válido (distinto del proporcional) se guarda y persiste', async ({ page, request }) => {
    page.on('dialog', (d) => d.accept());
    const folio = `E2E-O2-EDIT-${Date.now()}`;
    await irAGarantiasConAnticipo(page, { folio });
    await page.getByTestId('btn-siguiente').click();             // → 5 · plan
    // Distribución VÁLIDA: ambos periodos amortizan algo, ninguno excede su programado ($2,500),
    // Σ = $1,500. P1 = $900, P2 = $600.
    await page.getByTestId('plan-monto-1').fill('900');
    await page.getByTestId('plan-monto-2').fill('600');
    await expect(page.getByTestId('plan-cuadra')).toBeVisible();
    await page.getByTestId('btn-siguiente').click();             // → 6 · PDF firmado
    await altaAdjuntarPdfFirmado(page);
    await page.getByTestId('btn-guardar').click();
    await expect(page.locator('tr', { hasText: folio })).toBeVisible();
    // El plan persistido es el EDITADO: P1=$900, P2=$600.
    const R = await loginApi(request, 'residente@sigecop.test');
    const lista = await (await request.get(`${API}/contratos`, { headers: { Authorization: `Bearer ${R.token}` } })).json();
    const id = lista.find((c) => c.folio === folio).id;
    const plan = await (await request.get(`${API}/contratos/${id}/plan-amortizacion`, { headers: { Authorization: `Bearer ${R.token}` } })).json();
    expect(plan.plan.length).toBe(2);
    expect(Number(plan.plan[0].monto)).toBe(900);
    expect(Number(plan.plan[1].monto)).toBe(600);
  });

  test('sin anticipo: la pestaña NO existe y de garantías se pasa directo al PDF', async ({ page }) => {
    await altaLlenarDatosGenerales(page, { plazo: 60, fechaInicio: '2026-06-01' });
    await page.getByTestId('btn-siguiente').click();
    await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 });
    await page.getByTestId('btn-siguiente').click();
    await page.getByTestId('celda-0-1').fill('50');
    await page.getByTestId('celda-0-2').fill('50');
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

  test('API: sin plan DERIVA proporcional; Σ≠anticipo→400 (138); plan degenerado→400 (143)', async ({ request }) => {
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
      ciclo: 'mensual',
      // Programa 50/50: cada periodo se estima cobrar $2,500.
      programa: [{ clave: 'O2A', periodoNumero: 1, cantidad: 50 }, { clave: 'O2A', periodoNumero: 2, cantidad: 50 }],
      garantias: []
    };
    // (a) SIN plan en el payload → el backend deriva el PROPORCIONAL AL PROGRAMA ($750 + $750).
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
    // (c) Plan DEGENERADO 0/todo-al-último: Σ = 1,500 (cuadra) pero P1 tiene obra y no amortiza
    //     → 400 citando el art. 143 (R2).
    const r3 = await request.post(`${API}/contratos`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: {
        ...base, folio: `E2E-O2-DEGEN-${Date.now()}`,
        planAmortizacion: [{ periodoNumero: 1, monto: 0 }, { periodoNumero: 2, monto: 1500 }]
      }
    });
    expect(r3.status()).toBe(400);
    expect(((await r3.json()).error || '')).toContain('143');
  });
});
