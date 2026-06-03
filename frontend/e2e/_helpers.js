// @ts-check
// Helpers comunes de la suite E2E de SIGECOP.
//
// alta-v2 (4.5): se ELIMINÓ el "modo proyecto" y el atajo demo (login sin token). La suite
// ahora entra con LOGIN REAL (form de SeleccionRol → POST /auth/login) usando las cuentas
// semilla. Por eso TODAS las specs que usan enterAppMode requieren backend+BD y se saltan en
// CI (test.skip(!!process.env.CI, ...)). Las cuentas las siembra schema.sql (5 roles, contraseña
// común Sigecop2026!); ver docs/Cuentas_Prueba_SIGECOP.md.
//
// Reglas portadas del diseño original que siguen vigentes:
//   1. Para asertar la card de Inicio se acota a `main a[href=...]` (cardInInicioFor), porque
//      el Sidebar tiene un enlace al mismo path.
//   2. El aviso de solo-lectura dice "solo consulta" (expectAvisoSoloConsulta / ...Sin...).
//   3. Para navegar entre vistas se hace click en el NavLink del Sidebar (navegación SPA),
//      no page.goto (que recargaría). El goto se usa solo en freshHome.

import { expect } from '@playwright/test';

/** Mapa rolId -> nombre visible (sigue usándose para asserts de "Acceso: X"). */
export const ROL_NOMBRE = {
  residente:   'Residente de obra',
  contratista: 'Contratista / Superintendente',
  supervision: 'Supervisión',
  dependencia: 'Dependencia / Contratante',
  finanzas:    'Finanzas'
};

/** Cuentas semilla por rol (login real). Contraseña común Sigecop2026! (schema.sql seed). */
export const CUENTA_DE_ROL = {
  residente:   { email: 'residente@sigecop.test',   password: 'Sigecop2026!' },
  contratista: { email: 'contratista@sigecop.test', password: 'Sigecop2026!' },
  supervision: { email: 'supervision@sigecop.test', password: 'Sigecop2026!' },
  dependencia: { email: 'dependencia@sigecop.test', password: 'Sigecop2026!' },
  finanzas:    { email: 'finanzas@sigecop.test',     password: 'Sigecop2026!' }
};

/**
 * Reload total a "/", LIMPIANDO la sesión (localStorage). Deja el selector de login.
 * Solo al inicio de cada test. (Antes reseteaba el modo en memoria; ahora limpia el token.)
 */
export async function freshHome(page) {
  await page.goto('/');
  await page.evaluate(() => { try { localStorage.clear(); } catch (_) { /* noop */ } });
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Entra a la app con LOGIN REAL como el rolId indicado. Sustituye al antiguo atajo demo.
 * Requiere backend+BD (cuentas semilla). El nombre se conserva por compatibilidad con las specs.
 */
export async function enterAppMode(page, rolId) {
  const cta = CUENTA_DE_ROL[rolId];
  if (!cta) throw new Error(`rolId desconocido: ${rolId}`);
  // Asegura estar en el form de login (si ya hay sesión, no habría #login-usuario).
  if (await page.locator('#login-usuario').count() === 0) await freshHome(page);
  await page.fill('#login-usuario', cta.email);
  await page.fill('#login-password', cta.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  // El shell autenticado aparece (Sidebar) — espera robusta, evita carreras con el render.
  await page.locator('aside').first().waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle');
}

/** Login real explícito (alias claro de enterAppMode). */
export async function loginComo(page, rolId) {
  await enterAppMode(page, rolId);
}

/** Navega a una vista con click SPA en su NavLink del Sidebar. */
export async function goToViaSidebar(page, path) {
  await page.locator(`aside a[href="${path}"]`).first().click();
  await page.waitForLoadState('networkidle');
}

/** Locator del enlace de la vista en el Sidebar (puede tener .count() 0 si el rol no la ve). */
export function sidebarLinkFor(page, path) {
  return page.locator(`aside a[href="${path}"]`).first();
}

/** Locator de la card de la vista en Inicio (anclada a <main> para distinguirla del Sidebar). */
export function cardInInicioFor(page, path) {
  return page.locator(`main a[href="${path}"]`).first();
}

/** Asserts: el AvisoSoloLectura (texto "solo consulta") está presente. */
export async function expectAvisoSoloConsulta(page) {
  await expect(page.getByText('solo consulta')).toBeVisible();
}

/** Asserts: el AvisoSoloLectura no está en la página. */
export async function expectSinAvisoSoloConsulta(page) {
  await expect(page.getByText('solo consulta')).toHaveCount(0);
}

/**
 * alta-v2 (4.5): la metadata académica (badge HU/Sprint, "Criterios de aceptación", "Rol: X")
 * se ELIMINÓ del producto. Este helper sigue existiendo para las specs que lo invocan y ahora
 * verifica simplemente que NO está presente (lo cual es cierto en todas las vistas).
 */
export async function expectMetadataAcademicaOculta(page, { huId, sprintLabel, rolAcademicoLabel } = {}) {
  if (huId) await expect(page.locator('span', { hasText: huId })).toHaveCount(0);
  if (sprintLabel) await expect(page.locator('span', { hasText: sprintLabel })).toHaveCount(0);
  await expect(page.getByText('Criterios de aceptación')).toHaveCount(0);
  if (rolAcademicoLabel) {
    await expect(page.getByText(`Rol: ${rolAcademicoLabel}`)).toHaveCount(0);
  }
}

// ===========================================================================
// alta-v2: helpers de CAPTURA del alta (la app arranca vacía y el wizard gatea).
// Requieren estar logueado como 'residente' y en /contratos/alta (paso 0).
// ===========================================================================

/**
 * Rellena el paso 0 (Datos generales) con datos válidos y asigna el superintendente
 * (1ª cuenta contratista asignable = contratista@sigecop.test, sembrada). Devuelve el folio.
 */
export async function altaLlenarDatosGenerales(page, { folio, plazo = 60, fechaInicio = '2026-06-01' } = {}) {
  const f = folio || `E2E-${Date.now()}`;
  await page.getByTestId('dg-folio').fill(f);
  await page.getByTestId('dg-objeto').fill('Obra de prueba e2e');
  await page.getByTestId('dg-contratista').fill('Constructora E2E S.A. de C.V.');
  await page.getByTestId('dg-dependencia').fill('Dependencia E2E');
  await page.getByTestId('dg-plazo').fill(String(plazo));
  await page.getByTestId('dg-fecha').fill(fechaInicio);
  const sup = page.getByTestId('select-superintendente');
  const nopts = await sup.locator('option').count();
  if (nopts > 1) await sup.selectOption({ index: 1 }); // 1ª cuenta contratista (índice 0 = "— Selecciona —")
  return f;
}

/** Añade y rellena un concepto del catálogo en la fila índice i (botón "+ Agregar concepto"). */
export async function altaAgregarConcepto(page, i, { clave, concepto = 'Concepto e2e', unidad = 'm³', cantidad = 100, pu = 50 } = {}) {
  await page.getByRole('button', { name: '+ Agregar concepto' }).click();
  await page.getByTestId(`concepto-clave-${i}`).fill(clave || `C${i + 1}`);
  await page.getByTestId(`concepto-concepto-${i}`).fill(concepto);
  await page.getByTestId(`concepto-unidad-${i}`).selectOption(unidad);
  await page.getByTestId(`concepto-cantidad-${i}`).fill(String(cantidad));
  await page.getByTestId(`concepto-pu-${i}`).fill(String(pu));
}

/**
 * alta-v3: en el último paso ("PDF firmado") adjunta un PDF en memoria (sin fixture en disco,
 * vía setInputFiles con buffer). El archivo queda RETENIDO (se sube al guardar el contrato) y
 * habilita el botón "Guardar". Requiere estar en el paso PDF firmado (sin contrato aún guardado).
 */
export async function altaAdjuntarPdfFirmado(page, nombre = 'contrato-firmado-e2e.pdf') {
  await page.getByTestId('pdf-firmado-input-precaptura').setInputFiles({
    name: nombre,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%E2E\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
  });
  await page.getByTestId('pdf-firmado-pendiente-file').waitFor({ state: 'visible' });
}

/**
 * alta-v4: en el paso "Garantías", con anticipo > umbral, adjunta el PDF de autorización del
 * anticipo en memoria (input `anticipo-pdf-input`). Queda retenido (se sube al guardar) y
 * satisface el gate del paso 4. Requiere que el aviso del anticipo ya esté visible (anticipo>umbral).
 */
export async function altaAdjuntarPdfAnticipo(page, nombre = 'autorizacion-anticipo-e2e.pdf') {
  await page.getByTestId('anticipo-pdf-input').setInputFiles({
    name: nombre,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%E2E-ANT\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
  });
  await page.getByTestId('anticipo-pdf-pendiente-file').waitFor({ state: 'visible' });
}

