// @ts-check
// E2E HU-03 — Trámite de convenios modificatorios.
//
// Cubre el check distintivo de la vista: la validacion visual del 50% sobre
// monto y plazo (art. 59 vs. 59 Bis LOPSRM). El umbral configurado en
// contratoBaseModificatorios es 6,225,000 MXN y 90 dias.
//
// PERMISOS[HU-03]: dependencia='E' · residente/contratista/supervision='C' · finanzas=null
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

const VIEW_PATH = '/contratos/modificatorios';
const TITULO = 'Trámite de convenios modificatorios';
const SPRINT = 'Sprint 6';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-03 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-03 + Sprint 6', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-03');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Convenios modificatorios');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-03' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Dependencia')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('nueva versión del catálogo y del programa')).toBeVisible();
    await expect(page.getByText('histórico de versiones registra fecha, autor y motivo')).toBeVisible();
  });

  // CHECK DISTINTIVO 1: validacion visual del 50% (art. 59 vs. 59 Bis LOPSRM).
  test('validacion del 50%: alterna entre art. 59 (verde) y art. 59 Bis (amarillo)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const montoInput = page.getByTestId('cm-monto');

    // Estado inicial (monto=0, dias=0): dentro del limite — art. 59.
    await expect(page.getByTestId('cm-regimen-59')).toBeVisible();
    await expect(page.getByTestId('cm-regimen-59bis')).toHaveCount(0);

    // Sube monto por encima del umbral (6,225,000) — debe disparar 59 Bis.
    await montoInput.fill('7000000');
    await expect(page.getByTestId('cm-regimen-59bis')).toBeVisible();
    await expect(page.getByTestId('cm-regimen-59')).toHaveCount(0);

    // Baja el monto a uno dentro del limite — vuelve a 59.
    await montoInput.fill('1000000');
    await expect(page.getByTestId('cm-regimen-59')).toBeVisible();
    await expect(page.getByTestId('cm-regimen-59bis')).toHaveCount(0);
  });

  // CHECK DISTINTIVO 2: el botón "Registrar convenio modificatorio" queda
  // disabled hasta tener oficio + motivo + algún cambio concreto.
  test('Registrar disabled hasta tener oficio + motivo + cambio concreto', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const btn = page.getByTestId('btn-registrar-modificatorio');

    // Inicial: descripción tiene valor por defecto pero falta oficio y motivo.
    await expect(btn).toBeDisabled();

    await page.getByTestId('cm-oficio').fill('OFICIO-SOP-2026-0142');
    await expect(btn).toBeDisabled();

    await page.getByTestId('cm-motivo').fill('Justificación técnica del cambio');
    // Aún falta cambio concreto (monto>0 o dias>0 con el tipo "Monto").
    await expect(btn).toBeDisabled();

    await page.getByTestId('cm-monto').fill('1000000');
    await expect(btn).toBeEnabled();
  });

  // CHECK DISTINTIVO 3: al registrar aparece el banner verde, el form pasa a
  // solo lectura, y la nueva versión sube al tope del histórico.
  test('al registrar: banner verde + nueva version en historico + form bloqueado', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('cm-oficio').fill('OFICIO-SOP-2026-0142');
    await page.getByTestId('cm-motivo').fill('Ajuste por obra adicional eje 8-A');
    await page.getByTestId('cm-monto').fill('1000000');
    await page.getByTestId('btn-registrar-modificatorio').click();

    // Banner visible con el régimen aplicable.
    const aviso = page.getByTestId('aviso-modificatorio-registrado');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Modificatorio registrado');

    // Botón Registrar desaparece (form congelado).
    await expect(page.getByTestId('btn-registrar-modificatorio')).toHaveCount(0);

    // Inputs deshabilitados tras el registro.
    await expect(page.getByTestId('cm-motivo')).toBeDisabled();

    // Nueva versión local en el histórico (v4 con el dummy actual).
    await expect(page.getByTestId('historico-nueva-v4')).toBeVisible();
  });

  // CHECK DISTINTIVO 4: la sección de endosos a fianzas siempre lista las
  // pólizas de Cumplimiento (en el dummy hay 3) y agrega Anticipo/Vicios
  // ocultos según el alcance del modificatorio.
  test('seccion Endosos a fianzas: Cumplimiento siempre presente', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const tabla = page.getByTestId('tabla-endosos');
    await expect(tabla).toContainText('Cumplimiento');
    await expect(tabla).toContainText('Endoso pendiente');
  });

  test('fundamento arts. 59 y 59 Bis LOPSRM visible al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByText(/Fundamento: arts\. 59 y 59 Bis LOPSRM/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-03 — modo aplicacion (Dependencia: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
  });

  test('sidebar muestra HU-03 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-03',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Dependencia'
    });
  });

  test('form de convenio editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.locator('input[type="number"]').nth(0)).toBeEnabled();
    await expect(page.locator('input[type="number"]').nth(1)).toBeEnabled();
    await expect(page.locator('select').first()).toBeEnabled();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Contratista / Supervision consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-03 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; inputs deshabilitados', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.locator('input[type="number"]').nth(0)).toBeDisabled();
      await expect(page.locator('input[type="number"]').nth(1)).toBeDisabled();
      await expect(page.locator('select').first()).toBeDisabled();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Finanzas sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-03 — modo aplicacion (Finanzas: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'finanzas');
  });

  test('HU-03 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
