// @ts-check
// AMBIENTE DE BITÁCORA — FASE 4 (rediseño): WIZARD del hilo legal (Apertura → Firma → Emitir notas),
// con Consultar (HU-10) y Minutas (HU-11) EN PARALELO (lectura, siempre accesibles). Ruta
// /bitacora/ambiente, fuera del catálogo (SoloRol, NO toca permisos.js). Aquí se valida el ACCESO por rol,
// el CABLEADO (selector + barra de pasos + enlaces reales + paralelos) y el candado de emisión
// (bitacora.completa, art. 123 fr. III RLOPSRM). No prueba la lógica de notas (es de HU-08/09).
// LOGIN REAL (backend+BD) → se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode } from './_helpers.js';

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

    test('el cascarón carga (por URL): selector + paralelos (HU-10/11) siempre; al elegir contrato aparece la barra de pasos', async ({ page }) => {
      await page.goto(`http://localhost:5173${VIEW}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-contrato')).toBeVisible();
      // Bloque 1 (selector/estado) + los PARALELOS (consulta/minutas) están SIEMPRE (lectura, no encadenados).
      await expect(page.getByTestId('bloque-bit-1')).toBeVisible();
      await expect(page.getByTestId('link-consulta')).toHaveAttribute('href', /\/bitacora\/consulta/);
      await expect(page.getByTestId('link-minutas')).toHaveAttribute('href', /\/bitacora\/minutas/);
      // Sin contrato aún: el wizard (barra de pasos) no se muestra.
      await expect(page.getByTestId('wizard-bitacora-pasos')).toHaveCount(0);
      // Al elegir un contrato aparece la barra de pasos y el paso 1 (Apertura) con su enlace real.
      const sel = page.getByTestId('select-contrato');
      if (await sel.locator('option').count() > 1) {
        await sel.selectOption({ index: 1 });
        await expect(page.getByTestId('wizard-bitacora-pasos')).toBeVisible();
        await expect(page.getByTestId('wpaso-bit-apertura')).toBeVisible();
        await expect(page.getByTestId('link-abrir')).toHaveAttribute('href', /\/bitacora\/apertura/);
      }
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

// --- Candado de emisión: con el contrato sembrado (bitácora completa) el paso "Emitir" se desbloquea ---
test.describe('Ambiente bitácora — candado de emisión (art. 123 fr. III)', () => {
  test('el residente elige el contrato demo (apertura firmada) y el paso "Emitir notas" habilita el enlace', async ({ page, request }) => {
    skipEnCI();
    const login = await (await request.post(`${API}/auth/login`, { data: { email: 'residente@sigecop.test', password: PASS } })).json();
    const contratos = await (await request.get(`${API}/contratos`, { headers: { Authorization: `Bearer ${login.token}` } })).json();
    const demo = (Array.isArray(contratos) ? contratos : []).find((c) => c.folio === 'OBRA-2026-DEMO-01');
    test.skip(!demo, 'requiere el seed demo (npm run seed:demo)');

    await freshHome(page);
    await enterAppMode(page, 'residente');
    await page.goto(`http://localhost:5173${VIEW}`);
    await page.waitForLoadState('networkidle');
    await page.getByTestId('select-contrato').selectOption({ value: String(demo.id) });

    // La apertura del demo está firmada por las 3 partes → completa.
    await expect(page.getByTestId('firmas-xy')).toContainText('completa', { timeout: 10000 });
    // Paso 2 · Firma (enlace "Por firmar") y paso 3 · Emitir (sin candado, con enlace a notas).
    await page.getByTestId('wpaso-bit-firma').click();
    await expect(page.getByTestId('link-firmar')).toHaveAttribute('href', '/bitacora/por-firmar');
    await page.getByTestId('wpaso-bit-emitir').click();
    await expect(page.getByTestId('link-notas')).toBeVisible();
    await expect(page.getByTestId('candado-bit-4')).toHaveCount(0);
  });
});
