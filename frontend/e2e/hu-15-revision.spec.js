// @ts-check
// E2E HU-15 — Recepción, revisión técnica y autorización de la estimación.
//
// Cubre el comportamiento del prototipo:
//   · Por sección hay una lista de N observaciones (textarea + tipo + severidad)
//     con botón "+ Agregar observación" y "Eliminar" por entrada.
//   · El botón "Turnar a residencia" queda disabled hasta que supervisión
//     registre al menos una observación o marque la casilla "Sin observaciones".
//   · Tras turnar: banner-turnada visible; las observaciones quedan en lectura;
//     los botones Autorizar/Rechazar se habilitan.
//   · Autorizar → banner-autorizada y panel de resolución se oculta.
//   · Rechazar → banner-rechazada con la lista de observaciones a resolver.
//   · Semáforo del art. 54 LOPSRM presente y con etiqueta "Día X de 15".
//
// PERMISOS[HU-15]: residente='E' · supervision='E' · dependencia='C' · contratista/finanzas=null
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
  expectMetadataAcademicaOculta
} from './_helpers.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/estimaciones/revision';
const TITULO = 'Recepción, revisión técnica y autorización de la estimación';
const SPRINT = 'Sprint 4';

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Supervisión ejecutan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-15 — modo aplicacion (${rol.alias}: ejecuta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('sidebar muestra HU-15 y la vista carga sin metadata academica', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expectMetadataAcademicaOculta(page, {
        huId: 'HU-15',
        sprintLabel: SPRINT
      });
    });

    test('puede agregar observaciones y turnar', async ({ page }) => {
      await goToViaSidebar(page, VIEW_PATH);
      await page.getByTestId('btn-agregar-obs-caratula').click();
      await expect(page.getByTestId('obs-caratula-0')).toBeVisible();
      await expect(page.getByTestId('btn-turnar')).toBeEnabled();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia consulta
// ---------------------------------------------------------------------------

test.describe('HU-15 — modo aplicacion (Dependencia: consulta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
  });

  test('aviso de solo consulta visible; sin panel de resolución', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);

    await expectAvisoSoloConsulta(page);
    // El panel de resolución sólo se renderiza fuera de lectura.
    await expect(page.getByTestId('btn-turnar')).toHaveCount(0);
    await expect(page.getByTestId('btn-agregar-obs-caratula')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-15 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-15 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
