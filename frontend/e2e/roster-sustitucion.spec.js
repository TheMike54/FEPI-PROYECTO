// @ts-check
// E2E Pasada F — Sustitución de personas del roster (/contratos/roster). Ruta SoloRol (fuera del
// catálogo de HU): la ven dependencia y residente; el resto NO. Estructural, con LOGIN REAL.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode } from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/contratos/roster';
const TITULO = 'Sustitución de personas del roster';

// --- Autoridad: dependencia y residente ven el link y la página carga ---
for (const rol of [{ id: 'dependencia', alias: 'Dependencia' }, { id: 'residente', alias: 'Residente' }]) {
  test.describe(`Roster — ${rol.alias} (autoridad)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('el link "Sustitución de personas" aparece y la página carga con el selector de contrato', async ({ page }) => {
      const link = page.locator(`aside a[href="${VIEW_PATH}"]`);
      await expect(link).toBeVisible();
      await link.click();
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('roster-contrato')).toBeVisible();
    });
  });
}

// --- Sin acceso: contratista, supervisión y finanzas NO ven el link (SoloRol) ---
for (const rol of [{ id: 'contratista', alias: 'Contratista' }, { id: 'supervision', alias: 'Supervisión' }, { id: 'finanzas', alias: 'Finanzas' }]) {
  test.describe(`Roster — ${rol.alias} (sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('NO aparece el link al roster en el Sidebar', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}

// ---------------------------------------------------------------------------
// Etapa B / Fix B-1 (auditoría selección-vs-texto libre): la nueva persona SIEMPRE se SELECCIONA;
// se eliminó el fallback de teclear el ID a mano (sust-nuevo-id). Lista vacía → aviso, sin input.
// ---------------------------------------------------------------------------
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

async function crearContratoB1(request) {
  const [R, S, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test')
  ]);
  const folio = `E2E-B1-${Date.now()}`;
  const r = await request.post(`${API}/contratos`, {
    headers: { Authorization: `Bearer ${R.token}` },
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Roster B1', plazoDias: 60, fechaInicio: '2026-06-01',
      superintendenteId: S.user.id, supervisionId: null, dependenciaId: D.user.id, anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'A1', concepto: 'c', unidad: 'm³', cantidad: 100, pu: 50 }],
      ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
    }
  });
  expect(r.status(), 'crear contrato B1').toBe(201);
  return { id: (await r.json()).id, R };
}

async function abrirRoster(page, request) {
  const { id } = await crearContratoB1(request);
  await freshHome(page);
  await enterAppMode(page, 'residente'); // creador → es parte y ve el roster
  await page.locator(`aside a[href="${VIEW_PATH}"]`).first().click();
  await page.waitForLoadState('networkidle');
  await page.getByTestId('roster-contrato').selectOption({ value: String(id) });
  return id;
}

test.describe('Roster — Fix B-1: selección (sin input numérico de ID)', () => {
  test('con elegibles, la nueva persona se SELECCIONA; el input de ID a mano ya NO existe', async ({ page, request }) => {
    await abrirRoster(page, request);
    await page.getByTestId('sust-rol').selectOption('superintendente'); // → cuentas rol contratista (hay)
    await expect(page.getByTestId('sust-nuevo')).toBeVisible();
    await expect(page.getByTestId('sust-nuevo-id')).toHaveCount(0); // eliminado
    // No hay NINGÚN input numérico de captura de ID en el formulario de sustitución.
    await expect(page.getByTestId('roster-form-sustituir').locator('input[type="number"]')).toHaveCount(0);
  });

  test('P1 (gate cruzado corregido): el slot residente SÍ lista candidatos; sin input para teclear ID', async ({ page, request }) => {
    await abrirRoster(page, request);
    // P1 (revisión 14-jun): ANTES, como residente, listar cuentas de rol 'residente' exigía rol dependencia
    // (gate cruzado en /usuarios/asignables) → 403 silencioso → lista vacía. CORREGIDO: /asignables admite
    // 'residente' y su gate permite residente Y dependencia, así que el slot residente AHORA puebla el selector.
    await page.getByTestId('sust-rol').selectOption('residente');
    await expect(page.getByTestId('sust-nuevo')).toBeVisible();
    await expect(page.getByTestId('sust-sin-elegibles')).toHaveCount(0);
    await expect(page.getByTestId('sust-elegibles-error')).toHaveCount(0); // ya no hay 403 silencioso
    await expect(page.getByTestId('sust-nuevo-id')).toHaveCount(0); // sin captura manual de ID (B-1)
  });

  test('el backend sigue rechazando un ID inexistente (400)', async ({ request }) => {
    const { id, R } = await crearContratoB1(request);
    const r = await request.post(`${API}/roster/contrato/${id}/sustituir`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: { rol: 'superintendente', nuevoUsuarioId: 99999999, motivo: 'prueba id inexistente' }
    });
    expect(r.status(), 'ID inexistente debe ser 400').toBe(400);
  });
});

// ---------------------------------------------------------------------------
// BLOQUE 3c — REGLA 4: la sustitución reemplaza a la PERSONA, NUNCA a la EMPRESA del contrato. El
// sustituto debe pertenecer a la MISMA empresa que la persona saliente. Criterio del equipo (B20,
// default conservador): el contrato se liga a la empresa; art. 125 fr. I g RLOPSRM solo obliga a
// registrar la sustitución. Negativo (otra empresa → 409) + positivo (misma empresa → 201).
// ---------------------------------------------------------------------------
test.describe('Roster — REGLA 4: el sustituto debe ser de la misma empresa', () => {
  // Registra (pendiente) + aprueba (rol contratista) un usuario con la empresa dada. Email único por ts.
  const crearContratista = async (request, depToken, email, empresa) => {
    const reg = await request.post(`${API}/auth/register`, {
      data: { nombre: 'Sustituto Prueba', email, password: PASS, rolSolicitado: 'contratista', empresa }
    });
    expect(reg.status(), `registro ${email}`).toBe(201);
    const id = (await reg.json()).usuario.id;
    const apr = await request.patch(`${API}/usuarios/${id}/aprobar`, {
      headers: { Authorization: `Bearer ${depToken}` }, data: { rol: 'contratista' }
    });
    expect(apr.status(), `aprobar ${email}`).toBe(200);
    return id;
  };

  test('sustituir por alguien de OTRA empresa → 409; por la MISMA empresa → 201', async ({ request }) => {
    const ts = Date.now();
    const D = await loginApi(request, 'dependencia@sigecop.test');
    const R = await loginApi(request, 'residente@sigecop.test');
    const empAlpha = `Empresa Alpha ${ts}`;
    const empBeta = `Empresa Beta ${ts}`;

    // A y C en la MISMA empresa (Alpha); B en una empresa DISTINTA (Beta).
    const idA = await crearContratista(request, D.token, `regla4.a.${ts}@sigecop.test`, empAlpha);
    const idB = await crearContratista(request, D.token, `regla4.b.${ts}@sigecop.test`, empBeta);
    const idC = await crearContratista(request, D.token, `regla4.c.${ts}@sigecop.test`, empAlpha);

    // Contrato con superintendente = A (empresa Alpha), creado por el residente (es parte).
    const cr = await request.post(`${API}/contratos`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: {
        folio: `E2E-REGLA4-${ts}`, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Regla4',
        plazoDias: 60, fechaInicio: '2026-06-01', superintendenteId: idA, supervisionId: null,
        dependenciaId: D.user.id, anticipoPct: null, juridicos: {},
        conceptos: [{ clave: 'A1', concepto: 'c', unidad: 'm³', cantidad: 100, pu: 50 }],
        ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
      }
    });
    expect(cr.status(), 'crear contrato regla4').toBe(201);
    const contratoId = (await cr.json()).id;

    // NEGATIVO: sustituir el superintendente (A, Alpha) por B (Beta) → 409 (empresa distinta).
    const neg = await request.post(`${API}/roster/contrato/${contratoId}/sustituir`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: { rol: 'superintendente', nuevoUsuarioId: idB, motivo: 'intento de cambiar la empresa del contrato' }
    });
    expect(neg.status(), 'sustituto de OTRA empresa debe ser 409').toBe(409);
    expect((await neg.json()).error.toLowerCase()).toContain('misma empresa');

    // POSITIVO: sustituir por C (Alpha, misma empresa que A) → 201.
    const pos = await request.post(`${API}/roster/contrato/${contratoId}/sustituir`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: { rol: 'superintendente', nuevoUsuarioId: idC, motivo: 'sustitución dentro de la misma empresa' }
    });
    expect(pos.status(), 'sustituto de la MISMA empresa debe ser 201').toBe(201);
  });
});
