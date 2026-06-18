// @ts-check
// BLOQUE 4 (pase de diseño) — verifica + CAPTURA el sidebar modo-sistema (guinda, acordeones) y el Inicio
// curado por rol. Login real → skip en CI. Las capturas van a docs/reportes/screens-bloque4-diseno/.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode } from './_helpers.js';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

const DIR = '../docs/reportes/screens-bloque4-diseno';

test('sidebar: acordeón colapsado por defecto, abre/cierra; textos completos (sin truncar)', async ({ page }) => {
  await freshHome(page);
  await enterAppMode(page, 'residente');

  // El flujo padre se lee COMPLETO (no truncado) y es navegable.
  const padre = page.locator('aside a[href="/estimaciones/integracion"]');
  await expect(padre).toBeVisible();
  await expect(padre).toContainText('Ciclo de estimación'); // texto completo, no "Cicl..."
  await expect(page.locator('aside a[href="/contratos/alta"]')).toContainText('Alta de contratos');

  // Por defecto colapsado: el sub-paso NO está en el DOM.
  await expect(page.locator('aside a[href="/estimaciones/revision"]')).toHaveCount(0);
  await page.locator('aside').screenshot({ path: `${DIR}/sidebar-colapsado.png` });

  // Expandir con el chevron del flujo → el sub-paso aparece.
  await page.locator('aside [data-accordion-toggle="HU-12"]').click();
  await expect(page.locator('aside a[href="/estimaciones/revision"]')).toBeVisible();
  await expect(page.locator('aside a[href="/estimaciones/revision"]')).toContainText('Revisión');
  await page.locator('aside').screenshot({ path: `${DIR}/sidebar-expandido.png` });

  // Colapsar de nuevo.
  await page.locator('aside [data-accordion-toggle="HU-12"]').click();
  await expect(page.locator('aside a[href="/estimaciones/revision"]')).toHaveCount(0);
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
