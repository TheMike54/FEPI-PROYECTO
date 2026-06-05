// @ts-check
// E2E Pase 1 (Plan 2) — Programa de obra MES POR MES + fix del bug "no registrado".
//
// Bug: un contrato CON programa de obra A2 (matriz concepto × periodo, capturada en el alta y
// guardada en programa_obra + contrato_periodos) aparecía como "no tiene programa de obra
// registrado" en el expediente (HU-04), porque detalleContrato sólo leía contrato_actividades
// (A1, deprecated). Fix: las 3 vistas leen la matriz vía GET /contratos/:id/programa y la pintan
// MES POR MES con MatrizProgramaLectura. Aquí se valida que el contrato de ejemplo muestra su
// programa en las 3 vistas: (a) detalle en Registrados, (b) expediente HU-04, (c) panel plegable
// de la captura de estimación HU-12.
//
// Requiere backend+BD (login real); se corre en local, no en CI.

import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';

async function loginApi(request, email) {
  return (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
}

// Crea un contrato CON programa de obra A2 que cuadra al 100%: concepto A1 contratado 100, planeado
// 100 en el periodo 1 (plazo 60 mensual → 2 periodos). Equipo completo para que lo vea cualquier
// rol con acceso. Devuelve { folio, id } (el id alimenta el botón "ver-info-:id" de Registrados).
async function crearContratoConPrograma(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-P2PROG-${Date.now()}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Programa mes por mes e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'Concepto e2e', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(r.status(), 'crear contrato con programa').toBe(201);
  const body = await r.json();
  return { folio, id: body.id };
}

async function seleccionarPorFolio(page, folio) {
  const sel = page.getByTestId('select-contrato');
  await expect(sel).toBeVisible();
  const val = await sel.locator('option', { hasText: folio }).first().getAttribute('value');
  await sel.selectOption(val);
}

test.describe('Pase 1 — programa de obra mes por mes (3 vistas)', () => {
  test('(b) expediente HU-04: muestra la matriz, ya no "no registrado"', async ({ page, request }) => {
    const { folio } = await crearContratoConPrograma(request);
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/expediente');
    await seleccionarPorFolio(page, folio);

    // El bloque "Programa de obra" abre por defecto: debe verse la MATRIZ con sus 2 periodos,
    // no el aviso viejo de "no registrado", y sin error de carga.
    await expect(page.getByTestId('matriz-programa')).toBeVisible();
    await expect(page.getByTestId('matriz-periodo-1')).toBeVisible();
    await expect(page.getByTestId('matriz-periodo-2')).toBeVisible();
    await expect(page.getByText('no tiene programa de obra registrado')).toHaveCount(0);
    await expect(page.getByTestId('aviso-error')).toHaveCount(0);
  });

  test('(c) captura de estimación HU-12: panel plegable con la matriz', async ({ page, request }) => {
    const { folio } = await crearContratoConPrograma(request);
    await freshHome(page);
    await enterAppMode(page, 'contratista'); // superintendente asignado al contrato
    await goToViaSidebar(page, '/estimaciones/integracion');
    await seleccionarPorFolio(page, folio);

    const panel = page.getByTestId('panel-programa-obra');
    await expect(panel).toBeVisible();
    // <details> colapsado: la matriz no se ve hasta abrir el resumen.
    await expect(page.getByTestId('matriz-programa')).toBeHidden();
    await panel.locator('summary').click();
    await expect(page.getByTestId('matriz-programa')).toBeVisible();
    await expect(page.getByTestId('matriz-periodo-1')).toBeVisible();
  });

  test('(a) detalle en Registrados: el modal muestra la matriz mes por mes', async ({ page, request }) => {
    const { id } = await crearContratoConPrograma(request);
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');

    // "Registrados" es la pestaña auxiliar (siempre navegable, alta-v5.1).
    await page.locator('button', { hasText: 'Registrados' }).first().click();
    await page.getByTestId(`ver-info-${id}`).click();

    const modal = page.getByTestId('modal-detalle');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('matriz-programa')).toBeVisible();
    await expect(modal.getByText('Programa de obra (mes por mes)')).toBeVisible();
  });
});
