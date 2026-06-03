// @ts-check
// A2 — Programa de obra = matriz CONCEPTO × PERIODO (reemplaza el viejo "actividades").
// Verifica la VALIDACIÓN EN LA VISTA que pidió el profesor (audio 2026-06-01):
//  - el ciclo (mensual/quincenal) define las columnas (periodos, art. 54);
//  - la celda es la cantidad del concepto en el periodo (NO un %peso);
//  - el restante por concepto se recalcula en vivo y Σ no puede exceder lo contratado
//    (art. 118: "no puede poner más de los que están autorizados").
// Corre frontend-only (datos dummy), como el resto de la suite (sin backend).
import { test, expect } from '@playwright/test';
import { freshHome, enterAppMode, goToViaSidebar } from './_helpers.js';

test.describe('A2 — programa de obra como matriz concepto × periodo', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');           // HU-01 = E (editable) para residente
    await goToViaSidebar(page, '/contratos/alta');
    await page.getByRole('button', { name: 'Programa de obra' }).click();
  });

  test('el ciclo genera periodos (columnas) y el quincenal da más que el mensual', async ({ page }) => {
    const ciclo = page.getByTestId('select-ciclo');
    const count = page.getByTestId('periodos-count');
    await expect(ciclo).toHaveValue('mensual');
    // Dummy: inicio 2026-06-01, plazo 181 → 6 periodos mensuales.
    await expect(count).toContainText('6 periodos');
    // La matriz pinta una columna por periodo: la celda del primer concepto, periodo 1 y 6.
    await expect(page.getByTestId('celda-0-1')).toBeVisible();
    await expect(page.getByTestId('celda-0-6')).toBeVisible();

    await ciclo.selectOption('quincenal');           // cada 15 días → más columnas
    await expect(count).toContainText('13 periodos');
    await expect(page.getByTestId('celda-0-13')).toBeVisible();
  });

  test('el restante por concepto se recalcula en vivo y bloquea el exceso (art. 118)', async ({ page }) => {
    const celda = page.getByTestId('celda-0-1');
    const planeado = page.getByTestId('planeado-0');
    const restante = page.getByTestId('restante-0');

    // Concepto 0 del dummy: contratado = 1250. Sin asignar, restante = contratado.
    await expect(restante).toHaveText('1250');

    // Asigno 1000 en el periodo 1 → planeado 1000, restante 250 (parcial, permitido).
    await celda.fill('1000');
    await expect(planeado).toHaveText('1000');
    await expect(restante).toHaveText('250');
    await expect(page.getByTestId('programa-exceso')).toHaveCount(0);

    // Asigno 2000 (> 1250 contratado) → restante negativo y aviso de exceso (bloquea guardar).
    await celda.fill('2000');
    await expect(restante).toHaveText('-750');
    await expect(page.getByTestId('programa-exceso')).toBeVisible();
  });
});
