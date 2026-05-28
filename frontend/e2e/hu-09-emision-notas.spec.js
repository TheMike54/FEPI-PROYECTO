// @ts-check
// E2E HU-09 — Emisión y respuesta de notas tipificadas con firma.
//
// Cubre los checks distintivos del flujo:
//   · Folio correlativo automático BIT-XXXX.
//   · Selector de tipo con opción "Otro tipo de nota" al final que despliega
//     un input manual.
//   · Botón "Firmar" abre modal de confirmación; "Confirmar y firmar" sella la
//     parte, "Cancelar" la deja pendiente.
//   · "Emitir nota" disabled hasta tener asunto + contenido + 3 firmas.
//   · Tras emitir: la nota aparece arriba del libro con ✓ Inmutable y botón
//     "+ Crear nota vinculada" que prellena el bloque "Dice:".
//   · Fundamento arts. 122 y 125 RLOPSRM al pie.
//   · Permisos por rol.
//
// PERMISOS[HU-09]: residente/contratista/supervision='E' · dependencia=null · finanzas=null
//
// Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import {
  freshHome,
  enterAppMode,
  goToViaSidebar,
  sidebarLinkFor,
  cardInInicioFor,
  expectMetadataAcademicaOculta
} from './_helpers.js';

const VIEW_PATH = '/bitacora/notas';
const TITULO = 'Emisión y respuesta de notas tipificadas con firma';
const SPRINT = 'Sprint 2';

/** Llena asunto + contenido + las 3 firmas. Prerequisito para Emitir. */
async function llenarYFirmarTodas(page) {
  await page.getByTestId('input-asunto').fill('Asunto de prueba E2E');
  await page.getByTestId('input-contenido').fill('Contenido de prueba para el flujo de emisión.');

  for (const r of ['residente', 'supervision', 'contratista']) {
    await page.getByTestId(`btn-firmar-${r}`).click();
    await page.getByTestId('btn-confirmar-firma').click();
  }
}

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-09 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-09 + Sprint 2', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-09');
    expect(text).toContain(SPRINT);
    expect(text).toContain('notas');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-09' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
  });

  test('criterios de aceptacion: los 3 textos nuevos al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const seccion = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Criterios de aceptación' })
    });
    await expect(seccion.getByText(/incorporar también otro tipo de nota/)).toBeVisible();
    await expect(seccion.getByText(/dice \/ debe decir/)).toBeVisible();
    await expect(seccion.getByText(/folio correlativo, fecha, firma de los tres participantes/)).toBeVisible();
  });

  test('fundamento arts. 122 y 125 RLOPSRM visible al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText(/Fundamento: arts\. 122 y 125 RLOPSRM/)).toBeVisible();
  });

  // CHECK DISTINTIVO 1: folio correlativo con formato BIT-XXXX, autocalculado
  // desde el último del libro (BIT-0012 en el dummy => BIT-0013).
  test('folio asignado tiene formato BIT-XXXX (proximo al ultimo del libro)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const folio = page.getByTestId('folio-asignado');
    await expect(folio).toHaveValue(/^BIT-\d{4}$/);
    // Con el dummy actual el próximo es BIT-0013.
    await expect(folio).toHaveValue('BIT-0013');
  });

  // CHECK DISTINTIVO 2: "Otro tipo de nota" al final del select revela un input
  // manual para tipos no tipificados.
  test('seleccion "Otro tipo de nota" muestra input de tipo manual', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('input-tipo-manual')).toHaveCount(0);

    await page.getByTestId('select-tipo').selectOption('Otro tipo de nota');
    await expect(page.getByTestId('input-tipo-manual')).toBeVisible();
  });

  // CHECK DISTINTIVO 3: modal de confirmación de firma. Cancelar deja la
  // parte pendiente; Confirmar y firmar la sella con cinta verde.
  test('boton Firmar abre modal; Cancelar deja pendiente, Confirmar sella', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    // Cancelar.
    await page.getByTestId('btn-firmar-residente').click();
    await expect(page.getByTestId('modal-confirmar-firma')).toBeVisible();
    await page.getByTestId('btn-cancelar-firma').click();
    await expect(page.getByTestId('modal-confirmar-firma')).toHaveCount(0);
    // El botón sigue ahí porque no se firmó.
    await expect(page.getByTestId('btn-firmar-residente')).toBeVisible();

    // Confirmar.
    await page.getByTestId('btn-firmar-residente').click();
    await page.getByTestId('btn-confirmar-firma').click();
    // Tras firmar, el botón desaparece y aparece la cinta "✓ Firmado".
    await expect(page.getByTestId('btn-firmar-residente')).toHaveCount(0);
    await expect(
      page.locator('[data-firma-rol="residente"]').getByText(/✓ Firmado · /)
    ).toBeVisible();
  });

  // CHECK DISTINTIVO 4: "Emitir nota" queda disabled hasta tener asunto +
  // contenido + las 3 firmas presentes.
  test('Emitir nota disabled hasta tener asunto + contenido + 3 firmas', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const btnEmitir = page.getByTestId('btn-emitir');
    await expect(btnEmitir).toBeDisabled();

    await page.getByTestId('input-asunto').fill('Asunto');
    await page.getByTestId('input-contenido').fill('Contenido');
    // Falta firmar -> sigue disabled.
    await expect(btnEmitir).toBeDisabled();

    // Firmar 2 de 3 -> aún disabled.
    for (const r of ['residente', 'supervision']) {
      await page.getByTestId(`btn-firmar-${r}`).click();
      await page.getByTestId('btn-confirmar-firma').click();
    }
    await expect(btnEmitir).toBeDisabled();

    // Firmar la tercera -> enabled.
    await page.getByTestId('btn-firmar-contratista').click();
    await page.getByTestId('btn-confirmar-firma').click();
    await expect(btnEmitir).toBeEnabled();
  });

  // CHECK DISTINTIVO 5: tras Emitir, la nota nueva aparece en el libro con
  // badge "✓ Inmutable" y botón "+ Crear nota vinculada".
  test('al Emitir: nota nueva aparece en el libro con + Crear nota vinculada', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await llenarYFirmarTodas(page);
    await page.getByTestId('btn-emitir').click();

    const nueva = page.getByTestId('nota-emitida-BIT-0013');
    await expect(nueva).toBeVisible();
    await expect(nueva).toContainText('✓ Inmutable');
    await expect(page.getByTestId('btn-vincular-BIT-0013')).toBeVisible();
  });

  // CHECK DISTINTIVO 6: "Crear nota vinculada" abre el formulario con el
  // bloque "Dice:" prellenado con el contenido de la nota original.
  test('Crear nota vinculada prellena el bloque "Dice:" con la nota original', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await llenarYFirmarTodas(page);
    await page.getByTestId('btn-emitir').click();

    await page.getByTestId('btn-vincular-BIT-0013').click();

    const dice = page.getByTestId('bloque-dice');
    await expect(dice).toBeVisible();
    await expect(dice).toContainText('Dice (BIT-0013):');
    await expect(dice).toContainText('Contenido de prueba');
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Contratista / Supervisión ejecutan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-09 — modo aplicacion (${rol.alias}: ejecuta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('sidebar muestra HU-09 y la vista carga sin metadata academica', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expectMetadataAcademicaOculta(page, {
        huId: 'HU-09',
        sprintLabel: SPRINT
      });
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
  test.describe(`HU-09 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-09 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
