// @ts-check
// E2E HU-02 — Registro de fianzas y garantías.
//
// Cubre los checks distintivos:
//   · Badges de alerta por días al vencimiento (rojo ≤5/vencida, ámbar ≤15,
//     amarillo ≤30, verde >30) usando data-badge en cada fila.
//   · Modal "+ Agregar nueva póliza": Registrar disabled hasta llenar todos
//     los campos; al confirmar la nueva fila sube al tope con fondo verde.
//   · Botón "Editar" abre el mismo modal con los campos pre-llenados.
//   · Botón "👁 Ver PDF" abre modal-ver-pdf con el nombre del archivo.
//   · Permisos por rol.
//
// PERMISOS[HU-02]: dependencia='E' · residente='C' · finanzas='C' · contratista=null · supervision=null
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

const VIEW_PATH = '/contratos/fianzas';
const TITULO = 'Registro de fianzas y garantías';
const SPRINT = 'Sprint 6';

// Helper: ISO de "hoy + dias" para llenar el input date en el modal.
function isoConOffset(dias) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-02 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-02 + Sprint 6', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-02');
    expect(text).toContain(SPRINT);
    expect(text.toLowerCase()).toContain('fianzas');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-02' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
  });

  test('criterios de aceptacion: los 3 textos al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const seccion = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Criterios de aceptación' })
    });
    await expect(seccion.getByText(/ligada al contrato con afianzadora/)).toBeVisible();
    await expect(seccion.getByText(/30, 15 y 5 días para el vencimiento/)).toBeVisible();
    await expect(seccion.getByText(/consultarse en formato PDF desde el listado/)).toBeVisible();
  });

  // CHECK DISTINTIVO 1: las 3 tarjetas con conteo en vivo de pólizas por
  // vencer. Con el dummy actual: 2 en ≤5 días, 3 en ≤15, 4 en ≤30.
  test('tarjetas de conteo en vivo (5/15/30 días)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('card-5d')).toContainText('2');
    await expect(page.getByTestId('card-15d')).toContainText('3');
    await expect(page.getByTestId('card-30d')).toContainText('4');
  });

  // CHECK DISTINTIVO 2: badges de color por días restantes — cada fila lleva
  // data-badge con el rango (rojo/ambar/amarillo/verde).
  test('badges de alerta por dias: filas con cada color presentes', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const tabla = page.getByTestId('tabla-polizas');
    await expect(tabla.locator('tr[data-badge="rojo"]')).toHaveCount(2);
    await expect(tabla.locator('tr[data-badge="ambar"]')).toHaveCount(1);
    await expect(tabla.locator('tr[data-badge="amarillo"]')).toHaveCount(1);
    await expect(tabla.locator('tr[data-badge="verde"]')).toHaveCount(2);
  });

  // CHECK DISTINTIVO 3: modal Agregar póliza — Registrar disabled hasta llenar
  // todos los campos; al confirmar la nueva fila sube al tope con fondo verde.
  test('modal Agregar: disabled hasta completar y nueva fila al tope', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);

    await page.getByTestId('btn-agregar-poliza').click();
    const modal = page.getByTestId('modal-agregar-poliza');
    await expect(modal).toBeVisible();

    const btnConfirmar = page.getByTestId('mp-confirmar');
    // El folio viene pre-llenado con el correlativo, pero faltan los demás.
    await expect(btnConfirmar).toBeDisabled();

    await page.getByTestId('mp-afianzadora').fill('Afianzadora ABC');
    await page.getByTestId('mp-monto').fill('500000');
    await page.getByTestId('mp-emision').fill(isoConOffset(0));
    await page.getByTestId('mp-vencimiento').fill(isoConOffset(120));
    // Aún falta el archivo PDF.
    await expect(btnConfirmar).toBeDisabled();

    // Adjuntar el archivo (Playwright soporta setInputFiles con un payload sintético).
    await page.getByTestId('mp-archivo').setInputFiles({
      name: 'poliza_test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test')
    });
    await expect(btnConfirmar).toBeEnabled();

    await btnConfirmar.click();

    // Modal cerrado y la nueva fila aparece arriba con fondo verde.
    await expect(page.getByTestId('modal-agregar-poliza')).toHaveCount(0);
    const filasNuevas = page.locator('[data-testid^="fila-poliza-nueva-"]');
    await expect(filasNuevas).toHaveCount(1);
    await expect(filasNuevas.first()).toContainText('Afianzadora ABC');
  });

  // CHECK DISTINTIVO 4: botón "👁 Ver PDF" abre modal-ver-pdf con el nombre
  // del archivo de la póliza.
  test('boton Ver PDF abre modal con el nombre del archivo', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('btn-ver-pdf-F-2026-08745').click();
    const modal = page.getByTestId('modal-ver-pdf');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('cumplimiento_F-2026-08745.pdf');
  });

  // CHECK DISTINTIVO 5: botón Editar abre el mismo modal con valores
  // pre-llenados (la afianzadora coincide con la del dummy).
  test('boton Editar abre el modal con los campos pre-llenados', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('btn-editar-F-2026-08745').click();
    const modal = page.getByTestId('modal-agregar-poliza');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Editar póliza');
    await expect(page.getByTestId('mp-afianzadora')).toHaveValue('Afianzadora Sofimex');
    await expect(page.getByTestId('mp-folio')).toHaveValue('F-2026-08745');
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-02 — modo aplicacion (Dependencia: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
  });

  test('sidebar muestra HU-02 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-02',
      sprintLabel: SPRINT
    });
  });

  test('boton Agregar visible; sin aviso de solo consulta', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByTestId('btn-agregar-poliza')).toBeVisible();
    await expectSinAvisoSoloConsulta(page);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Finanzas consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente', alias: 'Residente' },
  { id: 'finanzas',  alias: 'Finanzas'  }
]) {
  test.describe(`HU-02 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible; sin boton Agregar', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);

      await expectAvisoSoloConsulta(page);
      await expect(page.getByTestId('btn-agregar-poliza')).toHaveCount(0);
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Supervisión sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-02 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-02 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
