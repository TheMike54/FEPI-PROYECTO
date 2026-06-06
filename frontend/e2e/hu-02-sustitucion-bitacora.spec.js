// @ts-check
// E2E Plan 2 — Pase 2.3: la SUSTITUCIÓN de personas (roster, art. 125 fr. I g RLOPSRM) asienta
// AUTOMÁTICAMENTE su nota en la bitácora (art. 123 fr. III: la bitácora registra los hechos
// relevantes) y se ve en el EXPEDIENTE (HU-04).
//
// Cubre (flujo REAL, login real + alta por API):
//   1. Con bitácora abierta: la sustitución crea la nota res_sustitucion (rol, persona
//      anterior→nueva, motivo, fecha) en la MISMA transacción → la nota aparece en la bitácora.
//   2. Guard sin bitácora: la sustitución NO truena; responde nota_diferida=true (se difiere).
//   3. Diferido: tras sustituir SIN bitácora, al ABRIR la bitácora la nota se asienta sola.
//   4. Expediente (HU-04): la sustitución se ve en el bloque "Roster y sustituciones".
//
// Requiere backend+BD (Docker local) y se salta en CI. La cuenta SUSTITUTA (2.ª contratista
// activa, necesaria para sustituir al superintendente) la siembra seed_smoke_p23_sustitucion.sql.
// Los contratos se crean por API (alta real) con folio único por test → sin reseed entre tests.

import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { freshHome, enterAppMode } from './_helpers.js';

test.skip(!!process.env.CI, 'requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const VIEW_EXPEDIENTE = '/contratos/expediente';
const SUST_EMAIL = 'sustituto.contratista@sigecop.test';

// Cuenta sustituta (idempotente). beforeAll: una vez por archivo (workers=1).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../');
const SEED = path.join(REPO_ROOT, 'backend/scripts/seed_smoke_p23_sustitucion.sql');
test.beforeAll(() => {
  execSync('docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1', {
    input: readFileSync(SEED), stdio: ['pipe', 'ignore', 'pipe']
  });
});

// ---------------------------------------------------------------------------
// Helpers de API (mismo patrón que roster-sustitucion.spec.js).
// ---------------------------------------------------------------------------
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

/** Crea un contrato por alta real (residente R, superintendente S, dependencia D). Devuelve su id. */
async function crearContrato(request, R, S, D, objeto) {
  const folio = `E2E-P23-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto, plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: null, dependenciaId: D.user.id, anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'c', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(r.status(), 'crear contrato P23').toBe(201);
  return (await r.json()).id;
}

const abrirBitacora = (request, token, contratoId) =>
  request.post(`${API}/bitacora/apertura`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { contratoId, fechaEntregaSitio: '2026-06-05' }
  });

const sustituir = (request, token, contratoId, data) =>
  request.post(`${API}/roster/contrato/${contratoId}/sustituir`, {
    headers: { Authorization: `Bearer ${token}` }, data
  });

const notas = (request, token, contratoId) =>
  request.get(`${API}/bitacora/contrato/${contratoId}/notas`, { headers: { Authorization: `Bearer ${token}` } });

const roster = (request, token, contratoId) =>
  request.get(`${API}/roster/contrato/${contratoId}`, { headers: { Authorization: `Bearer ${token}` } });

// ===========================================================================
// 1. Con bitácora abierta: la sustitución crea la nota res_sustitucion.
// ===========================================================================
test('Con bitácora: la sustitución asienta la nota de bitácora (rol, anterior→nueva, motivo, art.125)', async ({ request }) => {
  const [R, S, D, SUST] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
    loginApi(request, SUST_EMAIL)
  ]);
  const id = await crearContrato(request, R, S, D, 'Sustitución con bitácora');

  // Abrir la bitácora (residente) ANTES de sustituir.
  expect((await abrirBitacora(request, R.token, id)).status(), 'abrir bitácora').toBe(201);

  const motivo = `Baja del superintendente ${Date.now()}`;
  const sres = await sustituir(request, R.token, id, { rol: 'superintendente', nuevoUsuarioId: SUST.user.id, motivo });
  expect(sres.status(), 'sustituir').toBe(201);
  const sbody = await sres.json();
  expect(sbody.nota, 'la respuesta trae la nota creada').toBeTruthy();
  expect(sbody.nota.tipo).toBe('res_sustitucion');
  expect(sbody.nota_diferida).toBe(false);

  // La nota aparece en la bitácora con rol, persona anterior (Carlos), nueva (Sustituto), motivo y art.125.
  const nres = await notas(request, R.token, id);
  expect(nres.status()).toBe(200);
  const blob = JSON.stringify(await nres.json());
  expect(blob).toContain('res_sustitucion');
  expect(blob).toContain(motivo);
  expect(blob).toContain('Sustituto');      // persona NUEVA
  expect(blob).toContain('Carlos');         // persona ANTERIOR (contratista demo)
  expect(blob).toContain('art. 125');
});

// ===========================================================================
// 2. Guard sin bitácora: la sustitución NO truena; la nota se DIFIERE.
// ===========================================================================
test('Sin bitácora: la sustitución se registra igual y la nota se difiere (no truena)', async ({ request }) => {
  const [R, S, D, SUST] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
    loginApi(request, SUST_EMAIL)
  ]);
  const id = await crearContrato(request, R, S, D, 'Sustitución sin bitácora');

  const motivo = `Cambio sin bitácora ${Date.now()}`;
  const sres = await sustituir(request, R.token, id, { rol: 'superintendente', nuevoUsuarioId: SUST.user.id, motivo });
  expect(sres.status(), 'la sustitución NO truena sin bitácora').toBe(201);
  const sbody = await sres.json();
  expect(sbody.nota, 'sin bitácora no hay nota inmediata').toBeNull();
  expect(sbody.nota_diferida).toBe(true);
  expect(sbody.aviso).toContain('al abrir');

  // La sustitución SÍ quedó registrada en el roster (la persona nueva es la vigente).
  const rres = await roster(request, R.token, id);
  const rbody = await rres.json();
  expect(rbody.vigente.superintendente.usuario_id).toBe(SUST.user.id);
});

// ===========================================================================
// 3. Diferido: al ABRIR la bitácora, la nota de la sustitución previa se asienta sola.
// ===========================================================================
test('Diferido: al abrir la bitácora se asienta la nota de la sustitución previa', async ({ request }) => {
  const [R, S, D, SUST] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
    loginApi(request, SUST_EMAIL)
  ]);
  const id = await crearContrato(request, R, S, D, 'Sustitución diferida');

  const motivo = `Sustitución previa a la bitácora ${Date.now()}`;
  const sres = await sustituir(request, R.token, id, { rol: 'superintendente', nuevoUsuarioId: SUST.user.id, motivo });
  expect((await sres.json()).nota_diferida).toBe(true);

  // Abrir la bitácora DESPUÉS de la sustitución → la nota diferida se materializa.
  expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);

  const blob = JSON.stringify(await (await notas(request, R.token, id)).json());
  expect(blob).toContain('res_sustitucion');
  expect(blob).toContain(motivo);
  expect(blob).toContain('asentada al abrir'); // la aclaración temporal del asiento diferido

  // El roster ya tiene la nota ligada (nota_id != null en la fila sustituta).
  const rbody = await (await roster(request, R.token, id)).json();
  const filaNueva = rbody.historial.find((h) => h.usuario_id === SUST.user.id && h.vigencia_hasta === null);
  expect(filaNueva.nota_id).not.toBeNull();
});

// ===========================================================================
// 4. Expediente (HU-04): la sustitución se ve en el bloque "Roster y sustituciones".
// ===========================================================================
test('Expediente HU-04: el bloque de roster muestra la sustitución (persona nueva + motivo)', async ({ page, request }) => {
  const [R, S, D, SUST] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
    loginApi(request, SUST_EMAIL)
  ]);
  const id = await crearContrato(request, R, S, D, 'Sustitución en expediente');
  const motivo = `Sustitución visible en expediente ${Date.now()}`;
  expect((await sustituir(request, R.token, id, { rol: 'superintendente', nuevoUsuarioId: SUST.user.id, motivo })).status()).toBe(201);

  // UI del expediente como residente (creador/participante).
  await freshHome(page);
  await enterAppMode(page, 'residente');
  await page.locator(`aside a[href="${VIEW_EXPEDIENTE}"]`).first().click();
  await page.waitForLoadState('networkidle');
  await page.getByTestId('select-contrato').selectOption({ value: String(id) });

  // El bloque de roster aparece con la persona NUEVA y el motivo de la sustitución.
  const bloque = page.getByTestId('roster-expediente');
  await expect(bloque).toBeVisible();
  await expect(bloque).toContainText('Sustituto');   // persona nueva (superintendente sustituto)
  await expect(bloque).toContainText(motivo);
});
