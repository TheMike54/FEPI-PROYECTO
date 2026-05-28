// @ts-check
// E2E HU-07 — Configuración de alertas de atraso.
//
// Cubre el comportamiento del prototipo:
//   · El botón "Crear alerta" está disabled hasta que concepto + umbral (1-100)
//     + canal (radio Sistema/Correo) están completos.
//   · Al crear, la alerta se inserta arriba de la tabla con folio correlativo
//     A-NNN, badge "Activa" y fila con fondo verde.
//   · Pausar/Reanudar alterna el badge sin tocar las demás filas.
//   · Eliminar pide confirm() y quita la fila.
//   · La sección "Alertas disparadas" lee el avance simulado del concepto y
//     muestra una entrada por cada alerta activa con avance < umbral.
//
// PERMISOS[HU-07]: residente='E' · supervision='C' · contratista/dependencia/finanzas=null
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

const VIEW_PATH = '/seguimiento/alertas';
const TITULO = 'Configuración de alertas de atraso';
const SPRINT = 'Sprint 6';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-07 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-07 + Sprint 6', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-07');
    expect(text).toContain(SPRINT);
    expect(text).toContain('alertas');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-07' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Residente')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('Se pueden crear, pausar y eliminar alertas por concepto')).toBeVisible();
    await expect(page.getByText('solo dispara cuando el avance real es menor al umbral')).toBeVisible();
    await expect(page.getByText('por el canal elegido al configurar')).toBeVisible();
  });

  // CHECK DISTINTIVO 1: el botón "Crear alerta" queda disabled hasta tener
  // concepto + umbral válido + canal seleccionados.
  test('Crear alerta disabled hasta tener concepto + umbral + canal', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const btn = page.getByTestId('btn-crear-alerta');

    // Inicial: todo vacío → disabled.
    await expect(btn).toBeDisabled();

    // Solo concepto: sigue disabled.
    await page.getByTestId('al-concepto').selectOption('Albañilería');
    await expect(btn).toBeDisabled();

    // Concepto + umbral fuera de rango (0): sigue disabled.
    await page.getByTestId('al-umbral').fill('0');
    await expect(btn).toBeDisabled();

    // Umbral válido pero sin canal: sigue disabled.
    await page.getByTestId('al-umbral').fill('60');
    await expect(btn).toBeDisabled();

    // Con canal: habilitado.
    await page.getByTestId('al-canal-correo').check();
    await expect(btn).toBeEnabled();

    // Umbral fuera de rango (101): vuelve a disabled.
    await page.getByTestId('al-umbral').fill('101');
    await expect(btn).toBeDisabled();
  });

  // CHECK DISTINTIVO 2: al crear, la alerta se inserta arriba con folio A-NNN
  // correlativo, fondo verde y badge "Activa".
  test('al crear: nueva alerta arriba con folio A-004 y badge Activa', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    // El dummy trae 3 alertas (A-001..A-003); la nueva debe ser A-004.
    await page.getByTestId('al-concepto').selectOption('Albañilería');
    await page.getByTestId('al-umbral').fill('60');
    await page.getByTestId('al-canal-correo').check();
    await page.getByTestId('btn-crear-alerta').click();

    const nueva = page.getByTestId('alerta-A-004');
    await expect(nueva).toBeVisible();
    await expect(nueva).toContainText('Albañilería');
    await expect(nueva).toContainText('< 60%');
    await expect(nueva).toContainText('Correo');
    await expect(nueva).toContainText('Activa');

    // Debe estar en la primera fila del tbody.
    const filas = page.locator('[data-testid="tabla-alertas"] tbody tr');
    await expect(filas.first()).toHaveAttribute('data-testid', 'alerta-A-004');

    // El formulario se limpia tras crear.
    await expect(page.getByTestId('btn-crear-alerta')).toBeDisabled();
  });

  test('Pausar/Reanudar alterna el badge sin tocar las demás', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    // A-001 (Cimentación) viene Activa → debe ofrecer "Pausar".
    const filaA1 = page.getByTestId('alerta-A-001');
    await expect(filaA1).toContainText('Activa');
    await page.getByTestId('btn-pausar-A-001').click();
    await expect(filaA1).toContainText('Pausada');

    // La otra activa (A-002) debe seguir Activa.
    await expect(page.getByTestId('alerta-A-002')).toContainText('Activa');

    // Reanudar A-001 → vuelve a Activa.
    await page.getByTestId('btn-reanudar-A-001').click();
    await expect(filaA1).toContainText('Activa');
  });

  test('Eliminar con confirm() quita la fila', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    page.on('dialog', (d) => d.accept());

    await page.getByTestId('btn-eliminar-A-001').click();
    await expect(page.getByTestId('alerta-A-001')).toHaveCount(0);
    // Las otras filas siguen ahí.
    await expect(page.getByTestId('alerta-A-002')).toBeVisible();
    await expect(page.getByTestId('alerta-A-003')).toBeVisible();
  });

  test('Cancelar el confirm() conserva la fila', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    page.on('dialog', (d) => d.dismiss());

    await page.getByTestId('btn-eliminar-A-002').click();
    await expect(page.getByTestId('alerta-A-002')).toBeVisible();
  });

  // CHECK DISTINTIVO 3: "Alertas disparadas" lee el avance simulado y compara
  // contra el umbral. Con el dummy:
  //   A-001 Cimentación umbral 80, avance 65 → DISPARA
  //   A-002 Estructura  umbral 90, avance 50 → DISPARA
  //   A-003 Instalaciones umbral 75 → Pausada, no se evalúa.
  test('Alertas disparadas: timeline simulado refleja avance < umbral', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    const lista = page.getByTestId('lista-disparadas');
    await expect(lista).toBeVisible();

    await expect(page.getByTestId('disparada-A-001')).toContainText('Cimentación');
    await expect(page.getByTestId('disparada-A-001')).toContainText('65%');
    await expect(page.getByTestId('disparada-A-001')).toContainText('umbral 80%');
    await expect(page.getByTestId('disparada-A-001')).toContainText('Correo');

    await expect(page.getByTestId('disparada-A-002')).toContainText('Estructura');
    await expect(page.getByTestId('disparada-A-002')).toContainText('50%');
    await expect(page.getByTestId('disparada-A-002')).toContainText('Sistema');

    // La pausada (A-003) NO debe aparecer en el timeline.
    await expect(page.getByTestId('disparada-A-003')).toHaveCount(0);
  });

  test('al pausar una alerta activa, sale del timeline de disparadas', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('disparada-A-001')).toBeVisible();

    await page.getByTestId('btn-pausar-A-001').click();
    await expect(page.getByTestId('disparada-A-001')).toHaveCount(0);
    // Las demás siguen.
    await expect(page.getByTestId('disparada-A-002')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-07 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
  });

  test('sidebar muestra HU-07 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-07',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Residente'
    });
  });

  test('formulario editable; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('al-concepto')).toBeEnabled();
    await expect(page.getByTestId('btn-crear-alerta')).toBeVisible();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervisión consulta
// ---------------------------------------------------------------------------

test.describe('HU-07 — modo aplicacion (Supervisión: consulta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'supervision');
  });

  test('aviso de solo consulta visible; formulario deshabilitado', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);

    await expectAvisoSoloConsulta(page);
    await expect(page.getByTestId('al-concepto')).toBeDisabled();
    await expect(page.getByTestId('al-umbral')).toBeDisabled();
    // El botón de crear no se renderiza en lectura.
    await expect(page.getByTestId('btn-crear-alerta')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Dependencia / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'dependencia', alias: 'Dependencia' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-07 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-07 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
