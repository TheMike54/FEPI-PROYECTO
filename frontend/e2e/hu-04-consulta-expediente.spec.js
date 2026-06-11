// @ts-check
// E2E HU-04 — Consulta integrada del expediente contractual.
//
// Cubre los checks distintivos:
//   · El expediente muestra 5 bloques (configuración, catálogo, programa,
//     fianzas, jurídicos) — verificable por los headings.
//   · El buscador filtra los bloques por campo (lógica Y).
//   · O9 (W4c): se retiraron los descargables prototipo (PDF placeholder + Excel por bloque) y se
//     reemplazaron por UN solo PDF real del expediente (vista consolidada con print CSS + window.print
//     desde un botón único "Exportar expediente (PDF)"). Ver el describe "HU-04 — O9" al final.
//   · Permisos por rol.
//
// PERMISOS[HU-04]: residente='E' · contratista/supervision/dependencia='C' · finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
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

const VIEW_PATH = '/contratos/expediente';
const TITULO = 'Consulta integrada del expediente contractual';
const SPRINT = 'Sprint 4';

// HU-04 quedó CABLEADA a datos reales (GET /contratos/:id): para consultar un expediente hay que
// SELECCIONAR un contrato (ya no hay datos dummy ni botones de descarga placeholder). Para que los
// tests sean deterministas creamos un contrato por API (residente) con el equipo COMPLETO, de modo
// que lo vea cualquier rol con acceso: contratista (= superintendente_id), supervisión
// (= supervision_id) y dependencia (rol que "ve todo", lib/acceso ROLES_VEN_TODO). Solo se tocan .spec.
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
async function loginApi(request, email) {
  return (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
}
async function crearContratoConsultable(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-HU04-${Date.now()}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Expediente e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'Concepto e2e', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(r.status(), 'crear contrato consultable').toBe(201);
  return folio;
}
async function seleccionarContratoPorFolio(page, folio) {
  const sel = page.getByTestId('select-contrato');
  await expect(sel).toBeVisible();
  const val = await sel.locator('option', { hasText: folio }).first().getAttribute('value');
  await sel.selectOption(val);
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-04 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-04 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-04',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-04 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; consulta el expediente real tras elegir contrato', async ({ page, request }) => {
      const folio = await crearContratoConsultable(request);
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      // El aviso de solo lectura (HeaderVista) sigue visible para los roles de consulta.
      await expectAvisoSoloConsulta(page);
      // Datos reales: se SELECCIONA un contrato y se ve su expediente (buscador + bloques). La
      // consulta es de lectura, disponible para todos los roles con acceso.
      await seleccionarContratoPorFolio(page, folio);
      await expect(page.getByTestId('input-busqueda')).toBeVisible(); // el expediente cargó
      await expect(page.getByTestId('aviso-error')).toHaveCount(0);   // sin 403/404
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-04 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-04 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// O9 (W4c) — Exportar el expediente como UN solo PDF (vista consolidada + window.print),
// retirando los descargables prototipo (PDF placeholder / Excel por bloque).
// ---------------------------------------------------------------------------
function sqlExec(sql) {
  execSync('docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1', { input: sql, stdio: ['pipe', 'ignore', 'pipe'] });
}
// Crea un contrato consultable y devuelve { folio, id }. Con conEstimacion siembra 1 estimación
// (integrada, neto 4,975) por SQL para ejercitar el resumen de estimaciones (números y estados).
async function crearContratoO9(request, { conEstimacion = false } = {}) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-O9-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Expediente PDF O9',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'Concepto e2e', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(r.status(), 'crear contrato O9').toBe(201);
  const id = (await r.json()).id;
  if (conEstimacion) {
    // Dos estimaciones con estados DISTINTOS (ciclo real chk_estimaciones_estado) y netos 4,975 + 3,000
    // → total 7,975: ejercita las etiquetas de estado Y la suma del total del resumen.
    sqlExec(
      `INSERT INTO estimaciones (contrato_id, numero, periodo_inicio, periodo_fin, estado, anticipo_pct_snapshot, subtotal, amortizacion, retencion, deductivas, neto, integrada_por) VALUES ` +
      `(${id}, 1, DATE '2026-06-01', DATE '2026-06-30', 'integrada', 0, 5000.00, 0, 25.00, 0, 4975.00, (SELECT id FROM usuarios WHERE email='residente@sigecop.test')), ` +
      `(${id}, 2, DATE '2026-07-01', DATE '2026-07-30', 'pagada',    0, 3000.00, 0,  0.00, 0, 3000.00, (SELECT id FROM usuarios WHERE email='residente@sigecop.test'));`
    );
  }
  return { folio, id };
}

const BLOQUES_CLAVE = ['configuracion', 'catalogo', 'programa', 'fianzas', 'amortizacion', 'juridicos', 'roster', 'convenios', 'estimaciones'];

test.describe('HU-04 — O9: exportar expediente como un solo PDF', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('la vista consolidada incluye TODOS los bloques clave (incl. estimaciones y superintendente vigente)', async ({ page, request }) => {
    const { folio } = await crearContratoO9(request);
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, folio);

    for (const id of BLOQUES_CLAVE) {
      await expect(page.getByTestId(`bloque-${id}`), `bloque ${id}`).toBeVisible();
    }
    // Datos generales con el superintendente VIGENTE (no vacío).
    await expect(page.getByTestId('config-super-vigente')).toBeVisible();
    await expect(page.getByTestId('config-super-vigente')).not.toBeEmpty();
    // Resumen de estimaciones presente (bloque nuevo de O9).
    await expect(page.getByRole('heading', { name: 'Resumen de estimaciones' })).toBeVisible();
  });

  test('los descargables prototipo ya no existen; hay un único botón Exportar PDF', async ({ page, request }) => {
    const { folio } = await crearContratoO9(request);
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, folio);

    // Ningún botón de descarga prototipo (PDF placeholder / Excel por bloque) ni el viejo placeholder.
    await expect(page.locator('[data-testid^="btn-descargar-"]')).toHaveCount(0);
    await expect(page.getByText('Disponible en SRV-06-03')).toHaveCount(0);
    // Un único botón de exportación a PDF.
    await expect(page.getByTestId('btn-exportar-pdf')).toBeVisible();
  });

  test('en modo impresión se oculta el chrome y se muestra el documento consolidado (print CSS)', async ({ page, request }) => {
    const { folio } = await crearContratoO9(request);
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, folio);

    await page.emulateMedia({ media: 'print' });
    // El membrete del documento (solo impresión) aparece; el chrome del AppShell se oculta.
    await expect(page.getByTestId('print-header')).toBeVisible();
    await expect(page.locator('header').first()).toBeHidden();  // topbar del AppShell (1 sola)
    await expect(page.locator('aside').first()).toBeHidden();   // sidebar del AppShell (1 sola)
    // El selector, la búsqueda y el botón no van al PDF.
    await expect(page.getByTestId('btn-exportar-pdf')).toBeHidden();
    await expect(page.getByTestId('select-contrato')).toBeHidden();
    await expect(page.getByTestId('input-busqueda')).toBeHidden();
    // Los bloques del expediente sí aparecen en el documento consolidado.
    await expect(page.getByTestId('bloque-configuracion')).toBeVisible();
    await expect(page.getByTestId('bloque-estimaciones')).toBeVisible();
    await page.emulateMedia({ media: 'screen' }); // restaura
  });

  test('Exportar expediente (PDF) dispara window.print', async ({ page, request }) => {
    const { folio } = await crearContratoO9(request);
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, folio);

    // Stub de window.print (en headless abriría un diálogo): verifica el cableado del botón.
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
    await page.getByTestId('btn-exportar-pdf').click();
    expect(await page.evaluate(() => window.__printed)).toBe(1);
  });

  test('el resumen de estimaciones muestra números y estados cuando hay estimaciones', async ({ page, request }) => {
    const { folio } = await crearContratoO9(request, { conEstimacion: true });
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, folio);

    const bloque = page.getByTestId('estimaciones-expediente');
    await expect(bloque).toBeVisible();
    await expect(bloque).toContainText('#1');
    await expect(bloque).toContainText('#2');
    // Dos estados DISTINTOS, etiquetados con su nombre del ciclo (reconciliación O7↔HU-15: 'integrada' = "Integrada").
    await expect(bloque).toContainText('Integrada');
    await expect(bloque).toContainText('Pagada');
    // El total es la SUMA de los netos (4,975 + 3,000 = 7,975), no el de una sola estimación.
    await expect(page.getByTestId('estimaciones-total-neto')).toContainText('7,975');
  });

  test('un bloque COLAPSADO en pantalla se fuerza ABIERTO en impresión (print:block)', async ({ page, request }) => {
    const { folio } = await crearContratoO9(request);
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, folio);

    // Colapsar el catálogo → su contenido (la clave del concepto) se oculta en pantalla.
    await page.getByTestId('bloque-catalogo').getByRole('button').first().click();
    await expect(page.getByTestId('exp-concepto-clave-0')).toBeHidden();
    // En impresión, el cuerpo se fuerza abierto → el contenido vuelve a aparecer en el PDF.
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByTestId('exp-concepto-clave-0')).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
  });

  test('la búsqueda oculta bloques en pantalla pero NO los saca del PDF', async ({ page, request }) => {
    const { folio } = await crearContratoO9(request);
    await goToViaSidebar(page, VIEW_PATH);
    await seleccionarContratoPorFolio(page, folio);

    // Buscar el folio (campo 'folio') → solo casa Configuración; el resto se oculta EN PANTALLA.
    await page.getByTestId('input-busqueda').fill(folio);
    await expect(page.getByTestId('bloque-configuracion')).toBeVisible();
    await expect(page.getByTestId('bloque-catalogo')).toBeHidden();
    await expect(page.getByTestId('bloque-estimaciones')).toBeHidden();

    // En impresión, TODOS los bloques vuelven (la búsqueda NO recorta el documento consolidado).
    await page.emulateMedia({ media: 'print' });
    for (const id of BLOQUES_CLAVE) {
      await expect(page.getByTestId(`bloque-${id}`), `bloque ${id} en print`).toBeVisible();
    }
    await page.emulateMedia({ media: 'screen' });
  });
});
