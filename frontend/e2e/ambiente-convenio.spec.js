// @ts-check
// AMBIENTE DE CONVENIO MODIFICATORIO (sesión grande 18-jun, BLOQUE B) — cascarón EPISÓDICO que ENVUELVE
// HU-03 + oficio + reflejo en bitácora/expediente SIN fundir las HU. Ruta NUEVA /contratos/convenio-ambiente,
// fuera del catálogo (SoloRol, NO toca permisos.js). LOGIN REAL → se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, sidebarLinkFor } from './_helpers.js';

const skipEnCI = () => test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');
const VIEW = '/contratos/convenio-ambiente';
const TITULO = 'Ambiente de convenio modificatorio (por bloques)';
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';

// --- Roles con acceso (dependencia, residente, contratista, supervisión) ---
for (const rol of ['dependencia', 'residente', 'contratista', 'supervision']) {
  test.describe(`Ambiente convenio — ${rol} (con acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol);
    });

    test('el link aparece en el Sidebar y el cascarón carga con sus 6 bloques y enlace a HU-03', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW)).toBeVisible();
      await goToViaSidebar(page, VIEW);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-contrato')).toBeVisible();
      for (let n = 1; n <= 6; n++) {
        await expect(page.getByTestId(`bloque-conv-${n}`)).toBeVisible();
      }
      // HU-03 sí lee ?contrato=; el enlace apunta a su ruta real.
      await expect(page.getByTestId('link-convenio')).toHaveAttribute('href', /\/contratos\/modificatorios/);
    });
  });
}

// --- Finanzas: sin acceso ---
test.describe('Ambiente convenio — finanzas (sin acceso)', () => {
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

// --- Con el contrato sembrado: el convenio de PLAZO (211→241, +14.2%, bajo el 25%) → NO marca SFP ---
test.describe('Ambiente convenio — variación del convenio demo (Δ plazo, sin SFP)', () => {
  test('el residente elige el contrato demo y ve el cambio de plazo; el aviso SFP NO aplica', async ({ page, request }) => {
    skipEnCI();
    const login = await (await request.post(`${API}/auth/login`, { data: { email: 'residente@sigecop.test', password: PASS } })).json();
    const contratos = await (await request.get(`${API}/contratos`, { headers: { Authorization: `Bearer ${login.token}` } })).json();
    const demo = (Array.isArray(contratos) ? contratos : []).find((c) => c.folio === 'OBRA-2026-DEMO-01');
    test.skip(!demo, 'requiere el seed demo (npm run seed:demo)');

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, VIEW);
    await page.getByTestId('select-contrato').selectOption({ value: String(demo.id) });

    // El convenio sembrado es de PLAZO 211→241 días (+14.2%, bajo el 25%) → requiere_revision_sfp=false.
    await expect(page.getByTestId('convenio-variaciones')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('convenio-variaciones')).toContainText('241');
    await expect(page.getByTestId('aviso-sfp')).toContainText('no aplica');
  });
});
