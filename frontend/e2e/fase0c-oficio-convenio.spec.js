// @ts-check
// FASE 0C (revisión profe 16-jun) — OFICIO DE APROBACIÓN del convenio modificatorio.
// El profe: "el soporte es que te lo aprobaron… falta la sección del documento de aprobación, es un
// oficio". Se reusa contrato_documentos (tipo='oficio_convenio', ligado por convenio_id). Cubre:
//   · Subir el oficio (PDF) desde la pantalla de convenios (append-only → tras subir, "Ver oficio").
//   · El EXPEDIENTE (HU-04) muestra, por convenio, si tiene su oficio de aprobación o está pendiente.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'FASE 0C: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const PDF = { name: 'oficio_aprobacion.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') };

// Crea un contrato (plazo, sin anticipo) + un convenio de plazo, vía API, y devuelve { contratoId, convenioId }.
async function sembrarContratoConConvenio(request) {
  const R = await loginApi(request, 'residente@sigecop.test');
  const [S, V, D] = await Promise.all([
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
  ]);
  const folio = `E2E-OFICIO-${Date.now()}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Oficio de convenio E2E',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'OFC', concepto: 'Concepto oficio', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'OFC', periodoNumero: 1, cantidad: 100 }], garantias: [],
    },
  });
  expect(cr.status()).toBe(201);
  const contratoId = (await cr.json()).id;
  const cv = await request.post(`${API}/convenios/contrato/${contratoId}`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: { tipo: 'plazo', motivo: 'Ampliación de plazo (dictamen técnico DT-OFC).', plazo_nuevo_dias: 75 },
  });
  expect(cv.status()).toBe(201);
  const convenioId = (await cv.json()).convenio_id;
  return { contratoId, convenioId };
}

test.describe('FASE 0C — oficio de aprobación del convenio', () => {
  test('subir el oficio desde convenios → queda "Ver oficio" y el expediente lo muestra', async ({ page, request }) => {
    const { contratoId, convenioId } = await sembrarContratoConConvenio(request);

    await freshHome(page);
    // La DEPENDENCIA aprueba el convenio y sube su oficio (HU-03 dependencia='E'; el residente lo consulta).
    await enterAppMode(page, 'dependencia');

    // (1) Pantalla de convenios: antes de subir, ofrece "Subir oficio"; tras subir, ofrece "Ver oficio".
    await goToViaSidebar(page, '/contratos/modificatorios');
    await page.getByTestId('select-contrato').selectOption({ value: String(contratoId) });
    await expect(page.getByTestId(`fila-convenio-${convenioId}`)).toBeVisible();
    await expect(page.getByTestId(`conv-oficio-subir-${convenioId}`)).toBeVisible();

    await page.locator(`[data-testid="conv-oficio-subir-${convenioId}"] input[type="file"]`).setInputFiles(PDF);
    // Tras subir, el historial se recarga y aparece "Ver oficio" (append-only).
    await expect(page.getByTestId(`conv-oficio-ver-${convenioId}`)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(`conv-oficio-subir-${convenioId}`)).toHaveCount(0);

    // (2) Expediente (HU-04): el bloque de convenios muestra el oficio de aprobación del convenio.
    await goToViaSidebar(page, '/contratos/expediente');
    await page.getByTestId('select-contrato').selectOption({ value: String(contratoId) });
    await expect(page.getByTestId('convenios-expediente')).toBeVisible();
    await expect(page.getByTestId(`convenio-oficio-${convenioId}`)).toContainText('Ver oficio');
  });

  test('un convenio SIN oficio se muestra "pendiente de oficio" en el expediente', async ({ page, request }) => {
    const { contratoId, convenioId } = await sembrarContratoConConvenio(request);
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/expediente');
    await page.getByTestId('select-contrato').selectOption({ value: String(contratoId) });
    await expect(page.getByTestId(`convenio-oficio-${convenioId}`)).toContainText('pendiente de oficio');
  });
});
