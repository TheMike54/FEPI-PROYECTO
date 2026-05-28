// @ts-check
// E2E HU-20 — Tránsito a pago: soportes y suficiencia presupuestal.
//
// Cubre el comportamiento del prototipo:
//   · Verificación de suficiencia presupuestal contra el techo anual; bloqueo
//     cuando el monto excede el disponible (art. 24 LOPSRM).
//   · Semáforo del plazo de 20 días naturales (art. 54 LOPSRM) calculado en
//     vivo desde la fecha de autorización (offset 13 días → zona ámbar).
//   · Botón "Generar instrucción de pago" sólo se habilita cuando soportes OK
//     y presupuesto OK; al pulsarlo aparece el banner verde + la sección
//     "Notificación a Finanzas".
//
// PERMISOS[HU-20]: residente='C' · contratista='E' · supervision=null · dependencia='C' · finanzas='E'
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

const VIEW_PATH = '/pagos/transito';
const TITULO = 'Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal';
const SPRINT = 'Sprint 5';

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-20 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-20 + Sprint 5', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-20');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Tránsito a pago');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-20' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Contratista y finanzas')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    // "suficiencia presupuestal" se repite en titulo de vista, heading interno
    // y criterio. "soportes obligatorios" tambien. Anclo a fragmentos unicos.
    await expect(page.getByText('contra el techo anual y bloquea la generación')).toBeVisible();
    await expect(page.getByText('basado en la fecha de autorización')).toBeVisible();
    await expect(page.getByText('factura, CFDI, estado de fianza de cumplimiento')).toBeVisible();
  });

  // CHECK DISTINTIVO 1: el semaforo se computa en vivo y queda en zona ambar
  // por el offset del dummy (13 dias).
  test('semaforo del plazo en vivo (Dia 13 de 20 → ambar)', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    const badge = page.getByTestId('semaforo-pago-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/Día 13 de 20/);
    await expect(badge).toHaveAttribute('data-color', 'ambar');
  });

  // CHECK DISTINTIVO 2: boton disabled hasta soportes OK + presupuesto OK.
  test('boton Generar disabled mientras un soporte esta pendiente', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    // Por defecto el soporte "fianza" esta pendiente → bloqueado.
    await expect(page.getByTestId('btn-generar-instruccion')).toBeDisabled();
    await expect(page.getByTestId('aviso-bloqueo')).toBeVisible();

    // Cargo el faltante → ahora puede generarse.
    await page.getByTestId('btn-toggle-fianza').click();
    await expect(page.getByTestId('btn-generar-instruccion')).toBeEnabled();
  });

  test('boton Generar disabled si el monto excede el techo presupuestal', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('btn-toggle-fianza').click();
    await expect(page.getByTestId('btn-generar-instruccion')).toBeEnabled();

    // Monto > disponibleAntes (15M - 11.2M = 3.8M) → bloqueado.
    await page.getByTestId('input-monto-estimacion').fill('5000000');
    await expect(page.getByTestId('badge-excede')).toBeVisible();
    await expect(page.getByTestId('btn-generar-instruccion')).toBeDisabled();
  });

  // CHECK DISTINTIVO 3: flujo de generar instruccion → banner + notificacion.
  test('flujo: cargar soportes + generar → banner verde + notificacion a Finanzas', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('btn-toggle-fianza').click();
    await page.getByTestId('btn-generar-instruccion').click();

    const aviso = page.getByTestId('aviso-instruccion-generada');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Instrucción de pago generada');
    await expect(aviso).toContainText('Notificación enviada a Finanzas');
    await expect(aviso).toContainText('20 días naturales');
    await expect(aviso).toContainText('art. 54 LOPSRM');

    const notif = page.getByTestId('notificacion-finanzas');
    await expect(notif).toBeVisible();
    await expect(notif).toContainText('Destinatario');
    await expect(notif).toContainText('Fecha y hora');
    await expect(notif).toContainText('Monto');

    // El boton queda disabled tras generar.
    await expect(page.getByTestId('btn-generar-instruccion')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Finanzas ejecutan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-20 — modo aplicacion (${rol.alias}: ejecuta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('sidebar muestra HU-20 y la vista carga sin metadata academica', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
      await expectMetadataAcademicaOculta(page, {
        huId: 'HU-20',
        sprintLabel: SPRINT
      });
    });

    test('puede completar el flujo de generar instruccion', async ({ page }) => {
      await goToViaSidebar(page, VIEW_PATH);
      await page.getByTestId('btn-toggle-fianza').click();
      await page.getByTestId('btn-generar-instruccion').click();
      await expect(page.getByTestId('aviso-instruccion-generada')).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Dependencia consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'dependencia', alias: 'Dependencia' }
]) {
  test.describe(`HU-20 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('aviso de solo consulta visible y sin boton de generar', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expectAvisoSoloConsulta(page);
      // En esta vista el boton se renderiza solo si !soloLectura.
      await expect(page.getByTestId('btn-generar-instruccion')).toHaveCount(0);
      // El semaforo sigue visible (es display).
      await expect(page.getByTestId('semaforo-pago-badge')).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Supervisión sin acceso
// ---------------------------------------------------------------------------

test.describe('HU-20 — modo aplicacion (Supervisión: sin acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'supervision');
  });

  test('HU-20 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
  });
});
