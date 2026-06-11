// @ts-check
// O1 — Paquete de fixes de la revisión del profe (8-9 jun) + testing del equipo. Cubre:
//   · P2  — la fecha de inicio del contrato ACEPTA fechas pasadas (alta completa de punta a punta).
//           NOTA: el candado ">= hoy" reportado NO existe en el código actual (no se reprodujo);
//           este spec BLINDA el comportamiento correcto para que nunca regrese.
//   · P5b — garantía con vigencia VENCIDA se rechaza al capturar (bug confirmado en vivo).
//   · P5a — garantía que EXCEDE el % esperado (cumplimiento 10%) → modal de AVISO (no bloquea).
//   · W2/W4a — roster: columna EVENTO separada de MOTIVO ("Asignación inicial" no es un motivo).
//   · P12b — el catálogo del expediente muestra la CLAVE de cada concepto.
// LOGIN REAL (backend+BD). No corre en CI.
import { test, expect } from '@playwright/test';
import {
  freshHome, enterAppMode, goToViaSidebar,
  altaLlenarDatosGenerales, altaAgregarConcepto, altaLlenarJuridicos,
  altaAdjuntarPdfFirmado,
} from './_helpers.js';

test.skip(!!process.env.CI, 'O1: login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();

// Fechas relativas a HOY (el stack corre con el reloj real; nada hardcodeado que caduque).
const isoDesdeHoy = (dias) => {
  const d = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Rellena garantías con la fianza de cumplimiento (monto/vigencia parametrizables). */
async function llenarCumplimiento(page, { monto = '500', vigencia } = {}) {
  await page.getByRole('button', { name: '+ Agregar póliza' }).click();
  await page.getByTestId('garantia-tipo-0').selectOption('Cumplimiento');
  await page.getByTestId('garantia-afianzadora-0').fill('Afianzadora O1, S.A.');
  await page.getByTestId('garantia-poliza-0').fill('POL-O1-001');
  await page.getByTestId('garantia-monto-0').fill(monto);
  await page.getByTestId('garantia-vigencia-0').fill(vigencia || isoDesdeHoy(365));
}

/** Avanza el wizard del alta hasta el paso de GARANTÍAS (4) con datos válidos. */
async function avanzarAGarantias(page, { folio, fechaInicio } = {}) {
  await altaLlenarDatosGenerales(page, { folio, plazo: 60, fechaInicio: fechaInicio || isoDesdeHoy(7) });
  await page.getByTestId('btn-siguiente').click();               // 1 · catálogo
  await altaAgregarConcepto(page, 0, { cantidad: 100, pu: 50 }); // monto = 5,000
  await page.getByTestId('btn-siguiente').click();               // 2 · programa
  await page.getByTestId('celda-0-1').fill('100');               // cuadra 100%
  await page.getByTestId('btn-siguiente').click();               // 3 · jurídicos
  await altaLlenarJuridicos(page);
  await page.getByTestId('btn-siguiente').click();               // 4 · garantías
  await expect(page.getByTestId('garantias-requeridas')).toBeVisible();
}

test.describe('O1 — fixes de la revisión del profe (09-jun)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'residente');
    await goToViaSidebar(page, '/contratos/alta');
  });

  test('P2: el alta ACEPTA fecha de inicio pasada (contrato ya iniciado se captura con su fecha real)', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    const folio = `E2E-O1-P2-${Date.now()}`;
    const haceUnaSemana = isoDesdeHoy(-7);
    await avanzarAGarantias(page, { folio, fechaInicio: haceUnaSemana });
    await llenarCumplimiento(page);
    await page.getByTestId('btn-siguiente').click();             // 5 · PDF firmado
    await altaAdjuntarPdfFirmado(page);
    await page.getByTestId('btn-guardar').click();
    // Guardó: la fila aparece en Registrados (la espera implícita cubre el POST + recarga).
    await expect(page.locator('tr', { hasText: folio })).toBeVisible();
    // En ningún punto hubo error de fecha.
    await expect(page.getByTestId('error-wizard')).toHaveCount(0);
  });

  test('P5b: garantía con vigencia VENCIDA se rechaza; con vigencia válida avanza', async ({ page }) => {
    await avanzarAGarantias(page, { folio: `E2E-O1-P5B-${Date.now()}` });
    await llenarCumplimiento(page, { vigencia: isoDesdeHoy(-1) }); // ayer = vencida
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('error-wizard')).toBeVisible();
    await expect(page.getByTestId('error-wizard')).toContainText('vencida');
    await expect(page.getByTestId('garantias-requeridas')).toBeVisible(); // sigue en garantías
    // Corregir la vigencia desbloquea el avance.
    await page.getByTestId('garantia-vigencia-0').fill(isoDesdeHoy(365));
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('pdf-firmado-precaptura')).toBeVisible();
  });

  test('P5a: garantía que excede el % esperado → modal de aviso; "Revisar" se queda, "Continuar" avanza', async ({ page }) => {
    await avanzarAGarantias(page, { folio: `E2E-O1-P5A-${Date.now()}` });
    // Cumplimiento de $1,000 = 20% del monto ($5,000): excede el 10% esperado ($500).
    await llenarCumplimiento(page, { monto: '1000' });
    await page.getByTestId('btn-siguiente').click();
    const modal = page.getByTestId('modal-exceso-garantia');
    await expect(modal).toBeVisible();                 // AVISA (no bloquea ni truena)
    await expect(modal).toContainText('Cumplimiento');
    await expect(modal).toContainText('10%');
    // "Revisar montos": cierra el modal y NO avanza (sigue en garantías).
    await page.getByTestId('btn-exceso-revisar').click();
    await expect(modal).toHaveCount(0);
    await expect(page.getByTestId('garantias-requeridas')).toBeVisible();
    // Reintentar y CONTINUAR: avanza al paso del PDF firmado.
    await page.getByTestId('btn-siguiente').click();
    await expect(page.getByTestId('modal-exceso-garantia')).toBeVisible();
    await page.getByTestId('btn-exceso-continuar').click();
    await expect(page.getByTestId('pdf-firmado-precaptura')).toBeVisible();
  });

  test('W2 + P12b: expediente — Evento separado de Motivo y la CLAVE visible en el catálogo', async ({ page, request }) => {
    // Contrato por API (residente = creador → lo ve), con clave de concepto y equipo completo.
    const [R, S, V, D] = await Promise.all([
      loginApi(request, 'residente@sigecop.test'),
      loginApi(request, 'contratista@sigecop.test'),
      loginApi(request, 'supervision@sigecop.test'),
      loginApi(request, 'dependencia@sigecop.test')
    ]);
    const folio = `E2E-O1-W2-${Date.now()}`;
    const r = await request.post(`${API}/contratos`, {
      headers: { Authorization: `Bearer ${R.token}` },
      data: {
        folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Expediente O1 e2e',
        plazoDias: 60, fechaInicio: isoDesdeHoy(7),
        superintendenteId: S.user.id, supervisionId: V.user.id, dependenciaId: D.user.id,
        anticipoPct: null, juridicos: {},
        conceptos: [{ clave: 'CLV-77', concepto: 'Concepto O1', unidad: 'm³', cantidad: 100, pu: 50 }],
        ciclo: 'mensual', programa: [{ clave: 'CLV-77', periodoNumero: 1, cantidad: 100 }], garantias: []
      }
    });
    expect(r.status(), 'crear contrato O1').toBe(201);
    const id = (await r.json()).id;

    await goToViaSidebar(page, '/contratos/expediente');
    await page.getByTestId('select-contrato').selectOption({ value: String(id) });

    // P12b: la columna Clave del catálogo muestra la clave capturada (art. 45 fr. IX RLOPSRM).
    await expect(page.getByTestId('exp-concepto-clave-0')).toContainText('CLV-77');

    // W2/W4a: la fila inicial del roster dice EVENTO "Alta del contrato" y su MOTIVO va vacío;
    // el texto "Asignación inicial (alta del contrato)" ya no se muestra como motivo.
    const bloque = page.getByTestId('roster-expediente');
    await expect(bloque).toBeVisible();
    await expect(bloque.locator('[data-testid^="roster-exp-evento-"]', { hasText: 'Alta del contrato' }).first()).toBeVisible();
    await expect(bloque).not.toContainText('Asignación inicial');
  });
});
