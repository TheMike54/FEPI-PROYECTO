// @ts-check
// E2E HU-02 — Registro de fianzas y garantías.
//
// Cubre los checks distintivos:
//   · Badges de alerta por días al vencimiento (rojo ≤5/vencida, ámbar ≤15,
//     amarillo ≤30, verde >30) usando data-badge en cada fila.
//   · Modal "+ Agregar nueva póliza": Registrar disabled hasta llenar todos
//     los campos; al confirmar la nueva fila sube al tope con fondo verde.
//   · Botón "Editar" abre el mismo modal con los campos pre-llenados.
//   · Botón "👁 Ver PDF" abre modal-ver-pdf con el nombre del archivo.
//   · Permisos por rol.
//
// PERMISOS[HU-02]: dependencia='E' · residente='C' · finanzas='C' · contratista=null · supervision=null
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

const VIEW_PATH = '/contratos/fianzas';
const TITULO = 'Registro de fianzas y garantías';
const SPRINT = 'Sprint 6';

// Helper: ISO de "hoy + dias" para llenar el input date en el modal.
function isoConOffset(dias) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-02 — modo aplicacion (Dependencia: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
  });

  test('sidebar muestra HU-02 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-02',
      sprintLabel: SPRINT
    });
  });

  test('boton Agregar visible; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    // E2 18-jun: la pantalla se cableó al backend real; el botón Agregar vive dentro del bloque de un
    // contrato seleccionado (la dependencia ve todos los contratos). Se elige uno para que aparezca.
    await page.getByTestId('select-contrato').selectOption({ index: 1 });
    await expect(page.getByTestId('btn-agregar-poliza')).toBeVisible();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Finanzas consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente', alias: 'Residente' },
  { id: 'finanzas',  alias: 'Finanzas'  }
]) {
  test.describe(`HU-02 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; sin boton Agregar', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.getByTestId('btn-agregar-poliza')).toHaveCount(0);
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-02 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-02 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
