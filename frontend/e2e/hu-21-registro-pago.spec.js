// @ts-check
// E2E HU-21 — Registro del pago efectuado.
//
// Cubre los criterios literales y los checks distintivos:
//   · "Registrar pago" disabled hasta que TODOS los campos obligatorios estén
//     llenos (estimación, fecha, importe>0, referencia, observaciones).
//   · Al pulsar Registrar: banner verde data-testid="aviso-pago-registrado",
//     nueva fila data-testid="fila-pago-local" arriba de la tabla.
//   · Permisos por rol.
//
// PERMISOS[HU-21]: finanzas='E' · residente='C' · dependencia='C' · contratista=null · supervision=null
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

const VIEW_PATH = '/pagos/registro';
const TITULO = 'Registro del pago efectuado';
const SPRINT = 'Sprint 2';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-21 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-21 + Sprint 2', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-21');
    expect(text).toContain(SPRINT);
    expect(text).toContain('pago');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-21' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Finanzas')).toBeVisible();
  });

  test('criterios de aceptacion: los 2 textos literales del profe al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const seccion = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Criterios de aceptación' })
    });
    await expect(seccion.getByText('marca la estimación como pagada')).toBeVisible();
    // Texto literal exigido por el profe (empieza minúscula a propósito).
    await expect(seccion.getByText(/se encuentran todos o se encuentran los siguientes datos/)).toBeVisible();
  });

  // CHECK DISTINTIVO 1: Botón "Registrar pago" disabled si falta cualquier campo
  // obligatorio. Se prueba el estado inicial (referencia + observaciones vacías)
  // y la transición a enabled tras llenarlos todos.
  test('Registrar pago disabled hasta que TODOS los campos esten llenos', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const btn = page.getByTestId('btn-registrar-pago');

    // Inicial: referencia y observaciones vacíos -> disabled.
    await expect(btn).toBeDisabled();

    // Llenar referencia -> sigue faltando observaciones -> disabled.
    await page.getByTestId('pago-referencia').fill('SPEI-9988');
    await expect(btn).toBeDisabled();

    // Llenar observaciones -> ahora todos los campos están -> enabled.
    await page.getByTestId('pago-observaciones').fill('Pago de la estimación de mayo 2026');
    await expect(btn).toBeEnabled();

    // Vaciar el importe -> vuelve a disabled.
    await page.getByTestId('pago-importe').fill('0');
    await expect(btn).toBeDisabled();

    // Reponer importe válido -> enabled de nuevo.
    await page.getByTestId('pago-importe').fill('1,285,750.00');
    await expect(btn).toBeEnabled();
  });

  // CHECK DISTINTIVO 2: al pulsar Registrar aparece el banner verde y la fila
  // del pago nuevo sube al tope de la tabla.
  test('al registrar: banner verde + fila nueva arriba en la tabla', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await page.getByTestId('pago-referencia').fill('SPEI-9988');
    await page.getByTestId('pago-observaciones').fill('Pago de la estimación de mayo 2026');

    const filasAntes = await page.getByTestId('tabla-pagos').locator('tbody tr').count();

    await page.getByTestId('btn-registrar-pago').click();

    // Banner verde con el folio y la fecha legible.
    const aviso = page.getByTestId('aviso-pago-registrado');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Pago registrado');
    await expect(aviso).toContainText('marcada como');

    // Fila local marcada en verde, arriba de la tabla.
    const filaLocal = page.getByTestId('fila-pago-local').first();
    await expect(filaLocal).toBeVisible();
    await expect(filaLocal).toContainText('SPEI-9988');
    await expect(filaLocal).toContainText('Pagada');

    // Total de filas creció en 1.
    await expect(page.getByTestId('tabla-pagos').locator('tbody tr')).toHaveCount(filasAntes + 1);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-21 — modo aplicacion (Finanzas: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('sidebar muestra HU-21 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-21',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Finanzas'
    });
  });

  test('formulario editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('pago-referencia')).toBeEnabled();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-21 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; inputs deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.getByTestId('pago-referencia')).toBeDisabled();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervision sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-21 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-21 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
