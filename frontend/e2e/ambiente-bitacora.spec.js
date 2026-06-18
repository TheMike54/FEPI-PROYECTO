// @ts-check
// AMBIENTE DE BITÁCORA (sesión grande 18-jun, BLOQUE B) — cascarón por bloques que ENCADENA apertura→firma→
// emisión→consulta→minutas SIN fundir las HU. Ruta NUEVA /bitacora/ambiente, fuera del catálogo (SoloRol,
// NO toca permisos.js). Aquí se valida el ACCESO por rol y el CABLEADO (selector + bloques + candado de
// emisión que usa bitacora.completa, art. 123 fr. III RLOPSRM). No prueba la lógica de notas (es de HU-08/09).
//
// LOGIN REAL (backend+BD) → se salta en CI. Helpers: ./_helpers.js.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar, sidebarLinkFor } from './_helpers.js';

const skipEnCI = () => test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');
const VIEW = '/bitacora/ambiente';
const TITULO = 'Ambiente de bitácora (hilo legal del contrato, por bloques)';
const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';

// --- Roles con acceso (residente / contratista / supervisión) ---
for (const rol of ['residente', 'contratista', 'supervision']) {
  test.describe(`Ambiente bitácora — ${rol} (con acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol);
    });

    test('el link aparece en el Sidebar y el cascarón carga con sus 6 bloques', async ({ page }) => {
      await expect(await sidebarLinkFor(page, VIEW)).toBeVisible();
      await goToViaSidebar(page, VIEW);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-contrato')).toBeVisible();
      // Los 6 bloques del cascarón están presentes (no funde las HU: cada uno enlaza a su ruta real).
      for (let n = 1; n <= 6; n++) {
        await expect(page.getByTestId(`bloque-bit-${n}`)).toBeVisible();
      }
      // Los enlaces a las rutas reales existen (encadena, no reemplaza).
      await expect(page.getByTestId('link-abrir')).toHaveAttribute('href', /\/bitacora\/apertura/);
      await expect(page.getByTestId('link-firmar')).toHaveAttribute('href', '/bitacora/por-firmar');
      await expect(page.getByTestId('link-consulta')).toHaveAttribute('href', /\/bitacora\/consulta/);
      await expect(page.getByTestId('link-minutas')).toHaveAttribute('href', /\/bitacora\/minutas/);
    });
  });
}

// --- Roles sin acceso (dependencia / finanzas) ---
for (const rol of ['dependencia', 'finanzas']) {
  test.describe(`Ambiente bitácora — ${rol} (sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol);
    });

    test('no aparece el link y la ruta rebota a Inicio (SoloRol)', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW}"]`)).toHaveCount(0);
      await page.goto(`http://localhost:5173${VIEW}`);
      await expect(page).toHaveURL(/\/$|\/\?/); // SoloRol redirige a "/"
      await expect(page.getByRole('heading', { name: TITULO })).toHaveCount(0);
    });
  });
}

// --- Candado de emisión: con el contrato sembrado (bitácora completa) se abre el enlace a notas ---
test.describe('Ambiente bitácora — candado de emisión (art. 123 fr. III)', () => {
  test('el residente elige el contrato demo (apertura firmada) y el bloque 4 habilita "Emitir notas"', async ({ page, request }) => {
    skipEnCI();
    const login = await (await request.post(`${API}/auth/login`, { data: { email: 'residente@sigecop.test', password: PASS } })).json();
    const contratos = await (await request.get(`${API}/contratos`, { headers: { Authorization: `Bearer ${login.token}` } })).json();
    const demo = (Array.isArray(contratos) ? contratos : []).find((c) => c.folio === 'OBRA-2026-DEMO-01');
    test.skip(!demo, 'requiere el seed demo (npm run seed:demo)');

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, VIEW);
    await page.getByTestId('select-contrato').selectOption({ value: String(demo.id) });

    // La apertura del demo está firmada por las 3 partes → completa → bloque 4 sin candado, con enlace a notas.
    await expect(page.getByTestId('firmas-xy')).toContainText('completa', { timeout: 10000 });
    await expect(page.getByTestId('link-notas')).toBeVisible();
    await expect(page.getByTestId('candado-bit-4')).toHaveCount(0);
  });
});
