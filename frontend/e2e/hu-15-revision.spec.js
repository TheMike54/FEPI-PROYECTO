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

const VIEW_PATH = '/estimaciones/revision';
const TITULO = 'Recepción, revisión técnica y autorización de la estimación';
const SPRINT = 'Sprint 4';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-15 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-15 + Sprint 4', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-15');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Revisión');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-15' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Supervisión y residencia')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('sección por sección')).toBeVisible();
    await expect(page.getByText('turnado secuencial')).toBeVisible();
    await expect(page.getByText('semáforo basado en la fecha real de recepción')).toBeVisible();
  });

  test('semáforo del plazo visible con etiqueta Día X de 15', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const badge = page.getByTestId('semaforo-revision-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/Día \d+ de 15/);
  });

  // CHECK DISTINTIVO 1: las 5 secciones permiten agregar observaciones con
  // tipo + severidad, y se pueden eliminar.
  test('agregar y eliminar observaciones en la sección Carátula', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await page.getByTestId('btn-agregar-obs-caratula').click();
    const obs0 = page.getByTestId('obs-caratula-0');
    await expect(obs0).toBeVisible();
    await page.getByTestId('obs-caratula-0-texto').fill('Diferencia en deducciones');
    await page.getByTestId('obs-caratula-0-tipo').selectOption('Corrección');
    await page.getByTestId('obs-caratula-0-severidad').selectOption('Mayor');

    // Agregar otra.
    await page.getByTestId('btn-agregar-obs-caratula').click();
    await expect(page.getByTestId('obs-caratula-1')).toBeVisible();

    // Eliminar la primera.
    await page.getByTestId('obs-caratula-0-eliminar').click();
    await expect(page.getByTestId('obs-caratula-1')).toHaveCount(0);
    // Tras eliminar, la que era 'obs-caratula-1' se reindexa a 'obs-caratula-0'.
    await expect(page.getByTestId('obs-caratula-0')).toBeVisible();
  });

  // CHECK DISTINTIVO 2: Turnar disabled hasta tener obs o "Sin observaciones".
  test('Turnar a residencia disabled hasta tener obs o marcar Sin observaciones', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const btnTurnar = page.getByTestId('btn-turnar');
    await expect(btnTurnar).toBeDisabled();

    // Agregar una observación → se habilita.
    await page.getByTestId('btn-agregar-obs-caratula').click();
    await expect(btnTurnar).toBeEnabled();

    // Quitar la obs → vuelve a disabled.
    await page.getByTestId('obs-caratula-0-eliminar').click();
    await expect(btnTurnar).toBeDisabled();

    // Marcar "Sin observaciones" → también habilita.
    await page.getByTestId('chk-sin-observaciones').check();
    await expect(btnTurnar).toBeEnabled();
  });

  test('Autorizar/Rechazar disabled hasta que se turne', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('btn-autorizar')).toBeDisabled();
    await expect(page.getByTestId('btn-rechazar')).toBeDisabled();
  });

  // CHECK DISTINTIVO 3: flujo completo turnar → autorizar.
  test('flujo: turnar → banner-turnada → Autorizar → banner-autorizada', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await page.getByTestId('chk-sin-observaciones').check();
    await page.getByTestId('btn-turnar').click();

    const bannerT = page.getByTestId('banner-turnada');
    await expect(bannerT).toBeVisible();
    await expect(bannerT).toContainText('Turnada a residencia');

    // Tras turnar, el botón "+ Agregar observación" se oculta (la lista pasa
    // a modo lectura). Mismo patrón que las acciones de TrabajosTerminados.
    await expect(page.getByTestId('btn-agregar-obs-caratula')).toHaveCount(0);

    // Ahora Autorizar/Rechazar se habilitan.
    await expect(page.getByTestId('btn-autorizar')).toBeEnabled();
    await expect(page.getByTestId('btn-rechazar')).toBeEnabled();

    await page.getByTestId('btn-autorizar').click();
    const bannerA = page.getByTestId('banner-autorizada');
    await expect(bannerA).toBeVisible();
    await expect(bannerA).toContainText('Estimación autorizada');

    // Panel de resolución debe ocultarse tras autorizar.
    await expect(page.getByTestId('btn-turnar')).toHaveCount(0);
  });

  test('flujo: agregar obs → turnar → Rechazar → banner-rechazada con lista', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await page.getByTestId('btn-agregar-obs-caratula').click();
    await page.getByTestId('obs-caratula-0-texto').fill('Diferencia en deducciones');
    await page.getByTestId('obs-caratula-0-tipo').selectOption('Rechazo');
    await page.getByTestId('obs-caratula-0-severidad').selectOption('Crítica');

    await page.getByTestId('btn-turnar').click();
    await expect(page.getByTestId('banner-turnada')).toBeVisible();

    await page.getByTestId('btn-rechazar').click();
    const bannerR = page.getByTestId('banner-rechazada');
    await expect(bannerR).toBeVisible();
    await expect(bannerR).toContainText('reingresada (HU-16)');
    await expect(bannerR).toContainText('Diferencia en deducciones');
    await expect(bannerR).toContainText('Rechazo');
    await expect(bannerR).toContainText('Crítica');
  });
});

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
