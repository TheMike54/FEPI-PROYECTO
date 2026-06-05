// @ts-check
// alta-v5.1 — La pestaña "7. Registrados" (lista de contratos guardados, SOLO LECTURA) queda
// SIEMPRE desbloqueada y navegable, sin tocar el gating lineal de los pasos de CAPTURA.
// Escenarios pedidos por Maiki:
//   (1) "Registrados" es clickeable con la captura VACÍA → muestra la lista; los pasos de captura
//       siguen bloqueados (no se entra a un paso fuera de orden).
//   (2) Con captura A MEDIAS: clickeable, muestra la lista y al VOLVER preserva los datos (no se
//       pierde la captura en silencio ni se da por guardada).
//   (3) Tras visitar "Registrados", el gating de los pasos de captura sigue intacto (Siguiente con
//       el paso vacío no avanza; los pasos posteriores siguen bloqueados; no aparece "Guardar").
//   (4) Con captura COMPLETA: clickeable, muestra la lista, NO guarda por entrar y se vuelve a la captura.
// Con LOGIN REAL (requiere backend+BD; cuentas semilla). No corre en CI.
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos, altaLlenarGarantias,
  altaAdjuntarPdfFirmado,
} from './_helpers.js';

test.skip(!!process.env.CI, 'alta-v5.1: login real requiere backend+BD; se corre en local');

// Localiza una pestaña del wizard por su etiqueta (regex). El Tab pone disabled={bloqueado}.
const tab = (page, re) => page.getByRole('button', { name: re });
const headingRegistrados = (page) => page.getByRole('heading', { name: 'Contratos registrados' });

test.describe('alta-v5.1 — "Registrados" siempre navegable (gating de captura intacto)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');             // arranca en el paso 0
  });

  test('(1) captura VACÍA: "Registrados" es clickeable y muestra la lista; los pasos siguen bloqueados', async ({ page }) => {
    await expect(page.getByTestId('dg-folio')).toBeVisible();   // paso 0 (Datos generales)
    await expect(tab(page, /Registrados/)).toBeEnabled();       // SIEMPRE navegable
    await tab(page, /Registrados/).click();
    await expect(headingRegistrados(page)).toBeVisible();       // muestra la lista de guardados
    // Solo lleva a la lista: los PASOS de captura NO se desbloquean (no se entra fuera de orden).
    await expect(tab(page, /Datos generales/)).toBeDisabled();
    await expect(tab(page, /Catálogo de conceptos/)).toBeDisabled();
    await expect(tab(page, /Programa de obra/)).toBeDisabled();
    await expect(tab(page, /PDF firmado/)).toBeDisabled();
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    // Solo lleva a la lista: el botón VUELVE a la captura (a la sesión activa) sin guardar nada;
    // al volver se aterriza en el paso 0 (Datos generales) vacío, intacto.
    await expect(page.getByTestId('btn-volver-captura')).toBeVisible();
    await page.getByTestId('btn-volver-captura').click();
    await expect(page.getByTestId('dg-folio')).toBeVisible();
    await expect(page.getByTestId('dg-folio')).toHaveValue('');
    // El "+ Capturar nuevo contrato" es exclusivo del estado limpio/post-guardado (cubierto en hu-01/v5).
  });

  test('(2) captura A MEDIAS: clickeable, muestra la lista y al VOLVER preserva los datos', async ({ page }) => {
    const folio = `E2E-V51-${Date.now()}`;
    await altaLlenarDatosGenerales(page, { folio });
    await page.getByTestId('btn-siguiente').click();            // catálogo (paso 1)
    await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 });
    await expect(page.getByRole('heading', { name: 'Catálogo de conceptos' })).toBeVisible();
    // Registrados sigue clickeable a media captura.
    await expect(tab(page, /Registrados/)).toBeEnabled();
    await tab(page, /Registrados/).click();
    await expect(headingRegistrados(page)).toBeVisible();
    // Hay captura en progreso → el botón VUELVE a la captura (preserva, no resetea ni guarda).
    await expect(page.getByTestId('btn-volver-captura')).toBeVisible();
    await expect(page.getByTestId('btn-nueva-alta')).toHaveCount(0);
    await page.getByTestId('btn-volver-captura').click();
    // Vuelve EXACTO al paso donde estaba (catálogo) con el concepto intacto.
    await expect(page.getByRole('heading', { name: 'Catálogo de conceptos' })).toBeVisible();
    await expect(page.getByTestId('concepto-cantidad-0')).toHaveValue('100');
    await expect(page.getByTestId('concepto-pu-0')).toHaveValue('50');
    // Y el folio capturado en el paso 0 también sigue ahí (Atrás → Datos generales).
    await page.getByTestId('btn-atras').click();
    await expect(page.getByTestId('dg-folio')).toHaveValue(folio);
  });

  test('(3) tras visitar "Registrados", el gating de los pasos sigue intacto (no se salta nada)', async ({ page }) => {
    await altaLlenarDatosGenerales(page);
    await page.getByTestId('btn-siguiente').click();            // catálogo (paso 1), aún VACÍO
    await tab(page, /Registrados/).click();                     // peek a la lista
    await expect(headingRegistrados(page)).toBeVisible();
    await page.getByTestId('btn-volver-captura').click();       // de regreso al catálogo
    await expect(page.getByRole('heading', { name: 'Catálogo de conceptos' })).toBeVisible();
    // Siguiente con el catálogo vacío NO avanza (gating lineal intacto, no se saltó por ir a Registrados).
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Catálogo de conceptos' })).toBeVisible(); // no avanzó
    await expect(tab(page, /Programa de obra/)).toBeDisabled();
    await expect(tab(page, /PDF firmado/)).toBeDisabled();
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
  });

  test('(4) captura COMPLETA: "Registrados" clickeable, NO guarda por entrar y se vuelve a la captura', async ({ page }) => {
    const folio = `E2E-V51C-${Date.now()}`;
    await altaLlenarDatosGenerales(page, { folio, plazo: 60, fechaInicio: '2026-06-01' });
    await page.getByTestId('btn-siguiente').click();
    await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 });
    await page.getByTestId('btn-siguiente').click();
    await page.getByTestId('celda-0-1').fill('100');           // programa cuadra 100%
    await page.getByTestId('btn-siguiente').click();
    await altaLlenarJuridicos(page);
    await page.getByTestId('btn-siguiente').click();
    await altaLlenarGarantias(page);
    await page.getByTestId('btn-siguiente').click();
    await altaAdjuntarPdfFirmado(page);                        // captura completa
    await expect(tab(page, /Registrados/)).toBeEnabled();
    await tab(page, /Registrados/).click();
    await expect(headingRegistrados(page)).toBeVisible();
    // NO se dio por guardada: el contrato (folio único) NO aparece en la lista por solo entrar.
    await expect(page.locator('tr', { hasText: folio })).toHaveCount(0);
    // Se vuelve a la captura sin perder nada (de regreso al paso PDF, con "Guardar" disponible).
    await page.getByTestId('btn-volver-captura').click();
    await expect(page.getByTestId('btn-guardar')).toBeVisible();
  });
});
