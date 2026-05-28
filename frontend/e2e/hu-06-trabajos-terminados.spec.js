// @ts-check
// E2E HU-06 — Registro de trabajos terminados.
//
// Cubre el check distintivo de la vista: la validacion de exceso por concepto
// (acumulado previo + capturado > contratada). Excavacion en el dummy tiene
// contratada=1000 y acumPrevio=600, asi que 500 dispara el exceso (1100>1000)
// y 100 lo mantiene dentro de rango (700<=1000).
//
// PERMISOS[HU-06]: contratista='E' · residente/supervision='C' · dependencia/finanzas=null
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

const VIEW_PATH = '/seguimiento/trabajos-terminados';
const TITULO = 'Registro de trabajos terminados';
const SPRINT = 'Sprint 7';

/** Devuelve el input "Este periodo" de la fila cuyo primer td contiene `concepto`. */
function inputDeFila(page, concepto) {
  return page.locator('tr', { hasText: concepto }).locator('input[type="number"]');
}

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-06 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-06 + Sprint 7', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-06');
    expect(text).toContain(SPRINT);
    expect(text).toContain('trabajos terminados');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-06' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Contratista')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('ligada al concepto del catálogo')).toBeVisible();
    await expect(page.getByText('bloquea el registro cuando la cantidad acumulada excede')).toBeVisible();
  });

  // CHECK DISTINTIVO 1: el botón Guardar queda disabled hasta tener al menos
  // una cantidad capturada con nota seleccionada y sin exceso.
  test('Guardar disabled: requiere cantidad + nota + sin exceso', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const cap = inputDeFila(page, 'Excavación');
    const btn = page.getByTestId('btn-guardar-avance');

    // Inicial: 0 capturado, nota placeholder → disabled.
    await expect(btn).toBeDisabled();

    // 500 sobre acumPrevio=600 → 1100 > 1000 → exceso, sigue disabled.
    await cap.fill('500');
    await expect(page.getByText(/La cantidad acumulada excede la contratada/)).toBeVisible();
    await expect(btn).toBeDisabled();

    // 100 sobre 600 → 700, sin exceso, falta nota → aviso amarillo y disabled.
    await cap.fill('100');
    await expect(page.getByText(/Falta seleccionar la nota/)).toBeVisible();
    await expect(btn).toBeDisabled();

    // Seleccionar nota válida → habilitado.
    const notaSel = page.locator('tr', { hasText: 'Excavación' }).locator('select');
    await notaSel.selectOption({ index: 1 });
    await expect(btn).toBeEnabled();
  });

  // CHECK DISTINTIVO 2: al guardar aparece el banner verde y el botón
  // desaparece (el periodo queda en lectura).
  test('al guardar: aviso-avance-guardado visible y boton oculto', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await inputDeFila(page, 'Excavación').fill('100');
    await page
      .locator('tr', { hasText: 'Excavación' })
      .locator('select')
      .selectOption({ index: 1 });

    await page.getByTestId('btn-guardar-avance').click();

    const aviso = page.getByTestId('aviso-avance-guardado');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Avance del periodo Mayo 2026 guardado');

    await expect(page.getByTestId('btn-guardar-avance')).toHaveCount(0);
  });

  test('fundamento art. 118 RLOPSRM visible al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText(/Fundamento: art\. 118 RLOPSRM/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-06 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-06 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-06',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });

  test('tabla editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(inputDeFila(page, 'Excavación')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Guardar avance del periodo' })).toBeVisible();
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
  test.describe(`HU-06 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; inputs deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(inputDeFila(page, 'Excavación')).toBeDisabled();
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
  test.describe(`HU-06 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-06 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
