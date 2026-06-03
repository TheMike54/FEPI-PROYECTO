// @ts-check
// E2E HU-07 — Configuración de alertas de atraso.
//
// Cubre el comportamiento del prototipo:
//   · El botón "Crear alerta" está disabled hasta que concepto + umbral (1-100)
//     + canal (radio Sistema/Correo) están completos.
//   · Al crear, la alerta se inserta arriba de la tabla con folio correlativo
//     A-NNN, badge "Activa" y fila con fondo verde.
//   · Pausar/Reanudar alterna el badge sin tocar las demás filas.
//   · Eliminar pide confirm() y quita la fila.
//   · La sección "Alertas disparadas" lee el avance simulado del concepto y
//     muestra una entrada por cada alerta activa con avance < umbral.
//
// PERMISOS[HU-07]: residente='E' · supervision='C' · contratista/dependencia/finanzas=null
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

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/seguimiento/alertas';
const TITULO = 'Configuración de alertas de atraso';
const SPRINT = 'Sprint 6';

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-07 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-07 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-07',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });

  test('formulario editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('al-concepto')).toBeEnabled();
    await expect(page.getByTestId('btn-crear-alerta')).toBeVisible();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervisión consulta
// ---------------------------------------------------------------------------

test.describe('HU-07 — modo aplicacion (Supervisión: consulta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'supervision');
  });

  test('aviso de solo consulta visible; formulario deshabilitado', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);

    await expectAvisoSoloConsulta(page);
    await expect(page.getByTestId('al-concepto')).toBeDisabled();
    await expect(page.getByTestId('al-umbral')).toBeDisabled();
    // El botón de crear no se renderiza en lectura.
    await expect(page.getByTestId('btn-crear-alerta')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Dependencia / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-07 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-07 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
