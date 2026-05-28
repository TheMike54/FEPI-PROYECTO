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
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-18 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-18 + Sprint 9', async ({ page }) => {
    const card = cardInInicioFor(page, VIEW_PATH);
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-18');
    expect(text).toContain(SPRINT);
    expect(text).toContain('Portafolio ejecutivo');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(sidebarLinkFor(page, VIEW_PATH)).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y heading', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-18' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: SPRINT }).first()).toBeVisible();
    await expect(page.getByText('Rol: Dependencia')).toBeVisible();
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('tres factores')).toBeVisible();
    await expect(page.getByText('doble clic sobre un contrato')).toBeVisible();
    await expect(page.getByText('agruparse')).toBeVisible();
  });

  // CHECK 1: el color es el que predice calcularSemaforo para cada fila del dummy.
  test('semaforo derivado: cada fila luce el color esperado', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    // Los colores se derivan de los factores del dummy y deben coincidir con lo
    // que arroja calcularSemaforo.
    const esperados = {
      'C-2026-0042': 'verde',
      'C-2026-0047': 'verde',
      'C-2026-0038': 'amarillo',
      'C-2026-0029': 'amarillo',
      'C-2026-0051': 'rojo'
    };
    for (const [folio, color] of Object.entries(esperados)) {
      const dot = page.getByTestId(`semaforo-dot-${folio}`);
      await expect(dot).toBeVisible();
      await expect(dot).toHaveAttribute('data-color', color);
    }
  });

  test('badge vs mes anterior visible en filas con variacion', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    // C-2026-0047 sube de 70 a 78 → +8 pp.
    const fila = page.getByTestId('fila-portafolio-C-2026-0047');
    await expect(fila).toContainText('↑ 8 pp');
  });

  // CHECK 2: doble clic abre el panel.
  test('doble clic abre PanelDetalle con indicadores fisicos/financieros/atrasos/penalizaciones', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('fila-portafolio-C-2026-0051').dblclick();
    const panel = page.getByTestId('panel-detalle-contrato');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('C-2026-0051');
    await expect(panel).toContainText('Avance físico');
    await expect(panel).toContainText('Avance financiero');
    await expect(panel).toContainText('Atrasos');
    await expect(panel).toContainText('Penalizaciones');
    await expect(panel).toContainText('$ 180,000');
  });

  // CHECK 3: agrupar por reorganiza la tabla.
  test('Agrupar por ejercicio fiscal crea cabeceras por grupo', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('select-agrupar-por').selectOption('Ejercicio fiscal');
    await expect(page.getByText('Ejercicio fiscal: 2026')).toBeVisible();
    await expect(page.getByText('Ejercicio fiscal: 2025')).toBeVisible();
  });

  test('Agrupar por tipo de contratacion crea cabeceras por grupo', async ({ page }) => {
    await goToViaSidebar(page, VIEW_PATH);
    await page.getByTestId('select-agrupar-por').selectOption('Tipo de contratación');
    await expect(page.getByText('Tipo de contratación: Licitación pública')).toBeVisible();
    await expect(page.getByText('Tipo de contratación: Adjudicación directa')).toBeVisible();
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
