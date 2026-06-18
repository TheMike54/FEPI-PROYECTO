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

// BLOQUE 4 (acordeones del sidebar modo-sistema): los sub-pasos de cada flujo se ocultan al colapsar. Si el
// enlace buscado no está visible, expande los flujos colapsados (clic en los chevrons `data-accordion-toggle`
// que sigan en aria-expanded="false") hasta que el enlace aparezca. Plumbing de test: NO cambia la navegación
// real, ni el href ni el gating del enlace.
async function expandirSidebarHasta(page, path) {
  const link = page.locator(`aside a[href="${path}"]`).first();
  if (await link.isVisible().catch(() => false)) return;
  const toggles = page.locator('aside [data-accordion-toggle]');
  const n = await toggles.count();
  for (let i = 0; i < n; i++) {
    if (await link.isVisible().catch(() => false)) break;
    const t = toggles.nth(i);
    if ((await t.getAttribute('aria-expanded').catch(() => null)) === 'false') {
      await t.click().catch(() => {});
    }
  }
}

/** Navega a una vista con click SPA en su NavLink del Sidebar (expande su acordeón si hace falta). */
export async function goToViaSidebar(page, path) {
  await expandirSidebarHasta(page, path);
  await page.locator(`aside a[href="${path}"]`).first().click();
  await page.waitForLoadState('networkidle');
}

/** Locator del enlace de la vista en el Sidebar. AHORA ASÍNCRONO: expande el acordeón antes de devolverlo.
 *  Uso: `await sidebarLinkFor(page, path)`. (Puede tener .count() 0 si el rol no la ve.) */
export async function sidebarLinkFor(page, path) {
  await expandirSidebarHasta(page, path);
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
  // BLOQUE 4 (navegación modo-sistema): la metadata ACADÉMICA (el panel de modo proyecto — HU id, sprint,
  // criterios de aceptación, rol académico) se renderizaba dentro del CONTENIDO de la pantalla (<main>) y
  // debe seguir OCULTA ahí. El indicador de HU de NAVEGACIÓN del mockup modo-sistema (pill en el sidebar /
  // badge discreto) es intencional y vive FUERA de <main> (en <aside> o fijo), así que no es metadata
  // académica. Por eso el chequeo se acota a <main>: conserva el invariante real sin chocar con el marco.
  const main = page.locator('main');
  if (huId) await expect(main.locator('span', { hasText: huId })).toHaveCount(0);
  if (sprintLabel) await expect(main.locator('span', { hasText: sprintLabel })).toHaveCount(0);
  await expect(main.getByText('Criterios de aceptación')).toHaveCount(0);
  if (rolAcademicoLabel) {
    await expect(main.getByText(`Rol: ${rolAcademicoLabel}`)).toHaveCount(0);
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
  await page.getByTestId('dg-plazo').fill(String(plazo));
  await page.getByTestId('dg-fecha').fill(fechaInicio);
  // Corrección profe (04-jun): contratista y dependencia son CUENTAS seleccionadas (no texto libre).
  //   · contratista = superintendente (1ª cuenta rol contratista aprobada; índice 0 = "— Selecciona —").
  //   · dependencia = 1ª cuenta rol dependencia aprobada (dg-dependencia ahora es <select>).
  const sup = page.getByTestId('select-superintendente');
  if (await sup.locator('option').count() > 1) await sup.selectOption({ index: 1 });
  const dep = page.getByTestId('dg-dependencia');
  if (await dep.locator('option').count() > 1) await dep.selectOption({ index: 1 });
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

/**
 * alta-v5: rellena los DATOS JURÍDICOS obligatorios (paso 3). Requiere estar en el paso jurídicos.
 * Campos mínimos: firmante + cargo (art. 46 fr. I LOPSRM), representante legal (art. 46 fr. IV) y
 * cédula profesional (criterio del equipo: default conservador, se mantiene exigida). Poder/notaría son opcionales (no se llenan).
 */
export async function altaLlenarJuridicos(page, d = {}) {
  await page.getByTestId('jur-firmante').fill(d.firmante || 'Ing. Ana López Reyes');
  await page.getByTestId('jur-cargo').fill(d.cargo || 'Directora de Obras Públicas');
  await page.getByTestId('jur-representante').fill(d.representante || 'Lic. Juan Pérez Soto');
  await page.getByTestId('jur-cedula').fill(d.cedula || '12345678');
}

/**
 * alta-v5: rellena las GARANTÍAS obligatorias (paso 4). Requiere estar en el paso garantías.
 *  - Siempre agrega la fianza de CUMPLIMIENTO (art. 47 + 48 fr. II LOPSRM) en la fila índice 0.
 *  - Con `conAnticipo:true` agrega además la fianza de ANTICIPO (art. 48 fr. I) en la fila índice 1.
 * Montos pequeños (≤ monto del contrato de los tests, $5,000). Vigencia futura (no vencida).
 * Plan2 Pase3: el monto de la fianza de ANTICIPO es DERIVADO (read-only) = %anticipo × monto del
 * contrato; ya NO se teclea. El CALLER debe fijar `anticipo-input` (> 0) ANTES de llamar con
 * conAnticipo:true, para que el monto derivado sea > 0 y la póliza quede válida.
 */
export async function altaLlenarGarantias(page, { conAnticipo = false } = {}) {
  await page.getByRole('button', { name: '+ Agregar póliza' }).click();
  await page.getByTestId('garantia-tipo-0').selectOption('Cumplimiento');
  await page.getByTestId('garantia-afianzadora-0').fill('Afianzadora E2E, S.A.');
  await page.getByTestId('garantia-poliza-0').fill('POL-CUMP-001');
  await page.getByTestId('garantia-monto-0').fill('500');       // 10% de 5,000
  await page.getByTestId('garantia-vigencia-0').fill('2027-06-01');
  if (conAnticipo) {
    await page.getByRole('button', { name: '+ Agregar póliza' }).click();
    await page.getByTestId('garantia-tipo-1').selectOption('Anticipo'); // → monto auto-derivado (read-only)
    await page.getByTestId('garantia-afianzadora-1').fill('Afianzadora E2E, S.A.');
    await page.getByTestId('garantia-poliza-1').fill('POL-ANT-001');
    await page.getByTestId('garantia-vigencia-1').fill('2027-06-01');
  }
}

