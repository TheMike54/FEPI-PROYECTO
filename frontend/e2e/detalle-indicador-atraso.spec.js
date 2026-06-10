// @ts-check
// Plan2 Pase 4 → O5 — visibilidad del atraso en el detalle del contrato: el modal en "Registrados"
// muestra un indicador "N conceptos en atraso" + acceso directo al panel de atraso, para que residente
// y supervisión lo vean sin entrar a buscarlo. Una cuenta SIN acceso (HU-07) no lo ve. Solo
// presentación/lectura: NO cambia el cálculo (server) ni los permisos.
//
// O5: el indicador ya NO depende de alertas configuradas; cuenta los conceptos con DÉFICIT
// (programado al periodo vigente − ejecutado) > 0. El avance se siembra por SQL (docker exec psql),
// como hu-14. LOGIN REAL + Docker. No corre en CI.
import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'Plan2 Pase4/O5: login real + docker psql; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const ccidsSembrados = [];

function sqlExec(sql) {
  execSync('docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1', {
    input: sql, stdio: ['pipe', 'ignore', 'pipe'],
  });
}

// Crea un contrato con equipo completo y 1 concepto EN ATRASO (programado P1 = 100, ejecutado 10 →
// déficit 90). Devuelve { cid, folio, ccid }. El avance físico se siembra por SQL.
async function crearContratoConDeficit(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
  ]);
  const folio = `E2E-ATRASO-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Atraso por concepto e2e',
      plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
      anticipoPct: 0, juridicos: {},
      conceptos: [{ clave: 'C-001', concepto: 'Concepto en atraso', unidad: 'm³', cantidad: 100, pu: 100 }],
      ciclo: 'mensual', programa: [{ clave: 'C-001', periodoNumero: 1, cantidad: 100 }], garantias: [],
    },
  });
  expect(cr.status(), 'crear contrato').toBe(201);
  const cid = (await cr.json()).id;

  // contrato_concepto_id real (vía el avance del contrato).
  const av = await request.get(`${API}/estimaciones/contrato/${cid}/avance`, { headers: auth(S.token) });
  const ccid = (await av.json())[0].contrato_concepto_id;

  // Ejecutado 10 de 100 programado en P1 → déficit 90 > 0 → "1 concepto en atraso". INSERT por SQL.
  sqlExec(`INSERT INTO concepto_avance (contrato_concepto_id, cantidad) VALUES (${ccid}, 10);`);
  ccidsSembrados.push(ccid);
  return { cid, folio, ccid };
}

test.afterAll(() => {
  if (ccidsSembrados.length === 0) return;
  try { sqlExec(`DELETE FROM concepto_avance WHERE contrato_concepto_id IN (${ccidsSembrados.join(',')});`); } catch (_) { /* best-effort */ }
});

async function abrirDetalle(page, rolId, cid) {
  await freshHome(page);
  await enterAppMode(page, rolId);
  await goToViaSidebar(page, '/contratos/alta');
  await page.locator('button', { hasText: 'Registrados' }).first().click();
  await page.getByTestId(`ver-info-${cid}`).click();
  await expect(page.getByTestId('modal-detalle')).toBeVisible();
}

test.describe('Plan2 Pase4 / O5 — indicador de atraso en el detalle del contrato', () => {
  test('residente (con acceso) ve "1 concepto en atraso" + link al panel de atraso', async ({ page, request }) => {
    const { cid } = await crearContratoConDeficit(request);
    await abrirDetalle(page, 'residente', cid);
    await expect(page.getByTestId('detalle-alertas')).toBeVisible();
    await expect(page.getByTestId('detalle-alertas-atraso')).toContainText('1 concepto en atraso');
    const link = page.getByTestId('detalle-link-alertas');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', `/seguimiento/alertas?contrato=${cid}`);
  });

  test('supervisión (con acceso) también ve el indicador de atraso', async ({ page, request }) => {
    const { cid } = await crearContratoConDeficit(request);
    await abrirDetalle(page, 'supervision', cid);
    await expect(page.getByTestId('detalle-alertas-atraso')).toContainText('en atraso');
  });

  test('contratista (sin acceso a HU-07) abre el detalle pero NO ve el indicador', async ({ page, request }) => {
    const { cid } = await crearContratoConDeficit(request);
    await abrirDetalle(page, 'contratista', cid);
    await expect(page.getByTestId('modal-detalle')).toBeVisible();        // sí puede ver el contrato (HU-01 C)
    await expect(page.getByTestId('detalle-alertas')).toHaveCount(0);     // pero NO el indicador de atraso (HU-07 sin acceso)
    await expect(page.getByTestId('detalle-link-alertas')).toHaveCount(0);
  });

  test('acceso directo: el link preselecciona el contrato en el panel de atraso', async ({ page, request }) => {
    const { cid, ccid } = await crearContratoConDeficit(request);
    await abrirDetalle(page, 'residente', cid);
    await page.getByTestId('detalle-link-alertas').click();
    // El panel HU-07 carga con el contrato YA seleccionado y su fila de atraso visible.
    await expect(page.getByTestId('select-contrato')).toHaveValue(String(cid));
    await expect(page.getByTestId('tabla-atrasos')).toBeVisible();
    await expect(page.getByTestId(`fila-atraso-${ccid}`)).toBeVisible();
  });
});
