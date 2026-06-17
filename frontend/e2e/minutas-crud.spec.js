// @ts-check
// HU-11 (sesión E2 18-jun) — MINUTAS, VISITAS Y ACUERDOS cableado al backend real. El residente registra una
// minuta (con PDF), la vincula a una nota de bitácora del contrato (art. 123 fr. X RLOPSRM, sin modificar
// la nota), y agenda una visita. La pestaña Acuerdos deriva de las minutas reales.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'HU-11 CRUD: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const PDF = { name: 'minuta.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF') };

async function sembrarContratoConBitacora(request) {
  const R = await loginApi(request, 'residente@sigecop.test');
  const [S, V, D] = await Promise.all([
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
  ]);
  const folio = `E2E-MINUTA-${Date.now()}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Minutas E2E', plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id, anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'C1', concepto: 'Concepto', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'C1', periodoNumero: 1, cantidad: 100 }], garantias: [],
    },
  });
  expect(cr.status()).toBe(201);
  const contratoId = (await cr.json()).id;
  // Abrir bitácora → genera la nota #1 (para poder vincular la minuta a una nota real del contrato).
  const ab = await request.post(`${API}/bitacora/apertura`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: { contratoId, fechaEntregaSitio: '2026-06-01', plazoFirmaDias: 2, domicilioDependencia: 'G', telefonoDependencia: '7', domicilioContratista: 'C', telefonoContratista: '8', descripcionTrabajos: 'T', caracteristicasSitio: 'S' },
  });
  expect(ab.status()).toBe(201);
  return contratoId;
}

test.describe('HU-11 — minutas/visitas (CRUD real + vínculo a nota)', () => {
  test('el residente registra una minuta con PDF, la vincula a una nota y agenda una visita', async ({ page, request }) => {
    const contratoId = await sembrarContratoConBitacora(request);

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/bitacora/minutas');
    await page.getByTestId('select-contrato').selectOption({ value: String(contratoId) });
    await expect(page.getByTestId('minutas-vacio')).toBeVisible();

    // Registrar una minuta con su PDF.
    await page.getByTestId('min-fecha').fill('2026-06-10');
    await page.getByTestId('min-lugar').fill('Sala de juntas');
    await page.getByTestId('min-participantes').fill('Residente, Supervisión');
    await page.getByTestId('min-asunto').fill('Reunión de avance mensual');
    await page.getByTestId('min-acuerdos').fill('Acelerar la cimentación en el periodo 2.');
    await page.getByTestId('min-archivo').setInputFiles(PDF);
    await page.getByTestId('btn-registrar-minuta').click();

    const filaMin = page.locator('[data-testid^="minuta-"]').filter({ hasText: 'Reunión de avance mensual' });
    await expect(filaMin).toHaveCount(1, { timeout: 10000 });
    await expect(filaMin.locator('[data-testid^="btn-ver-pdf-min-"]')).toBeVisible(); // PDF real

    // Vincular la minuta a una nota de bitácora del contrato (la nota #1 de apertura).
    await filaMin.locator('[data-testid^="btn-adjuntar-"]').click();
    await expect(page.getByTestId('modal-adjuntar-referencia')).toBeVisible();
    await page.getByTestId('adjuntar-nota-select').selectOption({ index: 1 }); // primera nota real
    await page.getByTestId('btn-vincular-nota').click();
    await expect(filaMin.locator('[data-testid^="min-nota-"]')).toContainText('#', { timeout: 10000 });

    // Agendar una visita.
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    await page.getByTestId('vis-fecha').fill('2026-06-20');
    await page.getByTestId('vis-lugar').fill('Frente norte');
    await page.getByTestId('vis-responsable').fill('Supervisión');
    await page.getByTestId('vis-proposito').fill('Verificar acabados del periodo.');
    await page.getByTestId('btn-agendar-visita').click();
    await expect(page.locator('[data-testid^="visita-"]').filter({ hasText: 'Frente norte' })).toHaveCount(1, { timeout: 10000 });

    // La pestaña Acuerdos refleja el acuerdo capturado en la minuta.
    await page.locator('button', { hasText: 'Acuerdos' }).first().click();
    await expect(page.getByText('Acelerar la cimentación en el periodo 2.')).toBeVisible();
  });
});
