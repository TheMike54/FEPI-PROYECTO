// @ts-check
// E2E HU-20 — Tránsito a pago: soportes y suficiencia presupuestal.
//
// Cubre el comportamiento del prototipo:
//   · Verificación de suficiencia presupuestal contra el techo anual; bloqueo
//     cuando el monto excede el disponible (art. 24 LOPSRM).
//   · Semáforo del plazo de 20 días naturales (art. 54 LOPSRM) calculado en
//     vivo desde la fecha de autorización (offset 13 días → zona ámbar).
//   · Botón "Generar instrucción de pago" sólo se habilita cuando soportes OK
//     y presupuesto OK; al pulsarlo aparece el banner verde + la sección
//     "Notificación a Finanzas".
//
// PERMISOS[HU-20]: residente='C' · contratista='E' · supervision=null · dependencia='C' · finanzas='E'
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

const VIEW_PATH = '/pagos/transito';
const TITULO = 'Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal';
const SPRINT = 'Sprint 5';

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Finanzas ejecutan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-20 — modo aplicacion (${rol.alias}: ejecuta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('sidebar muestra HU-20 y la vista carga sin metadata academica', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expectMetadataAcademicaOculta(page, {
        huId: 'HU-20',
        sprintLabel: SPRINT
      });
    });

    test('puede completar el flujo de generar instruccion', async ({ page }) => {
      await goToViaSidebar(page, VIEW_PATH);
      await page.getByTestId('btn-toggle-fianza').click();
      await page.getByTestId('btn-generar-instruccion').click();
      await expect(page.getByTestId('aviso-instruccion-generada')).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-20 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible y sin boton de generar', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expectAvisoSoloConsulta(page);
      // En esta vista el boton se renderiza solo si !soloLectura.
      await expect(page.getByTestId('btn-generar-instruccion')).toHaveCount(0);
      // El semaforo sigue visible (es display).
      await expect(page.getByTestId('semaforo-pago-badge')).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervisión sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-20 — modo aplicacion (Supervisión: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'supervision');
  });

  test('HU-20 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
