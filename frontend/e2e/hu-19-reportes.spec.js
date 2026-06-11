// @ts-check
// E2E HU-19 — Exportación de reportes.
//
// Cubre el comportamiento del prototipo:
//   · 7 reportes definidos; cada botón dispara una descarga REAL (jsPDF para
//     PDF, exceljs vía excelExport.js para Excel). Verificamos suggestedFilename.
//   · El selector de periodo (Mensual, Trimestral, Acumulado) etiqueta el
//     archivo y acota los meses incluidos donde aplica (1, 2, 5), sin alterar
//     el contenido predefinido del reporte (CA-2).
//
// PERMISOS[HU-19]: residente='E' · contratista/supervision/dependencia/finanzas='C'
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  expectAvisoSoloConsulta,
  expectMetadataAcademicaOculta
} from './_helpers.js';

// HU-19: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'HU-19: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/reportes';
const TITULO = 'Exportación de reportes';
const SPRINT = 'Sprint 9';

// HU-19 quedó CABLEADA a datos reales: los reportes se exportan sobre el contrato SELECCIONADO.
// Creamos uno por API (residente = creador → lo ve) con su equipo y un concepto. Mismo patrón
// que HU-05/HU-07: solo se toca el .spec.
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
async function loginApi(request, email) {
  return (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
}
async function crearContratoConConceptos(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-HU19-${Date.now()}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Reportes e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'Concepto e2e', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(r.status(), 'crear contrato con conceptos').toBe(201);
  return folio;
}
// Decisión #7 (seed del smoke): siembra un contrato con TODO lo que alimenta los 6 reportes con
// fuente (programa + bitácora aperturada + estimación + pago + convenio), vía endpoints REALES
// (mismo flujo que la app). Folio SMOKE-HU19-<ts> autogenerado por corrida. Append-only POR DISEÑO
// (triggers de inmutabilidad en estimaciones/pagos/bitácora): NO se borra; el reset de la BD local
// es `docker compose down -v && up`, nunca SQL crudo en cascada. No existe contrato demo con estos
// datos (OP-2026-DEMO-001 se siembra vacío), por eso se crea uno. Devuelve { folio, id }.
async function sembrarContratoCompleto(request) {
  const [R, S, V, D, F] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
    loginApi(request, 'finanzas@sigecop.test')
  ]);
  const hR = { Authorization: `Bearer ${R.token}` };
  const folio = `SMOKE-HU19-${Date.now()}`;

  // 1) Contrato con catálogo (Σ ROUND(cant×pu) = 50,000) + programa de obra (1 periodo mensual).
  const cr = await request.post(`${API}/contratos`, {
    headers: hR,
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Reportes e2e (seed completo)',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'Concepto e2e', unidad: 'm³', cantidad: 100, pu: 500 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(cr.status(), 'crear contrato seed').toBe(201);
  const contratoId = (await cr.json()).id;

  // 2) Ligar el PDF firmado (formalización HU-01): sin él NO se integran estimaciones (gate server-side).
  const pdf = Buffer.from('%PDF-1.4\n%SMOKE-HU19\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  const doc = await request.post(`${API}/contratos/${contratoId}/documento`, {
    headers: hR,
    multipart: { documento: { name: 'contrato-firmado-smoke.pdf', mimeType: 'application/pdf', buffer: pdf } }
  });
  expect(doc.status(), 'ligar PDF firmado').toBeLessThan(300);

  // 3) Aperturar la bitácora (residente). La apertura registra la nota #1 → R5 habilitado y no vacío.
  const ap = await request.post(`${API}/bitacora/apertura`, {
    headers: hR,
    data: {
      contratoId, fechaEntregaSitio: '2026-06-01', plazoFirmaDias: 2,
      domicilioDependencia: 'Av. Reforma 1, Chilpancingo', telefonoDependencia: '7470000000',
      domicilioContratista: 'Calle 2, Acapulco', telefonoContratista: '7440000000',
      descripcionTrabajos: 'Trabajos de prueba e2e', caracteristicasSitio: 'Sitio de prueba'
    }
  });
  expect(ap.status(), 'aperturar bitácora').toBe(201);

  // 4) Integrar una estimación (superintendente). Requiere el contrato_concepto_id del programa.
  const prog = await request.get(`${API}/contratos/${contratoId}/programa`, { headers: hR });
  const conceptoId = (await prog.json()).conceptos?.[0]?.id;
  expect(conceptoId, 'concepto del programa').toBeTruthy();
  const est = await request.post(`${API}/estimaciones`, {
    headers: { Authorization: `Bearer ${S.token}` },
    data: {
      contrato_id: contratoId, periodo_inicio: '2026-06-01', periodo_fin: '2026-06-30',
      generadores: [{ contrato_concepto_id: conceptoId, cantidad_periodo: 40 }]
    }
  });
  expect(est.status(), 'integrar estimación').toBe(201);
  const estimacionId = (await est.json()).id;

  // 5) Registrar el pago (finanzas). Importe = neto (server-side). fecha_pago = hoy (≥ día de integración).
  const hoy = new Date().toISOString().slice(0, 10);
  const pago = await request.post(`${API}/pagos`, {
    headers: { Authorization: `Bearer ${F.token}` },
    data: {
      contrato_id: contratoId, estimacion_id: estimacionId, fecha_pago: hoy,
      referencia: 'SPEI-SMOKE-HU19-001', factura_cfdi: 'CFDI-SMOKE-HU19-0001', fecha_factura: '2026-06-29'
    }
  });
  expect(pago.status(), 'registrar pago').toBe(201);

  // 6) Convenio modificatorio (R6). Tipo 'plazo' (no toca la matriz): lo registra el residente asignado.
  //    +10% (60→66) para no disparar el guardrail de variación (CONVENIO_LIMITE_VARIACION_PCT, parametrizable).
  //    Best-effort: el reporte 6 descarga igual sin convenios; si fallara no invalida el resto del seed.
  const conv = await request.post(`${API}/convenios/contrato/${contratoId}`, {
    headers: hR,
    data: { tipo: 'plazo', motivo: 'Ampliación de plazo (seed e2e)', plazo_nuevo_dias: 66 }
  });
  if (conv.status() !== 201) console.warn(`[seed] convenio no creado (status ${conv.status()}); R6 saldrá sin filas`);

  return { folio, id: contratoId };
}

async function seleccionarContratoPorFolio(page, folio) {
  const sel = page.getByTestId('select-contrato-reporte');
  await expect(sel).toBeVisible();
  const val = await sel.locator('option', { hasText: folio }).first().getAttribute('value');
  await sel.selectOption(val);
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-19 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-19 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-19',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });

  test('residente puede exportar el reporte 1 en PDF (tras elegir contrato)', async ({ page, request }) => {
    const folio = await crearContratoConConceptos(request); // residente = creador → lo ve
    await goToViaSidebar(page, VIEW_PATH);
    // Sin contrato seleccionado, los botones están deshabilitados (no hay datos que exportar).
    await expect(page.getByTestId('btn-exportar-1-pdf')).toBeDisabled();
    await seleccionarContratoPorFolio(page, folio);
    await expect(page.getByTestId('btn-exportar-1-pdf')).toBeEnabled();

    const dl = page.waitForEvent('download');
    await page.getByTestId('btn-exportar-1-pdf').click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/reporte_1_avance-fisico_.*\.pdf$/);
  });

  test('el reporte 4 (observaciones) queda deshabilitado: sin fuente (HU-15)', async ({ page, request }) => {
    const folio = await crearContratoConConceptos(request);
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, folio);
    // Aun con contrato cargado, R4 no tiene fuente → permanece deshabilitado (no se inventa dummy).
    await expect(page.getByTestId('btn-exportar-4-excel')).toBeDisabled();
  });

  // SMOKE (decisión #7): sobre un contrato sembrado completo (programa+bitácora+estimación+pago+
  // convenio), los 6 reportes CON fuente se exportan (archivo real); R4 sigue deshabilitado.
  test('exporta los reportes con fuente del contrato sembrado; el periodo solo etiqueta (CA-2)', async ({ page, request }) => {
    test.slow(); // el seed encadena varios endpoints (contrato→PDF→bitácora→estimación→pago→convenio)
    const { folio } = await sembrarContratoCompleto(request);
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, folio);

    await expect(page.getByTestId('btn-exportar-4-excel')).toBeDisabled(); // R4: sin fuente (HU-15)

    // R5 (bitácora) requiere apertura: el seed la creó → debe quedar habilitado.
    const descargables = [
      { testid: 'btn-exportar-1-pdf',   re: /reporte_1_avance-fisico_.*\.pdf$/ },
      { testid: 'btn-exportar-1-excel', re: /reporte_1_avance-fisico_.*\.xlsx$/ },
      { testid: 'btn-exportar-2-excel', re: /reporte_2_avance-financiero_.*\.xlsx$/ },
      { testid: 'btn-exportar-3-excel', re: /reporte_3_estimaciones_.*\.xlsx$/ },
      { testid: 'btn-exportar-5-pdf',   re: /reporte_5_bitacora_.*\.pdf$/ },
      { testid: 'btn-exportar-6-excel', re: /reporte_6_modificatorios_.*\.xlsx$/ },
      { testid: 'btn-exportar-7-excel', re: /reporte_7_penalizaciones_.*\.xlsx$/ }
    ];
    for (const d of descargables) {
      await expect(page.getByTestId(d.testid)).toBeEnabled();
      const dl = page.waitForEvent('download');
      await page.getByTestId(d.testid).click();
      expect((await dl).suggestedFilename(), d.testid).toMatch(d.re);
    }

    // CA-2: cambiar el periodo solo cambia la ETIQUETA del archivo, no el contenido predefinido.
    await page.getByTestId('select-periodo-reporte').selectOption('Trimestral');
    const dl = page.waitForEvent('download');
    await page.getByTestId('btn-exportar-1-pdf').click();
    expect((await dl).suggestedFilename()).toMatch(/reporte_1_avance-fisico_trimestral_.*\.pdf$/);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión / Dependencia / Finanzas consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-19 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible y botones deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expectAvisoSoloConsulta(page);
      // Los botones de exportar viven en RegionEditable → quedan disabled.
      await expect(page.getByTestId('btn-exportar-1-pdf')).toBeDisabled();
    });
  });
}
