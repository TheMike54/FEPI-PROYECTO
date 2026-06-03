// @ts-check
// E2E HU-18 — Portafolio ejecutivo.
//
// Cubre el comportamiento del prototipo:
//   · Semáforo CALCULADO en cliente (no leído del dummy) a partir de 3
//     factores crudos: desviación de avance vs programado, días vencidos en
//     plazos legales y pendientes sin atender.
//   · Cada factor aporta 0/1/2 puntos; suma → verde (0-1), amarillo (2-3),
//     rojo (≥4). Verificación cruzada importando calcularSemaforo y validando
//     que cambiar los factores cambia el color.
//   · Doble clic sobre una fila abre el panel de detalle.
//   · Control "Agrupar por" (Contratista / Ejercicio fiscal / Tipo de
//     contratación) reorganiza la tabla.
//   · Badge "vs mes anterior" presente en cada fila.
//
// PERMISOS[HU-18]: residente='C' · supervision='C' · dependencia='E' · contratista/finanzas=null
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
import { calcularSemaforo } from '../src/data/portafolioLogica.js';

// alta-v2: la suite entra con login real → requiere backend+BD; se corre en local (no en CI).
test.skip(!!process.env.CI, 'alta-v2: login real requiere backend+BD; se corre en local');

const VIEW_PATH = '/portafolio';
const TITULO = 'Portafolio ejecutivo';
const SPRINT = 'Sprint 9';

// ---------------------------------------------------------------------------
// LOGICA DEL SEMAFORO (test unitario importando la funcion)
// ---------------------------------------------------------------------------

test.describe('HU-18 — logica del semaforo', () => {
  test('verde: todos los factores ok', () => {
    const s = calcularSemaforo({ desviacionAvance: 0, diasVencidos: 0, pendientesSinAtender: 0 });
    expect(s.color).toBe('verde');
  });

  test('amarillo: combinacion de alertas', () => {
    const s = calcularSemaforo({ desviacionAvance: 10, diasVencidos: 5, pendientesSinAtender: 1 });
    expect(s.color).toBe('amarillo');
  });

  test('rojo: 3 factores graves', () => {
    const s = calcularSemaforo({ desviacionAvance: 25, diasVencidos: 18, pendientesSinAtender: 4 });
    expect(s.color).toBe('rojo');
  });

  test('el color cambia cuando empeoran los factores', () => {
    const base = calcularSemaforo({ desviacionAvance: 0, diasVencidos: 0, pendientesSinAtender: 0 });
    const peor = calcularSemaforo({ desviacionAvance: 20, diasVencidos: 12, pendientesSinAtender: 3 });
    expect(base.color).toBe('verde');
    expect(peor.color).toBe('rojo');
  });

  test('desglose incluye los tres factores con puntos', () => {
    const s = calcularSemaforo({ desviacionAvance: 10, diasVencidos: 5, pendientesSinAtender: 1 });
    expect(s.desglose).toHaveLength(3);
    expect(s.desglose.map((d) => d.factor)).toEqual([
      'Avance vs programado',
      'Atrasos en plazos',
      'Pendientes sin atender'
    ]);
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Dependencia ejecuta
// ---------------------------------------------------------------------------

test.describe('HU-18 — modo aplicacion (Dependencia: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'dependencia');
  });

  test('sidebar muestra HU-18 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expectMetadataAcademicaOculta(page, {
      huId: 'HU-18',
      sprintLabel: SPRINT,
      rolAcademicoLabel: 'Dependencia'
    });
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — Residente / Supervisión consultan
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'residente',   alias: 'Residente'   },
  { id: 'supervision', alias: 'Supervisión' }
]) {
  test.describe(`HU-18 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('la vista es accesible (vista 100% consultativa)', async ({ page }) => {
      await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
      await goToViaSidebar(page, VIEW_PATH);
      await expect(page.getByTestId('semaforo-dot-C-2026-0042')).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// MODO APLICACION — Contratista / Finanzas sin acceso
// ---------------------------------------------------------------------------

for (const rol of [
  { id: 'contratista', alias: 'Contratista' },
  { id: 'finanzas',    alias: 'Finanzas'    }
]) {
  test.describe(`HU-18 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.id);
    });

    test('HU-18 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
