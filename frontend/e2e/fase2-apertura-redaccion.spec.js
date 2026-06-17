// @ts-check
// FASE 2 (revisión profe 16-jun) — la NOTA DE APERTURA se redacta con TODOS los datos del alta.
// El profe: "en la redacción te falta todo el show… la obra ubicada en tal… todo lo del alta de
// contrato debe estar ahí en el documento de la nota… para que lo imprima de una vez". Cubre:
//   · El alta captura la UBICACIÓN de la obra (campo nuevo, opcional).
//   · El documento de la nota de apertura incluye objeto, ubicación, partes, monto, anticipo, plazo y
//     fechas, en prosa, y es imprimible (botón Imprimir / window.print).
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'FASE 2: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

test.describe('FASE 2 — redacción de la nota de apertura con los datos del alta', () => {
  test('el documento de apertura redacta objeto, ubicación, monto, anticipo, plazo y fechas (imprimible)', async ({ page, request }) => {
    const R = await loginApi(request, 'residente@sigecop.test');
    const [S, V, D] = await Promise.all([
      loginApi(request, 'contratista@sigecop.test'),
      loginApi(request, 'supervision@sigecop.test'),
      loginApi(request, 'dependencia@sigecop.test'),
    ]);
    const folio = `E2E-APERT-${Date.now()}`;
    const OBJETO = 'Construcción de edificio de laboratorios';
    const UBICACION = 'Av. Universidad 100, Chilpancingo, Guerrero';
    const cr = await request.post(`${API}/contratos`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: {
        folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: OBJETO, ubicacion: UBICACION,
        plazoDias: 60, fechaInicio: '2026-06-01',
        superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
        anticipoPct: 30, juridicos: {},
        conceptos: [{ clave: 'C1', concepto: 'Cimentación', unidad: 'm³', cantidad: 100, pu: 50 }],
        ciclo: 'mensual', programa: [{ clave: 'C1', periodoNumero: 1, cantidad: 100 }], garantias: [],
        planAmortizacion: [{ periodoNumero: 1, monto: 1500 }],
      },
    });
    expect(cr.status()).toBe(201);
    const contratoId = (await cr.json()).id;

    // Abrir la bitácora (residente) → genera la nota de apertura #1 redactada.
    const ab = await request.post(`${API}/bitacora/apertura`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: {
        contratoId, fechaEntregaSitio: '2026-06-01', plazoFirmaDias: 2,
        domicilioDependencia: 'Palacio de Gobierno', telefonoDependencia: '747-100-0000',
        domicilioContratista: 'Calle 5 #20', telefonoContratista: '747-200-0000',
        descripcionTrabajos: 'Cimentación y estructura', caracteristicasSitio: 'Terreno plano de 1 ha',
      },
    });
    expect(ab.status()).toBe(201);

    // El detalle del contrato expone la ubicación (se guardó en el alta).
    const det = await (await request.get(`${API}/contratos/${contratoId}`, { headers: { Authorization: `Bearer ${R.token}` } })).json();
    expect(det.ubicacion).toBe(UBICACION);

    // UI: consultar notas → abrir el DOCUMENTO de la nota de apertura.
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/bitacora/consulta');
    await page.getByTestId('select-contrato').selectOption({ value: String(contratoId) });

    // Abrir el documento de la nota #1 (apertura). El botón "documento" vive en su fila.
    await page.getByRole('button', { name: /documento/i }).first().click();
    const doc = page.getByTestId('documento-nota');
    await expect(doc).toBeVisible();

    // La redacción incluye TODOS los datos del alta (prosa).
    await expect(doc).toContainText(OBJETO);
    await expect(doc).toContainText('ubicada en Av. Universidad 100');
    await expect(doc).toContainText('anticipo del 30%');
    await expect(doc).toContainText('$5,000.00');         // monto = 100 × 50
    await expect(doc).toContainText('60 días naturales');
    await expect(doc).toContainText('del 2026-06-01 al 2026-07-30');
    // Es imprimible/descargable (botón Imprimir → window.print).
    await expect(page.getByTestId('btn-imprimir-nota')).toBeVisible();
  });
});
