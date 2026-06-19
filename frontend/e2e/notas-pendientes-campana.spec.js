// @ts-check
// FIX 2.5 (Oleada 2) — campana UNIFICADA (firmas + atrasos + solicitudes) + endpoint GET /api/notas-pendientes.
// Conserva los testids del BLOQUE 4 (drop-campana, link-por-firmar, …); añade secciones por tipo.
// Login real → requiere backend+BD; se salta en CI.
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode } from './_helpers.js';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: 'Sigecop2026!' } })).json();

test.describe('FIX 2.5 — campana unificada', () => {
  test('GET /api/notas-pendientes responde una lista para el residente', async ({ request }) => {
    const R = await loginApi(request, 'residente@sigecop.test');
    const res = await request.get(`${API}/notas-pendientes`, { headers: { Authorization: `Bearer ${R.token}` } });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test('el residente ve la sección de FIRMAS en la campana', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await page.getByRole('button', { name: /Notificaciones/ }).click();
    await expect(page.getByTestId('drop-campana')).toBeVisible();
    await expect(page.getByTestId('drop-campana-firmas')).toBeVisible();
  });

  test('la dependencia ve la sección de SOLICITUDES y su enlace en la campana', async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
    await page.getByRole('button', { name: /Notificaciones/ }).click();
    await expect(page.getByTestId('drop-campana')).toBeVisible();
    await expect(page.getByTestId('drop-campana-solicitudes')).toBeVisible();
    await expect(page.getByTestId('drop-solicitudes-ir')).toBeVisible();
  });
});
