// @ts-check
// E2E O6 — Convenios visibles en bitácora y expediente (hallazgo W11, consistente con el patrón del
// sistema: sustitución/avance ya asientan su nota). Cubre:
//   · EN VIVO: con bitácora abierta, registrar un convenio asienta su NOTA AUTOMÁTICA y la liga (nota_id).
//   · DIFERIDO: sin bitácora, la nota se difiere; al abrir la bitácora se asienta sola y se liga.
//   · INMUTABILIDAD: tras ligar la nota, los campos del convenio siguen sin poder editarse (trigger).
//   · EXPEDIENTE (HU-04): el convenio aparece en su sección, con el estado de bitácora + link a versiones.
// LOGIN REAL (backend+BD) + un check por psql (docker). No corre en CI.
import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.skip(!!process.env.CI, 'O6: login real + backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// Contrato con C-001 (100 × 100 = monto 10,000), 1 periodo, programa P1=100. Creador = residente.
async function crearContrato(request) {
  const [R, S, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-O6-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Convenio O6', plazoDias: 60,
      fechaInicio: '2026-06-01', superintendenteId: S.user.id, dependenciaId: D.user.id, anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad: 100, pu: 100 }],
      ciclo: 'mensual', programa: [{ clave: 'C-001', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(cr.status(), 'crear contrato O6').toBe(201);
  return { id: (await cr.json()).id, folio, R, S, D };
}
const abrirBitacora = (request, token, id) => request.post(`${API}/bitacora/apertura`, {
  headers: auth(token),
  data: { contratoId: id, fechaEntregaSitio: '2026-06-02', domicilioDependencia: 'C1', telefonoDependencia: '1', domicilioContratista: 'C2', telefonoContratista: '2', descripcionTrabajos: 'x', caracteristicasSitio: 'y' }
});
const convenioPlazo = (request, token, id, plazo) => request.post(`${API}/convenios/contrato/${id}`, {
  headers: auth(token), data: { tipo: 'plazo', motivo: 'Ampliación por lluvias atípicas (dictamen DT-2026)', plazo_nuevo_dias: plazo }
});
// Convenio de MONTO: re-captura el catálogo (C-001) y el programa (cuadra P1=100); crea v1+v2.
const convenioMonto = (request, token, id, pu) => request.post(`${API}/convenios/contrato/${id}`, {
  headers: auth(token),
  data: {
    tipo: 'monto', motivo: 'Ajuste de precio unitario (dictamen DT-2026)',
    conceptos: [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad: 100, pu }],
    celdas: [{ clave: 'C-001', periodoNumero: 1, cantidad: 100 }]
  }
});
// Convenio MIXTO: cambia monto (P.U.) Y plazo en uno solo → la nota debe reportar AMBAS variaciones.
const convenioMixto = (request, token, id, plazo, pu) => request.post(`${API}/convenios/contrato/${id}`, {
  headers: auth(token),
  data: {
    tipo: 'mixto', motivo: 'Ajuste de P.U. y ampliación de plazo (dictamen DT-2026)', plazo_nuevo_dias: plazo,
    conceptos: [{ clave: 'C-001', concepto: 'Excavación', unidad: 'm³', cantidad: 100, pu }],
    celdas: [{ clave: 'C-001', periodoNumero: 1, cantidad: 100 }]
  }
});
const convenios = (request, token, id) => request.get(`${API}/convenios/contrato/${id}`, { headers: auth(token) });
const notasBlob = async (request, token, id) => JSON.stringify(await (await request.get(`${API}/bitacora/contrato/${id}/notas`, { headers: auth(token) })).json());

// Ejecuta SQL por psql; devuelve null si tuvo éxito, o el stderr+stdout si FALLÓ (para distinguir el
// rechazo del trigger de otros errores — evita falso-verde en el test de inmutabilidad).
function sqlError(sql) {
  try { execSync(`docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 -c "${sql}"`, { stdio: ['pipe', 'pipe', 'pipe'] }); return null; }
  catch (e) { return `${e.stderr?.toString() || ''}${e.stdout?.toString() || ''}`; }
}
const sqlScalar = (sql) => execSync(`docker exec -i sigecop_db psql -U sigecop -d sigecop_db -t -A -c "${sql}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();

test.describe('O6 — convenio → nota de bitácora + expediente', () => {
  test('EN VIVO: con bitácora abierta, el convenio asienta su nota y la liga (nota_id)', async ({ request }) => {
    const { id, R } = await crearContrato(request);
    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);

    const cv = await convenioPlazo(request, R.token, id, 66); // 60→66 = +10% (≤ guardrail 25%)
    expect(cv.status(), 'registrar convenio con bitácora').toBe(201);
    const body = await cv.json();
    expect(body.nota_diferida).toBe(false);
    expect(body.nota.tag).toBe('convenio');
    expect(body.nota.numero).toBeGreaterThan(0);

    const blob = await notasBlob(request, R.token, id);
    expect(blob).toContain('Convenio modificatorio');
    expect(blob).toContain('sobre plazo');

    const c = await (await convenios(request, R.token, id)).json();
    expect(c.convenios).toHaveLength(1);
    expect(c.convenios[0].nota_id).not.toBeNull();
  });

  test('DIFERIDO: sin bitácora, la nota se difiere; al abrir se asienta sola y se liga', async ({ request }) => {
    const { id, R } = await crearContrato(request);

    const cv = await convenioPlazo(request, R.token, id, 66);
    expect(cv.status()).toBe(201);
    const body = await cv.json();
    expect(body.nota_diferida).toBe(true);
    expect(body.nota).toBeNull();

    let c = await (await convenios(request, R.token, id)).json();
    expect(c.convenios[0].nota_id).toBeNull();

    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);
    const blob = await notasBlob(request, R.token, id);
    expect(blob).toContain('Convenio modificatorio');
    expect(blob).toContain('Registrado antes de abrir la bitácora'); // redacción del asiento diferido…
    expect(blob).toContain('asentado al abrirla');                   // …completa, no solo un fragmento

    c = await (await convenios(request, R.token, id)).json();
    expect(c.convenios[0].nota_id).not.toBeNull();
  });

  test('INMUTABILIDAD: ni los campos del convenio ni el vínculo de la nota se pueden mutar (trigger)', async ({ request }) => {
    const { id, R } = await crearContrato(request);
    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);
    expect((await convenioPlazo(request, R.token, id, 66)).status()).toBe(201); // nota EN VIVO → nota_id seteado

    // (1) Editar un campo de IDENTIDAD → el trigger lo RECHAZA con el mensaje de inmutabilidad (no otro error).
    const e1 = sqlError(`UPDATE convenios_modificatorios SET motivo='hack' WHERE contrato_id=${id}`);
    expect(e1, 'editar el motivo debe fallar').not.toBeNull();
    expect(e1).toMatch(/inalterable/i);
    // y el valor NO se modificó (defensa contra un falso-verde donde el comando falla por otra razón).
    expect(sqlScalar(`SELECT motivo FROM convenios_modificatorios WHERE contrato_id=${id}`)).not.toContain('hack');

    // (2) Re-ligar / desligar la nota (nota_id ya tiene valor) → RECHAZADO: la única transición permitida
    // es NULL→valor una sola vez (segundo guard del trigger).
    const e2 = sqlError(`UPDATE convenios_modificatorios SET nota_id=NULL WHERE contrato_id=${id}`);
    expect(e2, 'desligar/re-ligar la nota debe fallar').not.toBeNull();
    expect(e2).toMatch(/inmutable|inalterable/i);
  });

  test('MIXTO: la nota reporta la variación de monto Y la de plazo', async ({ request }) => {
    const { id, R } = await crearContrato(request);
    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);
    const cv = await convenioMixto(request, R.token, id, 66, 110); // plazo 60→66 (+10%) y monto 10,000→11,000 (+10%)
    expect(cv.status(), 'registrar convenio mixto').toBe(201);
    const blob = await notasBlob(request, R.token, id);
    expect(blob).toContain('mixto');
    expect(blob).toContain('sobre monto');
    expect(blob).toContain('sobre plazo');
  });

  test('EXPEDIENTE (HU-04): el convenio aparece con su estado de bitácora + link a las versiones', async ({ page, request }) => {
    const { id, R } = await crearContrato(request);
    // Convenio de MONTO → crea versiones del programa (v1 + v2). Sin bitácora → nota diferida.
    const cv = await convenioMonto(request, R.token, id, 110); // 10,000 → 11,000 (+10%)
    expect(cv.status(), 'registrar convenio de monto').toBe(201);
    const convId = (await cv.json()).convenio_id;

    await freshHome(page);
    await enterAppMode(page, 'residente'); // HU-04 = E para residente (creador del contrato)
    await goToViaSidebar(page, '/contratos/expediente');
    await page.getByTestId('select-contrato').selectOption(String(id));

    await expect(page.getByTestId('convenios-expediente')).toBeVisible();
    const fila = page.getByTestId(`convenio-fila-${convId}`);
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('Monto');
    // Sin bitácora → la nota del convenio está pendiente de asentar al abrir la bitácora.
    await expect(page.getByTestId(`convenio-nota-${convId}`)).toContainText('pendiente');
    // Link a las versiones del programa (existen v1+v2 por el convenio de monto).
    const link = page.getByTestId('convenios-link-versiones');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', `/contratos/modificatorios?contrato=${id}`);
  });

  test('EXPEDIENTE: el estado de bitácora del convenio pasa de "pendiente" a "asentada" al abrir la bitácora', async ({ page, request }) => {
    const { id, R } = await crearContrato(request);
    const cv = await convenioPlazo(request, R.token, id, 66); // sin bitácora → diferido
    expect(cv.status()).toBe(201);
    const convId = (await cv.json()).convenio_id;

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/expediente');
    await page.getByTestId('select-contrato').selectOption(String(id));
    await expect(page.getByTestId(`convenio-nota-${convId}`)).toContainText('pendiente');

    // Abrir la bitácora (API) → la nota diferida se asienta sola.
    expect((await abrirBitacora(request, R.token, id)).status()).toBe(201);
    // Recargar el expediente (re-seleccionar el contrato) → el estado pasa a "asentada".
    await page.getByTestId('select-contrato').selectOption('');
    await page.getByTestId('select-contrato').selectOption(String(id));
    await expect(page.getByTestId(`convenio-nota-${convId}`)).toContainText('asentada');
  });

  test('EXPEDIENTE: un contrato sin convenios muestra el bloque vacío', async ({ page, request }) => {
    const { id } = await crearContrato(request);
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/expediente');
    await page.getByTestId('select-contrato').selectOption(String(id));
    await expect(page.getByText('Este contrato no tiene convenios modificatorios registrados.')).toBeVisible();
  });
});
