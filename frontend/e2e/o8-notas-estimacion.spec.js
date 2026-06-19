// @ts-check
// O8 — (a) VINCULAR notas FIRMADAS de bitácora a la estimación + (b) vista "documento" de la nota.
//   · La tabla estimacion_notas YA existía (PRIMARY KEY = UNIQUE) → SIN DDL. integrarEstimacion ya
//     inserta el vínculo; detalleEstimacion ya lo lista. O8 refina: el selector solo muestra notas
//     FIRMADAS ("notas que soportan la estimación") y cada nota se puede ver como documento imprimible.
//   · Cubre: presentar estimación (flujo O7, lo hace el contratista) vinculando una nota firmada; la
//     estimación lista sus notas; el modal de vinculación SOLO muestra firmadas; la vista documento de
//     la nota muestra los firmantes (emisor + contrapartes con su hora de firma).
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, irPasoEstimacion } from './_helpers.js';

test.skip(!!process.env.CI, 'O8: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const PDF = Buffer.from('%PDF-1.4\n%E2E\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const login = async (ctx, email) => (await ctx.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// Contrato + PDF + bitácora firmada por los 3 + UNA nota FIRMADA (emisor residente; firman superintendente
// y supervisión → todo el roster). Opcional: una segunda nota SIN firmar (queda 'en_plazo', no firmada).
async function sembrar(request, { conSinFirmar = false } = {}) {
  const R = await login(request, 'residente@sigecop.test');
  const S = await login(request, 'contratista@sigecop.test');
  const V = await login(request, 'supervision@sigecop.test');
  const D = await login(request, 'dependencia@sigecop.test');
  const folio = `E2E-O8-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Notas y estimación O8',
      plazoDias: 60, fechaInicio: '2026-06-01', superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 0, juridicos: {}, conceptos: [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad: 1000, pu: 200 }],
      ciclo: 'mensual', programa: [{ clave: 'C-001', periodoNumero: 1, cantidad: 1000 }], garantias: []
    }
  });
  expect(cr.status(), 'crear contrato').toBe(201);
  const cid = (await cr.json()).id;
  // PDF firmado: requisito para integrar/presentar estimaciones (formalización HU-01).
  const up = await request.post(`${API}/contratos/${cid}/documento`, {
    headers: auth(R.token), multipart: { documento: { name: 'firmado.pdf', mimeType: 'application/pdf', buffer: PDF } }
  });
  expect(up.status(), 'PDF firmado').toBe(201);
  // Apertura + firma de los 3 (candado de emisión, art. 123 fr. III).
  const ap = await request.post(`${API}/bitacora/apertura`, {
    headers: auth(R.token),
    data: {
      contratoId: cid, fechaEntregaSitio: '2026-06-01', plazoFirmaDias: 30,
      domicilioDependencia: 'Av 1', telefonoDependencia: '7471234567', domicilioContratista: 'Calle 2', telefonoContratista: '7479876543',
      descripcionTrabajos: 'Obra', caracteristicasSitio: 'Terreno'
    }
  });
  expect(ap.status(), 'apertura').toBe(201);
  const apId = (await ap.json()).id;
  for (const t of [R, S, V]) await request.post(`${API}/bitacora/${apId}/firmar`, { headers: auth(t.token) });
  // Nota FIRMADA: emisor R + firman las contrapartes S y V → 'firmada'.
  const em = await request.post(`${API}/bitacora/${apId}/notas`, {
    headers: auth(R.token), data: { tipo: 'res_estimaciones', asunto: 'Soporte de la estimación', contenido: 'Autorizo el avance que soporta la estimación.' }
  });
  expect(em.status(), 'emitir nota').toBe(201);
  const nf = await em.json();
  await request.post(`${API}/bitacora/notas/${nf.id}/firmar`, { headers: auth(S.token) });
  await request.post(`${API}/bitacora/notas/${nf.id}/firmar`, { headers: auth(V.token) });
  let sinFirmar = null;
  if (conSinFirmar) {
    const em2 = await request.post(`${API}/bitacora/${apId}/notas`, {
      headers: auth(R.token), data: { tipo: 'res_estimaciones', asunto: 'Nota sin firmar', contenido: 'Pendiente de firma de las contrapartes.' }
    });
    sinFirmar = await em2.json(); // no la firman → 'en_plazo' (NO firmada)
  }
  return { cid, R, S, V, notaFirmada: nf.id, notaFirmadaNum: nf.numero, sinFirmar };
}

test.describe('O8 — notas firmadas vinculadas a la estimación + documento de la nota', () => {
  test('API: presentar estimación vinculando una nota FIRMADA → la estimación la lista', async ({ request }) => {
    const { cid, S, notaFirmada } = await sembrar(request);
    const av = await request.get(`${API}/estimaciones/contrato/${cid}/avance`, { headers: auth(S.token) });
    const ccid = (await av.json())[0].contrato_concepto_id;
    // El contratista PRESENTA (O7) vinculando la nota firmada como soporte.
    const er = await request.post(`${API}/estimaciones`, {
      headers: auth(S.token),
      data: { contrato_id: cid, periodo_inicio: '2026-06-01', periodo_fin: '2026-06-30', generadores: [{ contrato_concepto_id: ccid, cantidad_periodo: 400 }], notas: [notaFirmada] }
    });
    expect(er.status(), 'presentar estimación con nota').toBe(201);
    const est = await er.json();
    expect(est.notas, 'la respuesta trae la nota vinculada').toContain(notaFirmada);
    // El detalle de la estimación lista la nota vinculada.
    const det = await request.get(`${API}/estimaciones/${est.id}`, { headers: auth(S.token) });
    expect(det.status()).toBe(200);
    const notas = (await det.json()).notas || [];
    expect(notas.some((n) => n.nota_id === notaFirmada), 'el detalle lista la nota vinculada').toBe(true);
  });

  test('UI: el modal de vinculación SOLO muestra firmadas; se vincula y la nota se ve como documento con firmantes', async ({ page, request }) => {
    const { cid, notaFirmadaNum } = await sembrar(request, { conSinFirmar: true });

    await freshHome(page);
    await enterAppMode(page, 'contratista'); // superintendente: presenta la estimación (O7)
    await goToViaSidebar(page, '/estimaciones/integracion');
    await page.getByTestId('select-contrato').selectOption({ value: String(cid) });

    // FASE 3 (wizard): el vínculo de notas vive en el paso 4 · "Soportes y notas".
    await irPasoEstimacion(page, 'soportes');
    // Abrir el buscador de notas → SOLO la firmada aparece (la sin firmar NO; hay 2 notas no-apertura en total).
    await page.getByTestId('btn-abrir-buscador-notas').click();
    const modal = page.getByTestId('modal-vincular-notas');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('mb-contador-resultados')).toHaveText('1');
    await expect(modal.getByTestId('mb-tabla-resultados')).toContainText('Firmada');
    // Aserción NEGATIVA explícita: la nota SIN firmar (y la apertura) quedan EXCLUIDAS del selector.
    await expect(modal.getByTestId('mb-tabla-resultados')).not.toContainText('Nota sin firmar');
    await expect(modal.getByTestId('mb-tabla-resultados')).not.toContainText('Apertura');

    // Seleccionar la firmada y vincular.
    await modal.locator('tbody input[type="checkbox"]').first().check();
    await modal.getByTestId('mb-btn-confirmar').click();

    // La estimación LISTA la nota vinculada con su link a documento.
    const filaVinc = page.getByTestId('tabla-notas-vinculadas');
    await expect(filaVinc).toContainText(`#${notaFirmadaNum}`);
    await page.getByTestId(`btn-doc-vinculada-${notaFirmadaNum}`).click();

    // Vista DOCUMENTO de la nota: membrete + firmantes (emisor + 2 contrapartes = 3 filas).
    const doc = page.getByTestId('documento-nota');
    await expect(doc).toBeVisible();
    await expect(doc.getByTestId('doc-firmantes')).toBeVisible();
    await expect(doc.getByTestId('doc-firmantes')).toContainText('(emisor)');
    await expect(doc.getByTestId('doc-firmantes').locator('tbody tr')).toHaveCount(3);
    await expect(doc.getByTestId('btn-imprimir-nota')).toBeVisible();
  });

  test('UI HU-09: "Ver como documento" de una nota firmada muestra el documento con sus firmantes', async ({ page, request }) => {
    const { cid, notaFirmadaNum } = await sembrar(request);

    await freshHome(page);
    await enterAppMode(page, 'residente'); // el residente ve la bitácora y emite/firma
    await goToViaSidebar(page, '/bitacora/notas');
    await page.getByTestId('select-contrato').selectOption({ value: String(cid) });
    await page.getByTestId('btn-ver-bitacora').click();

    await page.getByTestId(`btn-doc-nota-${notaFirmadaNum}`).click();
    const doc = page.getByTestId('documento-nota');
    await expect(doc).toBeVisible();
    await expect(doc.getByTestId('doc-folio')).toContainText(`BIT-${String(notaFirmadaNum).padStart(4, '0')}`);
    await expect(doc.getByTestId('doc-firmantes').locator('tbody tr')).toHaveCount(3);
  });
});
