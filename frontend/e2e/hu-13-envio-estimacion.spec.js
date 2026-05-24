// @ts-check
// E2E HU-13 — Envío de la estimación.
//
// Cubre el check distintivo de la vista: la validacion temporal del art. 54
// LOPSRM (6 dias naturales para presentar la estimacion desde la fecha de
// corte). El control "Dias transcurridos" tiene un default de 3 (dentro de
// plazo); pasarlo a >6 dispara el aviso rojo y bloquea el envio.
//
// PERMISOS[HU-13]: contratista='E' · residente/supervision='C' · dependencia/finanzas=null
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

const VIEW_PATH = '/estimaciones/envio';
const TITULO = 'Envío de la estimación';
const SPRINT = 'Sprint 8';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-13 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-13 + Sprint 8', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-13');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Envío de la estimación');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-13' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Contratista')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('queda registrada la fecha y hora exacta')).toBeVisible();
    await expect(page.getByText('vencen los 6 días naturales del periodo de presentación')).toBeVisible();
  });

  // CHECK DISTINTIVO: validacion temporal del art. 54 LOPSRM (6 dias).
  test('validacion temporal: alterna entre dentro y fuera del plazo de 6 dias', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    // El unico input numerico de la vista es el de "Dias transcurridos"
    // (fecha de corte es text + readOnly).
    const dias = page.locator('input[type="number"]').first();
    const btnEnviar = page.getByRole('button', { name: 'Enviar estimación' });

    // Estado inicial (diasDefault=3): dentro de plazo, boton habilitado.
    await expect(page.getByText('Dentro del periodo de presentación')).toBeVisible();
    await expect(page.getByText('Venció el periodo de presentación')).toHaveCount(0);
    await expect(btnEnviar).toBeEnabled();

    // Pasarse del plazo: 8 > 6.
    await dias.fill('8');
    await expect(page.getByText('Venció el periodo de presentación')).toBeVisible();
    await expect(page.getByText('Dentro del periodo de presentación')).toHaveCount(0);
    await expect(btnEnviar).toBeDisabled();

    // Volver dentro del plazo.
    await dias.fill('3');
    await expect(page.getByText('Dentro del periodo de presentación')).toBeVisible();
    await expect(btnEnviar).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-13 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-13 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-13',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });

  test('control de dias editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.locator('input[type="number"]').first()).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Enviar estimación' })).toBeVisible();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Supervision consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-13 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; control de dias deshabilitado', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.locator('input[type="number"]').first()).toBeDisabled();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-13 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-13 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
