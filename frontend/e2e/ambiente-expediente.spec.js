// @ts-check
// AMBIENTE DE EXPEDIENTE Y REPORTES (sesión grande 18-jun, BLOQUE B) — cascarón "cierre documental" que
// ENCADENA HU-04 (expediente consolidado) + HU-19 (exportación de reportes) SIN fundir las HU. Ruta NUEVA
// /contratos/expediente-ambiente, fuera del catálogo (SoloRol, NO toca permisos.js). Solo navegación +
// lectura. LOGIN REAL (backend+BD) → se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, sidebarLinkFor } from './_helpers.js';

const skipEnCI = () => test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');
const VIEW = '/contratos/expediente-ambiente';
const TITULO = 'Ambiente de expediente y reportes (cierre documental, por bloques)';
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';

// --- Roles con acceso (ven expediente Y reportes) ---
for (const rol of ['residente', 'contratista', 'supervision', 'dependencia']) {
  test.describe(`Ambiente expediente — ${rol} (con acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol);
    });

    test('el link aparece en el Sidebar y el cascarón carga con sus 3 bloques y enlaces reales', async ({ page }) => {
      await expect(await sidebarLinkFor(page, VIEW)).toBeVisible();
      await goToViaSidebar(page, VIEW);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-contrato')).toBeVisible();
      for (let n = 1; n <= 3; n++) {
        await expect(page.getByTestId(`bloque-exp-${n}`)).toBeVisible();
      }
      await expect(page.getByTestId('link-expediente')).toHaveAttribute('href', /\/contratos\/expediente/);
      await expect(page.getByTestId('link-reportes')).toHaveAttribute('href', /\/reportes/);
    });
  });
}

// --- Finanzas: solo tiene reportes (no expediente) → queda fuera del ambiente ---
test.describe('Ambiente expediente — finanzas (fuera del ambiente)', () => {
  test.beforeEach(async ({ page }) => {
    skipEnCI();
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('no aparece el link y la ruta rebota a Inicio (SoloRol)', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW}"]`)).toHaveCount(0);
    await page.goto(`http://localhost:5173${VIEW}`);
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByRole('heading', { name: TITULO })).toHaveCount(0);
  });
});

// --- Con el contrato sembrado: resumen read-only + enlaces habilitados ---
test.describe('Ambiente expediente — resumen y enlaces con el contrato demo', () => {
  test('el residente elige el contrato demo y ve el resumen + enlaces a expediente y reportes', async ({ page, request }) => {
    skipEnCI();
    const login = await (await request.post(`${API}/auth/login`, { data: { email: 'residente@sigecop.test', password: PASS } })).json();
    const contratos = await (await request.get(`${API}/contratos`, { headers: { Authorization: `Bearer ${login.token}` } })).json();
    const demo = (Array.isArray(contratos) ? contratos : []).find((c) => c.folio === 'OBRA-2026-DEMO-01');
    test.skip(!demo, 'requiere el seed demo (npm run seed:demo)');

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, VIEW);
    await page.getByTestId('select-contrato').selectOption({ value: String(demo.id) });

    await expect(page.getByTestId('resumen-contrato')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('resumen-contrato')).toContainText('OBRA-2026-DEMO-01');
    await expect(page.getByTestId('link-expediente')).not.toHaveClass(/pointer-events-none/);
    await expect(page.getByTestId('link-reportes')).not.toHaveClass(/pointer-events-none/);
  });
});
