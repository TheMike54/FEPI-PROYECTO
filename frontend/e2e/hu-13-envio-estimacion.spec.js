// @ts-check
// E2E HU-13 — Envío de la estimación.
//
// Cubre dos checks distintivos:
//   1. Validación temporal del art. 54 LOPSRM (6 días desde la fecha de corte):
//      el control "Días transcurridos" tiene un default de 3 (dentro de plazo);
//      pasarlo a >6 dispara el aviso rojo y bloquea el envío.
//   2. Flujo de envío del prototipo: al pulsar "Enviar estimación" se
//      establece el estado "Enviada" inalterable. Aparecen:
//        · banner data-testid="aviso-estimacion-enviada" con fecha+hora y
//          mención al plazo de revisión de 15 días.
//        · contador "Plazo de revisión: día 0 de 15".
//        · sección "Notificaciones enviadas" con residencia y supervisión.
//        · el botón Enviar desaparece y los inputs quedan disabled.
//
// PERMISOS[HU-13]: contratista='E' · residente/supervision='C' · dependencia/finanzas=null
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

const VIEW_PATH = '/estimaciones/envio';
const TITULO = 'Envío de la estimación';
const SPRINT = 'Sprint 8';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-13 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-13 + Sprint 8', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-13');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Envío de la estimación');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-13' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Contratista')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('quedan registradas la fecha y hora exacta')).toBeVisible();
    await expect(page.getByText('vencen los 6 días naturales del periodo de presentación')).toBeVisible();
    await expect(page.getByText('inicia automáticamente el plazo de revisión de 15 días')).toBeVisible();
    await expect(page.getByText(/Fundamento: art\. 54 LOPSRM/)).toBeVisible();
  });

  // CHECK DISTINTIVO 1: validación temporal del art. 54 LOPSRM (6 días).
  test('validacion temporal: alterna entre dentro y fuera del plazo de 6 dias', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const dias = page.getByTestId('ee-dias');
    const btn = page.getByTestId('btn-enviar-estimacion');

    // Estado inicial (diasDefault=3): dentro de plazo, botón habilitado.
    await expect(page.getByText('Dentro del periodo de presentación')).toBeVisible();
    await expect(page.getByText('Venció el periodo de presentación')).toHaveCount(0);
    await expect(btn).toBeEnabled();

    // Pasarse del plazo: 8 > 6.
    await dias.fill('8');
    await expect(page.getByText('Venció el periodo de presentación')).toBeVisible();
    await expect(page.getByText('Dentro del periodo de presentación')).toHaveCount(0);
    await expect(btn).toBeDisabled();

    // Volver dentro del plazo.
    await dias.fill('3');
    await expect(page.getByText('Dentro del periodo de presentación')).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  // CHECK DISTINTIVO 2: al enviar, banner + contador + notificaciones + lock
  // total. El estado "Enviada" es inalterable.
  test('al enviar: banner, contador de plazo, notificaciones, inputs disabled', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await page.getByTestId('btn-enviar-estimacion').click();

    // Banner del envío.
    const banner = page.getByTestId('aviso-estimacion-enviada');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Estimación enviada');
    await expect(banner).toContainText('Notificación formal entregada a residencia y supervisión');
    await expect(banner).toContainText('15 días naturales');
    await expect(banner).toContainText('art. 54 LOPSRM');

    // Contador del plazo de revisión arranca en día 0 de 15.
    const contador = page.getByTestId('contador-plazo-revision');
    await expect(contador).toBeVisible();
    await expect(contador).toContainText('Plazo de revisión: día 0 de 15');

    // Notificaciones enviadas: residencia + supervisión con nombres concretos.
    const notif = page.getByTestId('notificaciones-enviadas');
    await expect(notif).toBeVisible();
    await expect(notif).toContainText('Residencia');
    await expect(notif).toContainText('Ing. Carlos Hernández García');
    await expect(notif).toContainText('Supervisión');
    await expect(notif).toContainText('Ing. Roberto López');

    // Botón Enviar ya no se renderiza.
    await expect(page.getByTestId('btn-enviar-estimacion')).toHaveCount(0);

    // Los inputs quedan disabled (RegionEditable disabled=true por enviado).
    await expect(page.getByTestId('ee-dias')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-13 — modo aplicacion (Contratista: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'contratista');
  });

  test('sidebar muestra HU-13 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-13',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Contratista'
    });
  });

  test('control de dias editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('ee-dias')).toBeEnabled();
    await expect(page.getByTestId('btn-enviar-estimacion')).toBeVisible();
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
  test.describe(`HU-13 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; control de dias deshabilitado', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.getByTestId('ee-dias')).toBeDisabled();
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
  test.describe(`HU-13 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-13 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
