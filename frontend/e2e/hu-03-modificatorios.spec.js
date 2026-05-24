// @ts-check
// E2E HU-03 — Trámite de convenios modificatorios.
//
// Cubre el check distintivo de la vista: la validacion visual del 50% sobre
// monto y plazo (art. 59 vs. 59 Bis LOPSRM). El umbral configurado en
// contratoBaseModificatorios es 6,225,000 MXN y 90 dias.
//
// PERMISOS[HU-03]: dependencia='E' · residente/contratista/supervision='C' · finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  cardInInicioFor,
  expectAvisoSoloConsulta,
  expectSinAvisoSoloConsulta,
  expectMetadataAcademicaOculta
} from './_helpers.js';

const VIEW_PATH = '/contratos/modificatorios';
const TITULO = 'Trámite de convenios modificatorios';
const SPRINT = 'Sprint 6';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-03 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-03 + Sprint 6', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-03');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Convenios modificatorios');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-03' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Dependencia')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('nueva versión del catálogo y del programa')).toBeVisible();
    await expect(page.getByText('histórico de versiones registra fecha, autor y motivo')).toBeVisible();
  });

  // CHECK DISTINTIVO: validacion visual del 50% (art. 59 vs. 59 Bis LOPSRM).
  test('validacion del 50%: alterna entre art. 59 (verde) y art. 59 Bis (amarillo)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const montoInput = page.locator('input[type="number"]').nth(0);

    // Estado inicial (monto=0, dias=0): dentro del limite — art. 59.
    await expect(page.getByText('dentro del límite ordinario del art. 59 LOPSRM')).toBeVisible();
    await expect(page.getByText('supera el 50%')).toHaveCount(0);

    // Sube monto por encima del umbral (6,225,000) — debe disparar 59 Bis.
    await montoInput.fill('7000000');
    await expect(page.getByText('supera el 50%')).toBeVisible();
    await expect(page.getByText('art. 59 Bis')).toBeVisible();
    await expect(page.getByText('dentro del límite ordinario del art. 59 LOPSRM')).toHaveCount(0);

    // Baja el monto a uno dentro del limite — vuelve a 59.
    await montoInput.fill('1000000');
    await expect(page.getByText('dentro del límite ordinario del art. 59 LOPSRM')).toBeVisible();
    await expect(page.getByText('supera el 50%')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-03 — modo aplicacion (Dependencia: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
  });

  test('sidebar muestra HU-03 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-03',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Dependencia'
    });
  });

  test('form de convenio editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.locator('input[type="number"]').nth(0)).toBeEnabled();
    await expect(page.locator('input[type="number"]').nth(1)).toBeEnabled();
    await expect(page.locator('select').first()).toBeEnabled();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Contratista / Supervision consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-03 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; inputs deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.locator('input[type="number"]').nth(0)).toBeDisabled();
      await expect(page.locator('input[type="number"]').nth(1)).toBeDisabled();
      await expect(page.locator('select').first()).toBeDisabled();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-03 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-03 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
