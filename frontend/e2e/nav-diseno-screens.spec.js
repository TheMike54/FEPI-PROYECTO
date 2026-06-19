// @ts-check
// BLOQUE 4 (pase de diseño) — verifica + CAPTURA el sidebar modo-sistema (guinda, acordeones) y el Inicio
// curado por rol. Login real → skip en CI. Las capturas van a docs/reportes/screens-bloque4-diseno/.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode } from './_helpers.js';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

const DIR = '../docs/reportes/screens-bloque4-diseno';

test('sidebar PLANO (F5): ciclos como items directos, textos completos; los sub-pasos viven dentro del ciclo', async ({ page }) => {
  await freshHome(page);
  await enterAppMode(page, 'residente');

  // Cada CICLO se lee COMPLETO (no truncado) y es navegable como item directo.
  const estim = page.locator('aside a[href="/estimaciones/integracion"]');
  await expect(estim).toBeVisible();
  await expect(estim).toContainText('Ciclo de estimación'); // texto completo, no "Cicl..."
  await expect(page.locator('aside a[href="/contratos/alta"]')).toContainText('Alta de contratos');

  // F5 — el sidebar es PLANO (sin acordeón): los sub-pasos/lecturas YA NO están en el sidebar (viven DENTRO
  // del ciclo: wizard + "en paralelo"). Ej.: Revisión (HU-15) ya no es item del sidebar; tampoco hay chevrons.
  await expect(page.locator('aside a[href="/estimaciones/revision"]')).toHaveCount(0);
  await expect(page.locator('aside [data-accordion-toggle]')).toHaveCount(0);
  await page.locator('aside').screenshot({ path: `${DIR}/sidebar-plano.png` });
});

test('Inicio del residente: módulos principales curados (no la lista larga de sub-HU)', async ({ page }) => {
  await freshHome(page);
  await enterAppMode(page, 'residente');
  await page.screenshot({ path: `${DIR}/inicio-residente.png`, fullPage: true });
  // Muestra entradas de flujo principales…
  await expect(page.locator('main a[href="/contratos/alta"]')).toBeVisible();
  await expect(page.locator('main a[href="/contratos/expediente"]')).toBeVisible();
  // …y NO los sub-pasos sueltos (viven en el sidebar, no en Inicio).
  await expect(page.locator('main a[href="/estimaciones/reingreso"]')).toHaveCount(0);
  await expect(page.locator('main a[href="/bitacora/consulta"]')).toHaveCount(0);
});

for (const rol of ['dependencia', 'contratista', 'finanzas', 'supervision']) {
  test(`Inicio de ${rol} (captura)`, async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, rol);
    await page.screenshot({ path: `${DIR}/inicio-${rol}.png`, fullPage: true });
    await page.locator('aside').screenshot({ path: `${DIR}/sidebar-${rol}.png` });
  });
}
