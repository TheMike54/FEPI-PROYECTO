// @ts-check
// HU-02 (sesión E2 18-jun) — FIANZAS Y GARANTÍAS cableado al backend real. Cubre el CRUD por la pantalla:
// la dependencia selecciona un contrato, agrega una garantía con su PDF, la consulta, le registra un endoso
// (art. 91 RLOPSRM) y la edita. Fundamento: art. 48 LOPSRM (anticipo/cumplimiento), art. 66 (vicios ocultos).
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'HU-02 CRUD: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const PDF = { name: 'poliza.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF') };

async function sembrarContrato(request) {
  const R = await loginApi(request, 'residente@sigecop.test');
  const [S, V, D] = await Promise.all([
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
  ]);
  const folio = `E2E-FIANZA-${Date.now()}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Fianzas E2E', plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id, anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'C1', concepto: 'Concepto', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'C1', periodoNumero: 1, cantidad: 100 }], garantias: [],
    },
  });
  expect(cr.status()).toBe(201);
  return (await cr.json()).id;
}

test.describe('HU-02 — fianzas/garantías (CRUD real)', () => {
  test('la dependencia agrega una garantía con PDF, le registra un endoso y la edita', async ({ page, request }) => {
    const contratoId = await sembrarContrato(request);

    await freshHome(page);
    await enterAppMode(page, 'dependencia');
    await goToViaSidebar(page, '/contratos/fianzas');
    await page.getByTestId('select-contrato').selectOption({ value: String(contratoId) });
    await expect(page.getByTestId('fianzas-vacio')).toBeVisible(); // contrato sin garantías

    // Agregar una garantía de Cumplimiento con su PDF (monto 1000 ≤ monto del contrato 5000).
    await page.getByTestId('btn-agregar-poliza').click();
    await page.getByTestId('mp-tipo').selectOption('cumplimiento');
    await page.getByTestId('mp-afianzadora').fill('Afianzadora E2E, S.A.');
    await page.getByTestId('mp-folio').fill('POL-E2E-001');
    await page.getByTestId('mp-monto').fill('1000');
    await page.getByTestId('mp-vencimiento').fill('2027-12-31');
    await page.getByTestId('mp-archivo').setInputFiles(PDF);
    await page.getByTestId('mp-confirmar').click();

    // La garantía aparece en la tabla con su tipo y se puede ver el PDF.
    const fila = page.locator('[data-testid^="fila-poliza-"]').filter({ hasText: 'Cumplimiento' });
    await expect(fila).toHaveCount(1, { timeout: 10000 });
    await expect(fila).toContainText('Afianzadora E2E');
    await expect(fila.locator('[data-testid^="btn-ver-pdf-"]')).toBeVisible(); // tiene PDF real

    // Registrar un endoso (prórroga de vigencia, art. 91 RLOPSRM).
    await fila.locator('[data-testid^="btn-endoso-"]').click();
    await expect(page.getByTestId('modal-endoso')).toBeVisible();
    await page.getByTestId('endoso-motivo').selectOption('prorroga_vigencia');
    await page.getByTestId('endoso-vigencia').fill('2028-12-31');
    await page.getByTestId('endoso-confirmar').click();
    await expect(fila.locator('[data-testid^="endosos-count-"]')).toContainText('1 endoso', { timeout: 10000 });

    // Editar la garantía (cambia la afianzadora).
    await fila.locator('[data-testid^="btn-editar-"]').click();
    await expect(page.getByTestId('modal-agregar-poliza')).toBeVisible();
    await page.getByTestId('mp-afianzadora').fill('Afianzadora Editada, S.A.');
    await page.getByTestId('mp-confirmar').click();
    await expect(page.locator('[data-testid^="fila-poliza-"]').filter({ hasText: 'Cumplimiento' })).toContainText('Afianzadora Editada', { timeout: 10000 });
  });

  // FIX 1.3 — el endoso debe traer el dato que su MOTIVO ajusta (art. 91 RLOPSRM, verificado en docs/legal):
  // ampliación de monto exige nuevo_monto; prórroga exige nueva_vigencia; un endoso vacío no ajusta nada.
  test('FIX 1.3 — endoso sin el dato de su motivo → 400 (art. 91 RLOPSRM)', async ({ request }) => {
    const contratoId = await sembrarContrato(request);
    const D = await loginApi(request, 'dependencia@sigecop.test');
    const auth = { Authorization: `Bearer ${D.token}` };

    const g = await request.post(`${API}/garantias/contrato/${contratoId}`, {
      headers: auth, data: { tipo: 'cumplimiento', afianzadora: 'Afianzadora E2E', poliza: 'POL-1', monto: 1000, vigencia: '2027-12-31' },
    });
    expect(g.status(), 'crear garantía').toBe(201);
    const gid = (await g.json()).id;

    // Ampliación de monto SIN nuevo_monto → 400.
    const e1 = await request.post(`${API}/garantias/${gid}/endoso`, { headers: auth, data: { motivo: 'ampliacion_monto' } });
    expect(e1.status(), 'ampliación sin monto').toBe(400);
    // Prórroga SIN nueva_vigencia → 400.
    const e2 = await request.post(`${API}/garantias/${gid}/endoso`, { headers: auth, data: { motivo: 'prorroga_vigencia' } });
    expect(e2.status(), 'prórroga sin vigencia').toBe(400);
    // Endoso vacío (no modifica nada) → 400.
    const e3 = await request.post(`${API}/garantias/${gid}/endoso`, { headers: auth, data: { motivo: 'otro' } });
    expect(e3.status(), 'endoso vacío').toBe(400);
    // Endoso válido (prórroga con su vigencia) → 201.
    const e4 = await request.post(`${API}/garantias/${gid}/endoso`, { headers: auth, data: { motivo: 'prorroga_vigencia', nueva_vigencia: '2028-12-31' } });
    expect(e4.status(), 'endoso válido').toBe(201);
  });
});
