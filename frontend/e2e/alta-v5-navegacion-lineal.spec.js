// @ts-check
// alta-v5 — Navegación LINEAL durante la captura (raíz: se elimina el clic-en-pestaña para gating)
// + garantías y datos jurídicos OBLIGATORIOS. Escenarios pedidos por Maiki:
//   (1) durante la captura, clic en un NOMBRE de pestaña NO navega; solo Siguiente/Atrás.
//   (2) los nombres se vuelven clicables solo con todo válido + PDF firmado cargado.
//   (3) no se puede avanzar/guardar con garantías vacías ni jurídicos vacíos.
//   (4) el reset al guardar sigue bien.
//   (5) "Guardar" nunca aparece con pasos incompletos.
// Con LOGIN REAL (requiere backend+BD; cuentas semilla).
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos, altaLlenarGarantias,
  altaAdjuntarPdfFirmado,
} from './_helpers.js';

test.skip(!!process.env.CI, 'alta-v5: login real requiere backend+BD; se corre en local');

// Localiza una pestaña del wizard por su etiqueta (regex). El Tab pone disabled={bloqueado}.
const tab = (page, re) => page.getByRole('button', { name: re });

// Avanza el wizard con datos VÁLIDOS hasta `paso` (0 DG, 1 catálogo, 2 programa, 3 jurídicos,
// 4 garantías, 5 PDF firmado adjuntado = captura completa). Solo «Siguiente» (nunca clic-en-nombre).
async function avanzarHasta(page, paso, { folio } = {}) {
  await altaLlenarDatosGenerales(page, { folio, plazo: 60, fechaInicio: '2026-06-01' });
  if (paso <= 0) return;
  await page.getByTestId('btn-siguiente').click();             // catálogo (1)
  await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 }); // monto = 5000
  if (paso <= 1) return;
  await page.getByTestId('btn-siguiente').click();             // programa (2)
  await page.getByTestId('celda-0-1').fill('100');             // cuadra 100%
  if (paso <= 2) return;
  await page.getByTestId('btn-siguiente').click();             // jurídicos (3)
  await altaLlenarJuridicos(page);
  if (paso <= 3) return;
  await page.getByTestId('btn-siguiente').click();             // garantías (4)
  await altaLlenarGarantias(page);
  if (paso <= 4) return;
  await page.getByTestId('btn-siguiente').click();             // PDF firmado (5)
  await altaAdjuntarPdfFirmado(page);
}

test.describe('alta-v5 — navegación lineal + garantías/jurídicos obligatorios', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');
  });

  test('(1) durante la captura, clic en un NOMBRE de pestaña NO navega (solo Siguiente/Atrás)', async ({ page }) => {
    await avanzarHasta(page, 2);                                // en "Programa de obra" (0/1 ya visitados)
    await expect(page.getByRole('heading', { name: 'Programa de obra' })).toBeVisible();
    // Todos los NOMBRES (incluidos los pasos ya visitados y válidos) están deshabilitados: no navegan.
    await expect(tab(page, /Datos generales/)).toBeDisabled();
    await expect(tab(page, /Catálogo de conceptos/)).toBeDisabled();
    await expect(tab(page, /Datos jurídicos/)).toBeDisabled();
    await expect(tab(page, /Garantías/)).toBeDisabled();
    await expect(tab(page, /PDF firmado/)).toBeDisabled();
    // alta-v5.1: "Registrados" (lista de guardados, solo lectura) queda SIEMPRE navegable, incluso
    // durante la captura. Los PASOS de captura siguen bloqueados (gating lineal intacto).
    await expect(tab(page, /Registrados/)).toBeEnabled();
    expect(await page.locator('button[data-bloqueado="true"]').count()).toBeGreaterThan(0);
    // Prueba de COMPORTAMIENTO (no solo del atributo disabled): aunque se FUERCE el evento click
    // sobre el NOMBRE de una pestaña, el handler (clicNombrePestaña) NO navega durante la captura.
    await tab(page, /Catálogo de conceptos/).dispatchEvent('click');
    await expect(page.getByRole('heading', { name: 'Programa de obra' })).toBeVisible(); // no navegó
    // «Atrás» SÍ navega (a catálogo); «Siguiente» con datos válidos vuelve a avanzar.
    await page.getByTestId('btn-atras').click();
    await expect(page.getByRole('heading', { name: 'Catálogo de conceptos' })).toBeVisible();
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByRole('heading', { name: 'Programa de obra' })).toBeVisible();
  });

  test('(2) los nombres se habilitan SOLO con todo válido + PDF firmado cargado', async ({ page }) => {
    await avanzarHasta(page, 4);                                // todo válido salvo el PDF firmado
    await expect(tab(page, /Datos generales/)).toBeDisabled();  // captura incompleta (falta PDF)
    await page.getByTestId('btn-siguiente').click();            // → PDF firmado (5)
    await expect(tab(page, /Datos generales/)).toBeDisabled();  // sin PDF, sigue incompleta
    await altaAdjuntarPdfFirmado(page);
    // Captura COMPLETA: ahora los nombres navegan (salto/revisión libre).
    await expect(tab(page, /Datos generales/)).toBeEnabled();
    await expect(tab(page, /Garantías/)).toBeEnabled();
    await tab(page, /Datos generales/).click();
    await expect(page.getByTestId('dg-folio')).not.toHaveValue('');
    // Y se puede volver al PDF por nombre para guardar.
    await tab(page, /PDF firmado/).click();
    await expect(page.getByTestId('btn-guardar')).toBeEnabled();
  });

  test('(3a) NO se avanza con datos JURÍDICOS vacíos', async ({ page }) => {
    await avanzarHasta(page, 2);
    await page.getByTestId('btn-siguiente').click();            // → jurídicos (3)
    await expect(page.getByRole('heading', { name: 'Datos jurídicos' })).toBeVisible();
    await page.getByTestId('btn-siguiente').click();            // intentar avanzar con jurídicos vacíos
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByTestId('error-wizard')).toContainText('jurídicos');
    await expect(page.getByRole('heading', { name: 'Datos jurídicos' })).toBeVisible(); // NO avanzó
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    // Completar jurídicos habilita el avance a garantías.
    await altaLlenarJuridicos(page);
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByRole('heading', { name: /Garantías/ })).toBeVisible();
  });

  test('(3b) NO se avanza con GARANTÍAS vacías (falta fianza de cumplimiento)', async ({ page }) => {
    await avanzarHasta(page, 3);
    await page.getByTestId('btn-siguiente').click();            // → garantías (4)
    await expect(page.getByTestId('garantias-faltan')).toBeVisible();
    await page.getByTestId('btn-siguiente').click();            // intentar avanzar sin fianzas
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByTestId('error-wizard')).toContainText('fianza de CUMPLIMIENTO');
    await expect(page.getByTestId('garantias-requeridas')).toBeVisible(); // sigue en garantías
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    // Capturar la fianza de cumplimiento habilita el avance.
    await altaLlenarGarantias(page);
    await expect(page.getByTestId('garantias-ok')).toBeVisible();
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('pdf-firmado-precaptura')).toBeVisible();
  });

  test('(3c) con anticipo > 0 también se exige la fianza de ANTICIPO', async ({ page }) => {
    await avanzarHasta(page, 3);
    await page.getByTestId('btn-siguiente').click();            // → garantías (4)
    await page.getByTestId('anticipo-input').fill('20');        // > 0 pero ≤ umbral (no exige PDF)
    await altaLlenarGarantias(page);                            // solo cumplimiento
    await expect(page.getByTestId('garantias-faltan')).toContainText('anticipo');
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('error-wizard')).toContainText('ANTICIPO');
    // Agregar la fianza de anticipo (póliza índice 1) desbloquea.
    await page.getByRole('button', { name: '+ Agregar póliza' }).click();
    await page.getByTestId('garantia-tipo-1').selectOption('Anticipo');
    await page.getByTestId('garantia-afianzadora-1').fill('Afianzadora E2E, S.A.');
    await page.getByTestId('garantia-poliza-1').fill('POL-ANT-001');
    await page.getByTestId('garantia-monto-1').fill('1000');
    await page.getByTestId('garantia-vigencia-1').fill('2027-06-01');
    await expect(page.getByTestId('garantias-ok')).toBeVisible();
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('pdf-firmado-precaptura')).toBeVisible();
  });

  test('(4) el guardado redirige a Registrados, limpia y re-bloquea (navegación lineal)', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    const folio = `E2E-V5-${Date.now()}`;
    await avanzarHasta(page, 5, { folio });                     // todo + PDF firmado
    await expect(page.getByTestId('btn-guardar')).toBeEnabled();
    await page.getByTestId('btn-guardar').click();
    await expect(page.locator('tr', { hasText: folio })).toBeVisible(); // en Registrados
    // Iniciar alta nueva (los nombres no navegan en captura): botón explícito.
    await page.getByTestId('btn-nueva-alta').click();
    await expect(page.getByTestId('dg-folio')).toHaveValue('');          // limpio
    await expect(page.getByTestId('btn-siguiente')).toBeVisible();       // de vuelta en captura, paso 0
    await expect(tab(page, /Catálogo de conceptos/)).toBeDisabled();     // re-bloqueado (lineal)
    await expect(tab(page, /Garantías/)).toBeDisabled();
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
  });

  test('(5) "Guardar" NUNCA aparece con pasos incompletos', async ({ page }) => {
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);        // 0 · Datos generales
    await altaLlenarDatosGenerales(page, { plazo: 60, fechaInicio: '2026-06-01' });
    await page.getByTestId('btn-siguiente').click();                     // 1 · catálogo
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 });
    await page.getByTestId('btn-siguiente').click();                     // 2 · programa
    await page.getByTestId('celda-0-1').fill('100');
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    await page.getByTestId('btn-siguiente').click();                     // 3 · jurídicos
    await altaLlenarJuridicos(page);
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    await page.getByTestId('btn-siguiente').click();                     // 4 · garantías
    await altaLlenarGarantias(page);
    await expect(page.getByTestId('btn-guardar')).toHaveCount(0);
    await page.getByTestId('btn-siguiente').click();                     // 5 · PDF firmado
    // SOLO aquí aparece "Guardar" (y deshabilitado sin el PDF); "Siguiente" desaparece.
    await expect(page.getByTestId('btn-siguiente')).toHaveCount(0);
    await expect(page.getByTestId('btn-guardar')).toBeVisible();
    await expect(page.getByTestId('btn-guardar')).toBeDisabled();
  });
});
