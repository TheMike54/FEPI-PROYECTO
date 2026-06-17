// @ts-check
// E2E HU-18 — Portafolio ejecutivo con semáforos.
//
// REESCRITO al patrón real (sin dummy): el semáforo, el avance, los atrasos y los pendientes los
// calcula el BACKEND (GET /api/portafolio, acotado por participación). Ya no hay lógica de semáforo
// en cliente que testear unitariamente; se valida el CABLEADO real de la pantalla contra el backend.
//   · Dependencia (ven todo) ve la tabla con el contrato demo, contadores y semáforo server-side.
//   · Doble clic abre el panel de detalle (CA-2).
//   · Control "Agrupar por": Contratista / Ejercicio fiscal habilitados; "Tipo de contratación"
//     DESHABILITADO (procedimiento de adjudicación ausente en el esquema — [Nivel 1 profe]).
//   · Residente/Supervisión: vista accesible (consulta, acotada por participación; puede ir vacía).
//   · Contratista/Finanzas: sin acceso (PERMISOS[HU-18]).
//
// PERMISOS[HU-18]: residente='C' · supervision='C' · dependencia='E' · contratista/finanzas=null
//
// Requiere backend+BD (login real) → se salta en CI. Helpers: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  expectMetadataAcademicaOculta
} from './_helpers.js';

// El skip condicional va DENTRO de cada beforeEach (NO en el tope del módulo ni en un beforeEach
// de nivel de archivo: ambos lanzan en COLECCIÓN — "test.skip()/beforeEach() can only be called
// inside test/describe/fixture"). Helper local para no repetir el mensaje en cada describe.
const skipEnCI = () => test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/portafolio';
const TITULO = 'Portafolio ejecutivo';
const SPRINT = 'Sprint 9';
const FOLIO_DEMO = 'OP-2026-DEMO-001'; // contrato semilla de schema.sql (visible para dependencia)

// ---------------------------------------------------------------------------
// MODO APLICACIÓN — Dependencia ejecuta (ve todos los contratos)
// ---------------------------------------------------------------------------

test.describe('HU-18 — modo aplicacion (Dependencia: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    skipEnCI();
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
    await goToViaSidebar(page, VIEW_PATH);
  });

  test('sidebar muestra HU-18 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-18',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Dependencia'
    });
  });

  test('CA-1: la tabla lista contratos reales con semáforo server-side', async ({ page }) => {
    // Los contadores agregados están presentes.
    await expect(page.getByTestId('contador-verde')).toBeVisible();
    await expect(page.getByTestId('contador-amarillo')).toBeVisible();
    await expect(page.getByTestId('contador-rojo')).toBeVisible();
    // El contrato demo aparece con su punto de semáforo y un color válido.
    const dot = page.getByTestId(`semaforo-dot-${FOLIO_DEMO}`);
    await expect(dot).toBeVisible();
    const color = await dot.getAttribute('data-color');
    expect(['verde', 'amarillo', 'rojo']).toContain(color);
  });

  test('CA-2: doble clic abre el panel de detalle', async ({ page }) => {
    await page.getByTestId(`fila-portafolio-${FOLIO_DEMO}`).dblclick();
    await expect(page.getByTestId('panel-detalle-contrato')).toBeVisible();
    await page.getByTestId('btn-cerrar-detalle-contrato').click();
    await expect(page.getByTestId('panel-detalle-contrato')).toHaveCount(0);
  });

  test('CA-3: agrupar habilita Contratista/Ejercicio; Tipo de contratación deshabilitado', async ({ page }) => {
    const select = page.getByTestId('select-agrupar-por');
    await expect(select).toBeVisible();
    // La opción del procedimiento de adjudicación se ofrece pero deshabilitada (dato ausente).
    const opcionTipo = select.locator('option[disabled]');
    await expect(opcionTipo).toHaveCount(1);
    await expect(opcionTipo).toContainText('Tipo de contratación');
    // Agrupar por contratista crea al menos un grupo con encabezado.
    await select.selectOption('Contratista');
    await expect(page.locator('[data-testid^="grupo-"]').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACIÓN — Residente / Supervisión consultan (acceso C, acotado por participación)
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-18 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('la vista es accesible (consulta acotada por participación)', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      // Accesible: el encabezado y el control de agrupado cargan aunque su portafolio pueda ir vacío.
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expect(page.getByTestId('select-agrupar-por')).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACIÓN — Contratista / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-18 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      skipEnCI();
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-18 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
