// @ts-check
// E2E HU-19 — Exportación de reportes.
//
// Cubre el comportamiento del prototipo:
//   · 7 reportes definidos; cada botón dispara una descarga REAL (jsPDF para
//     PDF, SheetJS para Excel). Verificamos suggestedFilename.
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
  cardInInicioFor,
  expectAvisoSoloConsulta,
  expectMetadataAcademicaOculta
} from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

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
async function seleccionarContratoPorFolio(page, folio) {
  const sel = page.getByTestId('select-contrato-reporte');
  await expect(sel).toBeVisible();
  const val = await sel.locator('option', { hasText: folio }).first().getAttribute('value');
  await sel.selectOption(val);
}

// id -> { formato -> patron suggestedFilename }
const REPORTES = [
  { id: 1, slug: 'avance-fisico',     formatos: ['pdf', 'xlsx'] },
  { id: 2, slug: 'avance-financiero', formatos: ['xlsx']         },
  { id: 3, slug: 'estimaciones',      formatos: ['xlsx']         },
  { id: 4, slug: 'observaciones',     formatos: ['xlsx']         },
  { id: 5, slug: 'bitacora',          formatos: ['pdf']          },
  { id: 6, slug: 'modificatorios',    formatos: ['xlsx']         },
  { id: 7, slug: 'penalizaciones',    formatos: ['xlsx']         }
];

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
