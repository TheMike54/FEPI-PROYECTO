// @ts-check
// O3 — CATÁLOGO DE EMPRESAS (P1 de la revisión del profe): "tú primero das de alta la empresa y
// luego vinculas… catálogos: es lo de ley". El primero la registra, el siguiente la elige. Cubre:
//   · registro con empresa NUEVA → confirma alta y queda en el catálogo (alta automática).
//   · registro eligiendo empresa EXISTENTE → NO re-pregunta ni duplica.
//   · ALTA de contrato: aviso (no bloqueo) si superintendente y supervisión son de la misma empresa.
//   · EXPEDIENTE: muestra la empresa de cada persona y se puede BUSCAR por empresa.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos,
} from './_helpers.js';

test.skip(!!process.env.CI, 'O3: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const registrarApi = (request, data) => request.post(`${API}/auth/register`, { data });
const aprobarApi = (request, depToken, id, rol) =>
  request.patch(`${API}/usuarios/${id}/aprobar`, { headers: { Authorization: `Bearer ${depToken}` }, data: { rol } });

test.describe('O3 — catálogo de empresas', () => {

  test('registro con empresa NUEVA: confirma el alta y queda en el catálogo', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('link-registro').click();
    await expect(page.getByTestId('form-registro')).toBeVisible();

    const ts = Date.now();
    const empresaNueva = `Constructora O3 ${ts}`;
    await page.getByTestId('reg-nombres').fill('Pedro');
    await page.getByTestId('reg-apellidos').fill(`Empresa ${ts}`);
    await page.getByTestId('reg-email').fill(`o3.nueva.${ts}@sigecop.test`);
    await page.getByTestId('reg-rol').selectOption('contratista');
    await page.getByTestId('reg-empresa').fill(empresaNueva);
    await page.getByTestId('reg-password').fill('Test1234!');
    await page.getByTestId('reg-password2').fill('Test1234!');

    // Empresa nueva → el form CONFIRMA antes de enviar (principio del profe: alta automática).
    let preguntoAlta = false;
    page.once('dialog', (d) => { preguntoAlta = /no está en el catálogo/i.test(d.message()); d.accept(); });
    await page.getByTestId('reg-submit').click();

    await expect(page.getByTestId('auth-mensaje')).toContainText('pendiente de aprobación');
    expect(preguntoAlta, 'debió preguntar por el alta de la empresa nueva').toBe(true);

    // La empresa quedó en el catálogo público (alta automática).
    const cat = await (await page.request.get(`${API}/auth/empresas`)).json();
    expect(cat.some((e) => e.nombre === empresaNueva)).toBe(true);
  });

  test('registro eligiendo empresa EXISTENTE: no re-pregunta ni duplica', async ({ page }) => {
    // 'Constructora Demo' ya está sembrada en el catálogo.
    const catAntes = await (await page.request.get(`${API}/auth/empresas`)).json();
    const nDemo = catAntes.filter((e) => e.nombre === 'Constructora Demo').length;
    expect(nDemo).toBe(1);

    await freshHome(page);
    await page.getByTestId('link-registro').click();
    const ts = Date.now();
    await page.getByTestId('reg-nombres').fill('Sara');
    await page.getByTestId('reg-apellidos').fill(`Existente ${ts}`);
    await page.getByTestId('reg-email').fill(`o3.existe.${ts}@sigecop.test`);
    await page.getByTestId('reg-rol').selectOption('contratista');
    await page.getByTestId('reg-empresa').fill('Constructora Demo'); // ya existe
    await page.getByTestId('reg-password').fill('Test1234!');
    await page.getByTestId('reg-password2').fill('Test1234!');

    // Empresa existente → NO debe dispararse el confirm.
    let pregunto = false;
    page.once('dialog', (d) => { pregunto = true; d.accept(); });
    await page.getByTestId('reg-submit').click();
    await expect(page.getByTestId('auth-mensaje')).toContainText('pendiente de aprobación');
    expect(pregunto, 'no debió preguntar: la empresa ya está en el catálogo').toBe(false);

    // No se duplicó 'Constructora Demo'.
    const catDespues = await (await page.request.get(`${API}/auth/empresas`)).json();
    expect(catDespues.filter((e) => e.nombre === 'Constructora Demo').length).toBe(1);
  });

  test('ALTA: aviso (no bloqueo) si superintendente y supervisión son de la misma empresa', async ({ page, request }) => {
    // Dos cuentas en la MISMA empresa, una contratista y una supervisión (aprobadas vía API).
    const ts = Date.now();
    const empresaComun = `Grupo Mismo ${ts}`;
    const r1 = await (await registrarApi(request, { nombre: `Con Tratista ${ts}`, email: `o3.con.${ts}@sigecop.test`, password: 'Test1234!', rolSolicitado: 'contratista', empresa: empresaComun })).json();
    const r2 = await (await registrarApi(request, { nombre: `Su Pervisor ${ts}`, email: `o3.sup.${ts}@sigecop.test`, password: 'Test1234!', rolSolicitado: 'supervision', empresa: empresaComun })).json();
    const dep = await loginApi(request, 'dependencia@sigecop.test');
    expect((await aprobarApi(request, dep.token, r1.usuario.id, 'contratista')).status()).toBe(200);
    expect((await aprobarApi(request, dep.token, r2.usuario.id, 'supervision')).status()).toBe(200);

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');
    await altaLlenarDatosGenerales(page, { plazo: 60, fechaInicio: '2026-06-01' });
    // Selecciona EXPLÍCITAMENTE el superintendente y la supervisión de la misma empresa.
    await page.getByTestId('select-superintendente').selectOption({ value: String(r1.usuario.id) });
    await page.getByTestId('select-supervision').selectOption({ value: String(r2.usuario.id) });
    // Aviso visible (no bloquea: el wizard sigue dejando avanzar).
    await expect(page.getByTestId('aviso-misma-empresa')).toBeVisible();
    await expect(page.getByTestId('aviso-misma-empresa')).toContainText(empresaComun);
    // Cambiar la supervisión a "sin supervisión" quita el aviso.
    await page.getByTestId('select-supervision').selectOption({ value: '' });
    await expect(page.getByTestId('aviso-misma-empresa')).toHaveCount(0);
  });

  test('EXPEDIENTE: muestra la empresa del equipo y se puede buscar por empresa', async ({ page, request }) => {
    // Contrato con el equipo demo (contratista=Constructora Demo, supervisión=Supervisión Externa Demo).
    const [R, S, V, D] = await Promise.all([
      loginApi(request, 'residente@sigecop.test'),
      loginApi(request, 'contratista@sigecop.test'),
      loginApi(request, 'supervision@sigecop.test'),
      loginApi(request, 'dependencia@sigecop.test')
    ]);
    const folio = `E2E-O3-EXP-${Date.now()}`;
    const r = await request.post(`${API}/contratos`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: {
        folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Expediente empresas O3',
        plazoDias: 60, fechaInicio: '2026-06-01',
        superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
        anticipoPct: null, juridicos: {},
        conceptos: [{ clave: 'O3X', concepto: 'Concepto O3', unidad: 'm³', cantidad: 100, pu: 50 }],
        ciclo: 'mensual', programa: [{ clave: 'O3X', periodoNumero: 1, cantidad: 100 }], garantias: []
      }
    });
    expect(r.status()).toBe(201);
    const id = (await r.json()).id;

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/expediente');
    await page.getByTestId('select-contrato').selectOption({ value: String(id) });

    // El bloque jurídicos (equipo) muestra la empresa del superintendente (Constructora Demo).
    await expect(page.getByText('Constructora Demo').first()).toBeVisible();

    // Buscar por EMPRESA: campo 'empresa' + "Constructora" deja visible el bloque del equipo y
    // FILTRA los que no traen esa empresa (el contador baja del total). (Término sin acento para
    // evitar diferencias de normalización Unicode entre el spec y el render.)
    await page.locator('label:has-text("Buscar por") + select').selectOption('empresa');
    await page.getByTestId('input-busqueda').fill('Constructora');
    const aviso = page.getByText(/Mostrando (\d+) de (\d+) bloques/);
    await expect(aviso).toBeVisible();
    const texto = await aviso.textContent();
    const [, n, m] = texto.match(/Mostrando (\d+) de (\d+)/);
    expect(Number(n)).toBeGreaterThan(0);          // el bloque del equipo coincide
    expect(Number(n)).toBeLessThan(Number(m));     // y filtró los que no traen esa empresa
    await expect(page.getByText('Constructora Demo').first()).toBeVisible();
  });

  test('FASE 3: variante de empresa existente (acento + sufijo de razón social) REUTILIZA, no duplica', async ({ request }) => {
    // 'Constructora Demo' ya está sembrada en el catálogo.
    const cat = await (await request.get(`${API}/auth/empresas`)).json();
    const demo = cat.find((e) => e.nombre === 'Constructora Demo');
    expect(demo, "'Constructora Demo' debe estar sembrada").toBeTruthy();
    const totalAntes = cat.length;

    // Registrar con una VARIANTE: acento + sufijo de razón social ("Constructóra Demo, S.A. de C.V.").
    // El backend hace match FUERTE → vincula a la empresa EXISTENTE en vez de crear un duplicado.
    const ts = Date.now();
    const r = await (await registrarApi(request, {
      nombre: `Vari Ante ${ts}`, email: `o3.var.${ts}@sigecop.test`,
      password: 'Test1234!', rolSolicitado: 'contratista',
      empresa: 'Constructóra Demo, S.A. de C.V.',
    })).json();
    expect(r.usuario.empresa_id, 'debe reutilizar el id de la empresa existente').toBe(demo.id);

    const catDespues = await (await request.get(`${API}/auth/empresas`)).json();
    expect(catDespues.length, 'el catálogo NO debe crecer con la variante').toBe(totalAntes);
    // Acotado al efecto puntual: NO se creó una empresa con el nombre exacto de la variante registrada.
    expect(catDespues.some((e) => e.nombre === 'Constructóra Demo, S.A. de C.V.'), 'no debe entrar la variante tecleada').toBe(false);
  });

  test('FASE 3 (UI): teclear una variante avisa "se usará la existente"', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('link-registro').click();
    await expect(page.getByTestId('form-registro')).toBeVisible();
    // Variante (sufijo de razón social) de 'Constructora Demo' → la UI reconoce la existente.
    await page.getByTestId('reg-empresa').fill('Constructora Demo SA de CV');
    await expect(page.getByTestId('reg-empresa-existente')).toBeVisible();
    await expect(page.getByTestId('reg-empresa-existente')).toContainText('Constructora Demo');
  });
});
