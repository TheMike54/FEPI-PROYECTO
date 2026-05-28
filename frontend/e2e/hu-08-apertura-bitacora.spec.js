// @ts-check
// E2E HU-08 — Apertura formal de la bitácora.
//
// Cubre los 3 criterios nuevos (textos exactos al pie) y los checks
// distintivos del flujo de apertura:
//   · Botón "Firmar" en cada parte sella el estado firmado + cinta verde.
//   · Checkbox "No aplica" en Parte 2 (supervisor externo) libera el requisito.
//   · "Aperturar bitácora" queda deshabilitado mientras falte una firma o una
//     fecha; al pulsarlo aparece data-testid="aviso-aperturada" y la región
//     completa queda deshabilitada.
//   · Fundamento art. 122 RLOPSRM visible al pie.
// Más permisos por rol.
//
// PERMISOS[HU-08]: residente='E' · contratista='C' · supervision='C' · dependencia=null · finanzas=null
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

const VIEW_PATH = '/bitacora/apertura';
const TITULO = 'Apertura formal de la bitácora del contrato';
const SPRINT = 'Sprint 1';

/** Card de una parte (1, 2 ó 3) — ancla por atributo data-parte. */
function parteCard(page, num) {
  return page.locator(`[data-parte="${num}"]`);
}

/** Firma las 3 partes en orden (1, 2, 3). Helper de prerequisito para los
 *  tests del flujo de apertura. */
async function firmarTodas(page) {
  await page.getByTestId('btn-firmar-1').click();
  await page.getByTestId('btn-firmar-2').click();
  await page.getByTestId('btn-firmar-3').click();
}

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-08 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-08 + Sprint 1', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-08');
    expect(text).toContain(SPRINT);
    expect(text).toContain('bitácora');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-08' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
  });

  test('criterios de aceptacion: los 3 textos nuevos visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    // Acotamos las búsquedas a la <section> de criterios para que los snippets
    // no choquen con labels o el aviso ámbar (varios textos del criterio se
    // repiten en otras partes de la vista — p.ej. "fecha de entrega del sitio"
    // aparece en el label del input de fecha).
    const seccion = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Criterios de aceptación' })
    });
    await expect(seccion.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(seccion.getByText('tres partes ligadas y sus firmantes autorizados')).toBeVisible();
    await expect(seccion.getByText('fecha de entrega del sitio')).toBeVisible();
    await expect(seccion.getByText('identificación del contrato, objeto, datos financieros')).toBeVisible();
  });

  test('fundamento art. 122 RLOPSRM visible al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText(/Fundamento: art\. 122 RLOPSRM/)).toBeVisible();
  });

  // CHECK DISTINTIVO 1: botón Firmar sella el estado de la parte (cinta verde
  // con "✓ Firmado · {fecha}" reemplaza al botón).
  test('boton Firmar sella estado firmado + cinta verde', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const btn1 = page.getByTestId('btn-firmar-1');
    await expect(btn1).toBeVisible();
    await expect(btn1).toBeEnabled();

    await btn1.click();

    // El botón desaparece y aparece la cinta "✓ Firmado · {fecha}" en su lugar.
    await expect(page.getByTestId('btn-firmar-1')).toHaveCount(0);
    await expect(parteCard(page, 1).getByText(/✓ Firmado · /)).toBeVisible();
  });

  // CHECK DISTINTIVO 2: checkbox "No aplica" en la Parte 2 libera el requisito
  // de firma para esa parte y habilita "Aperturar" con sólo 1 + 3 firmadas.
  test('checkbox No aplica en Parte 2 libera el requisito de firma', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const btnAperturar = page.getByTestId('btn-aperturar');
    const card2 = parteCard(page, 2);

    // Firmar sólo 1 y 3 — la 2 sigue pendiente, así que Aperturar queda disabled.
    await page.getByTestId('btn-firmar-1').click();
    await page.getByTestId('btn-firmar-3').click();
    await expect(btnAperturar).toBeDisabled();

    // Marcar "No aplica" en Parte 2 (único checkbox de la card).
    await card2.getByRole('checkbox').check();

    // Badge "No aplica" visible y Aperturar habilitado sin necesidad de firmar la 2.
    await expect(card2.getByText('No aplica', { exact: true })).toBeVisible();
    await expect(card2.getByTestId('btn-firmar-2')).toBeDisabled();
    await expect(btnAperturar).toBeEnabled();
  });

  // CHECK DISTINTIVO 3: "Aperturar" queda disabled mientras falte una firma.
  test('Aperturar bitacora deshabilitado mientras falte firmar', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const btnAperturar = page.getByTestId('btn-aperturar');

    // Sin firmas — disabled.
    await expect(btnAperturar).toBeDisabled();

    // Sólo 1 firmada — sigue disabled.
    await page.getByTestId('btn-firmar-1').click();
    await expect(btnAperturar).toBeDisabled();

    // 1 + 3 firmadas, 2 pendiente — sigue disabled.
    await page.getByTestId('btn-firmar-3').click();
    await expect(btnAperturar).toBeDisabled();

    // Las 3 firmadas — habilitado.
    await page.getByTestId('btn-firmar-2').click();
    await expect(btnAperturar).toBeEnabled();
  });

  // CHECK DISTINTIVO 4: "Aperturar" queda disabled si falta una fecha
  // obligatoria, aunque las 3 firmas estén presentes.
  test('Aperturar bitacora deshabilitado mientras falte fecha', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await firmarTodas(page);

    const btnAperturar = page.getByTestId('btn-aperturar');
    await expect(btnAperturar).toBeEnabled();

    // Vaciar la fecha de apertura → vuelve a disabled.
    const fecha = page.getByTestId('input-fecha-apertura');
    await fecha.fill('');
    await expect(btnAperturar).toBeDisabled();

    // Reponer una fecha válida → habilitado de nuevo.
    await fecha.fill('2026-06-01');
    await expect(btnAperturar).toBeEnabled();
  });

  // CHECK DISTINTIVO 5: al pulsar Aperturar aparece el banner aperturada,
  // el botón desaparece y la región completa queda deshabilitada.
  test('al pulsar Aperturar aparece banner y la region queda deshabilitada', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await firmarTodas(page);

    const btnAperturar = page.getByTestId('btn-aperturar');
    await expect(btnAperturar).toBeEnabled();
    await btnAperturar.click();

    // Banner verde visible — evento formal registrado.
    const aviso = page.getByTestId('aviso-aperturada');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Bitácora aperturada');

    // El botón Aperturar desaparece tras la apertura.
    await expect(page.getByTestId('btn-aperturar')).toHaveCount(0);

    // Las fechas pasan a disabled (la región queda inalterable).
    await expect(page.getByTestId('input-fecha-apertura')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-08 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-08 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-08',
      sprintLabel: SPRINT
    });
  });

  test('botones Firmar habilitados; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('btn-firmar-1')).toBeEnabled();
    await expect(page.getByTestId('btn-firmar-2')).toBeEnabled();
    await expect(page.getByTestId('btn-firmar-3')).toBeEnabled();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervision consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-08 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; botones Firmar deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.getByTestId('btn-firmar-1')).toBeDisabled();
      await expect(page.getByTestId('btn-firmar-3')).toBeDisabled();
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
  test.describe(`HU-08 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-08 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
