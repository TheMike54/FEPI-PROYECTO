// @ts-check
// Corrección profe (04-jun) — ALTA: contratista/supervisión/dependencia se SELECCIONAN de cuentas
// REGISTRADAS (no texto libre) y, al guardar, las personas quedan asociadas al contrato_roster
// (pasada 2, art. 125 fr. I g RLOPSRM) como exactamente quienes firman la bitácora.
//   (1) la dependencia es un <select> de cuentas; el contratista es la cuenta del superintendente;
//       ya no existe el texto libre de contratista.
//   (2) no se puede avanzar sin elegir la dependencia (cuenta).
//   (3) al guardar, residente + contratista(superintendente) quedan en el roster del contrato.
// Con LOGIN REAL (requiere backend+BD; cuentas semilla). No corre en CI.
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos, altaLlenarGarantias,
  altaAdjuntarPdfFirmado,
} from './_helpers.js';

test.skip(!!process.env.CI, 'corrección personas→roster: login real requiere backend+BD; se corre en local');

async function altaCompletaYGuardar(page, folio) {
  await altaLlenarDatosGenerales(page, { folio, plazo: 60, fechaInicio: '2026-06-01' });
  await page.getByTestId('btn-siguiente').click();
  await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 });
  await page.getByTestId('btn-siguiente').click();
  await page.getByTestId('celda-0-1').fill('100');
  await page.getByTestId('btn-siguiente').click();
  await altaLlenarJuridicos(page);
  await page.getByTestId('btn-siguiente').click();
  await altaLlenarGarantias(page);
  await page.getByTestId('btn-siguiente').click();
  await altaAdjuntarPdfFirmado(page);
  await page.getByTestId('btn-guardar').click();
}

test.describe('alta — personas como cuentas + asociación al roster (corrección profe)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');
  });

  test('(1) contratista y dependencia se ELIGEN de cuentas (no hay texto libre de personas)', async ({ page }) => {
    // La dependencia es un <select> (no <input> de texto), con cuentas como opciones.
    const dep = page.getByTestId('dg-dependencia');
    await expect(dep).toBeVisible();
    expect(await dep.evaluate((el) => el.tagName.toLowerCase())).toBe('select');
    expect(await dep.locator('option').count()).toBeGreaterThan(1); // placeholder + ≥1 cuenta dependencia
    // El contratista es la cuenta del superintendente (select), no un texto libre.
    await expect(page.getByTestId('select-superintendente')).toBeVisible();
    expect(await page.getByTestId('select-superintendente').locator('option').count()).toBeGreaterThan(1);
    // Ya NO existe el input de texto libre de contratista.
    await expect(page.getByTestId('dg-contratista')).toHaveCount(0);
  });

  test('(2) no se puede avanzar sin elegir la dependencia (cuenta)', async ({ page }) => {
    await page.getByTestId('dg-folio').fill(`E2E-DEP-${Date.now()}`);
    await page.getByTestId('dg-objeto').fill('Obra sin dependencia');
    await page.getByTestId('dg-plazo').fill('60');
    await page.getByTestId('dg-fecha').fill('2026-06-01');
    await page.getByTestId('select-superintendente').selectOption({ index: 1 }); // contratista sí
    // …pero sin dependencia: «Siguiente» NO avanza y avisa.
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByTestId('error-wizard')).toContainText('dependencia');
    await expect(page.getByRole('heading', { name: 'Datos generales del contrato' })).toBeVisible();
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
  });

  test('(3) al guardar, las personas seleccionadas quedan en el contrato_roster (firmantes)', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    const folio = `E2E-ROSTER-${Date.now()}`;
    await altaCompletaYGuardar(page, folio);
    await expect(page.locator('tr', { hasText: folio })).toBeVisible(); // guardado → en Registrados

    // El roster del contrato refleja a las personas elegidas en el alta.
    await goToViaSidebar(page, '/contratos/roster');
    const sel = page.getByTestId('roster-contrato');
    const val = await sel.locator('option', { hasText: folio }).first().getAttribute('value');
    await sel.selectOption(val);
    // Residente (creador) y contratista (superintendente) quedaron ASIGNADOS en el roster vigente.
    await expect(page.getByTestId('vigente-residente')).toContainText('Residente');        // 'Ing. Iván Residente Demo'
    await expect(page.getByTestId('vigente-residente')).not.toContainText('sin asignar');
    await expect(page.getByTestId('vigente-superintendente')).toContainText('Contratista'); // 'Arq. Carlos Contratista Demo'
    await expect(page.getByTestId('vigente-superintendente')).not.toContainText('sin asignar');
  });
});

// Candado del SERVIDOR (no se confía en el cliente): la dependencia debe ser una cuenta del rol
// correcto. Estos tests pegan directo a la API (sin UI).
const API = 'http://localhost:4000/api';
const loginApi = async (request, email) =>
  (await request.post(`${API}/auth/login`, { data: { email, password: 'Sigecop2026!' } })).json();
const contratoBase = (folio, extra) => ({
  folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Obra API e2e',
  plazoDias: 60, fechaInicio: '2026-06-01', supervisionId: null,
  conceptos: [{ clave: 'A1', concepto: 'c', unidad: 'm³', cantidad: 100, pu: 50 }],
  ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: [], ...extra,
});

test.describe('alta API — el servidor valida la dependencia (corrección profe)', () => {
  test('POST /contratos SIN dependenciaId → 400', async ({ request }) => {
    const R = await loginApi(request, 'residente@sigecop.test');
    const S = await loginApi(request, 'contratista@sigecop.test');
    const r = await request.post(`${API}/contratos`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: contratoBase(`API-NODEP-${Date.now()}`, { superintendenteId: S.user.id }), // sin dependenciaId
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toContain('dependencia');
  });

  test('POST /contratos con dependenciaId de ROL equivocado (supervisión) → 400', async ({ request }) => {
    const R = await loginApi(request, 'residente@sigecop.test');
    const S = await loginApi(request, 'contratista@sigecop.test');
    const V = await loginApi(request, 'supervision@sigecop.test'); // rol supervision, NO dependencia
    const r = await request.post(`${API}/contratos`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: contratoBase(`API-BADDEP-${Date.now()}`, { superintendenteId: S.user.id, dependenciaId: V.user.id }),
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toContain('dependencia');
  });
});
