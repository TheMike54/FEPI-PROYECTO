// @ts-check
// Helpers comunes de la suite E2E de SIGECOP.
//
// REGLAS portadas del script Python original (los 3 fixes valiosos):
//   1. Para asertar la card de Inicio se acota a `main a[href=...]` porque el
//      Sidebar tambien tiene un enlace al mismo path. (cardInInicioFor)
//   2. El aviso de solo-lectura dice "solo consulta" (no "solo lectura").
//      (expectAvisoSoloConsulta / expectSinAvisoSoloConsulta)
//   3. NUNCA se usa page.goto() para moverse entre vistas; eso provoca un full
//      reload que resetea SesionContext a (modo='proyecto', rol=null). Para
//      navegar a una vista del catalogo se hace click en el NavLink del Sidebar
//      (navegacion SPA). El UNICO goto permitido es el de freshHome al inicio
//      de cada test. (freshHome / goToViaSidebar)

import { expect } from '@playwright/test';

/**
 * Mapa rolId -> nombre visible que muestra el SeleccionRol. Usado por
 * enterAppMode para parametrizar los tests por id ('residente', etc.) en vez
 * de tener que escribir el nombre largo cada vez. Coincide con ROLES de
 * frontend/src/data/permisos.js.
 */
export const ROL_NOMBRE = {
  residente:   'Residente de obra',
  contratista: 'Contratista / Superintendente',
  supervision: 'Supervisión',
  dependencia: 'Dependencia / Contratante',
  finanzas:    'Finanzas'
};

/** Reload total a "/". Deja modo=proyecto, rol=null. Solo al inicio de cada test. */
export async function freshHome(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/** Cambia a modo aplicacion y entra como el rolId indicado (clave de ROL_NOMBRE). */
export async function enterAppMode(page, rolId) {
  const rolNombre = ROL_NOMBRE[rolId];
  if (!rolNombre) throw new Error(`rolId desconocido: ${rolId}`);
  await page.getByRole('button', { name: 'Modo aplicación' }).first().click();
  // SeleccionRol intercepta porque rol === null. Cada rol es un <button> que
  // contiene un <h3> con el nombre visible.
  await page
    .locator('button')
    .filter({ has: page.locator('h3', { hasText: rolNombre }) })
    .first()
    .click();
  await page.waitForLoadState('networkidle');
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

/** Asserts: el AvisoSoloLectura (texto "solo consulta") esta presente. */
export async function expectAvisoSoloConsulta(page) {
  await expect(page.getByText('solo consulta')).toBeVisible();
}

/** Asserts: el AvisoSoloLectura no esta en la pagina. */
export async function expectSinAvisoSoloConsulta(page) {
  await expect(page.getByText('solo consulta')).toHaveCount(0);
}

/**
 * Asserts: en modo aplicacion, la metadata academica (badge HU, badge Sprint,
 * heading "Criterios de aceptación" y subtitulo "Rol: X") esta OCULTA. Util
 * tras navegar a una vista cualquiera en modo aplicacion.
 */
export async function expectMetadataAcademicaOculta(page, { huId, sprintLabel, rolAcademicoLabel }) {
  await expect(page.locator('span', { hasText: huId })).toHaveCount(0);
  await expect(page.locator('span', { hasText: sprintLabel })).toHaveCount(0);
  await expect(page.getByText('Criterios de aceptación')).toHaveCount(0);
  if (rolAcademicoLabel) {
    await expect(page.getByText(`Rol: ${rolAcademicoLabel}`)).toHaveCount(0);
  }
}
