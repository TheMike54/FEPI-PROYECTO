// @ts-check
// FIX 3.3 (Oleada 3) — el avance físico (concepto_avance) es APPEND-ONLY (art. 123 fr. VI/VII RLOPSRM):
// corregir = anular la entrada original + registrar una NUEVA vinculada (reemplaza_a) con su nota
// "dice/debe decir". PATCH y DELETE quedaron eliminados. El acumulado del art. 118 cuenta solo VIGENTES.
// Login real → requiere backend+BD; se salta en CI.
import { test, expect } from '@playwright/test';

test.skip(!!process.env.CI, 'login real requiere backend+BD; se corre en local');

const API = 'http://localhost:4000/api';
const PASS = 'Sigecop2026!';
const loginApi = async (request, email) => (await request.post(`${API}/auth/login`, { data: { email, password: PASS } })).json();
const auth = (t) => ({ Authorization: `Bearer ${t}` });
// FOTO OBLIGATORIA (decisión de Maiki): el registro de avance exige ≥1 foto (server-side). PNG 1x1 válido como evidencia.
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function sembrarContratoConAvance(request) {
  const [R, S, V, D] = await Promise.all([
    loginApi(request, 'residente@sigecop.test'),
    loginApi(request, 'contratista@sigecop.test'),
    loginApi(request, 'supervision@sigecop.test'),
    loginApi(request, 'dependencia@sigecop.test'),
  ]);
  const folio = `E2E-AAO-${Date.now()}`;
  const cr = await request.post(`${API}/contratos`, {
    headers: auth(R.token),
    data: {
      folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Append-only avance',
      plazoDias: 60, fechaInicio: '2026-06-01', superintendenteId: S.user.id, supervisionId: V.user.id,
      dependenciaId: D.user.id, anticipoPct: null, juridicos: {},
      conceptos: [{ clave: 'C1', concepto: 'Excavación', unidad: 'm³', cantidad: 100, pu: 100 }],
      ciclo: 'mensual', programa: [{ clave: 'C1', periodoNumero: 1, cantidad: 100 }], garantias: [],
    },
  });
  expect(cr.status(), 'crear contrato').toBe(201);
  const id = (await cr.json()).id;
  // Bitácora abierta (para que la nota de corrección se asiente en vivo).
  await request.post(`${API}/bitacora/apertura`, {
    headers: auth(R.token),
    data: { contratoId: id, fechaEntregaSitio: '2026-06-01', domicilioDependencia: 'Gob', telefonoDependencia: '7470000', domicilioContratista: 'Calle 1', telefonoContratista: '7471111', descripcionTrabajos: 'Trabajos', caracteristicasSitio: 'Sitio' },
  });
  const t = await (await request.get(`${API}/trabajos/contrato/${id}`, { headers: auth(S.token) })).json();
  const ccid = t.conceptos.find((c) => c.clave === 'C1').contrato_concepto_id;
  // Registrar avance inicial 10 (multipart con la foto de evidencia obligatoria).
  const reg = await request.post(`${API}/trabajos`, {
    headers: auth(S.token),
    multipart: { contrato_concepto_id: String(ccid), periodo_numero: '1', cantidad: '10', fotos: { name: 'evidencia.png', mimeType: 'image/png', buffer: PNG_1x1 } },
  });
  expect(reg.status(), 'registrar avance').toBe(201);
  return { id, ccid, S };
}

test.describe('FIX 3.3 — avance append-only', () => {
  test('PATCH y DELETE están eliminados; corregir anula la original y registra una nueva (acumulado = vigentes)', async ({ request }) => {
    const { id, ccid, S } = await sembrarContratoConAvance(request);

    let t = await (await request.get(`${API}/trabajos/contrato/${id}`, { headers: auth(S.token) })).json();
    const origId = t.avances.filter((a) => a.contrato_concepto_id === ccid)[0].id;
    expect(Number(t.conceptos.find((c) => c.contrato_concepto_id === ccid).acumulado_ejecutado)).toBe(10);

    // PATCH y DELETE eliminados → 404 de ruta.
    expect((await request.patch(`${API}/trabajos/${origId}`, { headers: auth(S.token), data: { cantidad: 5 } })).status()).toBe(404);
    expect((await request.delete(`${API}/trabajos/${origId}`, { headers: auth(S.token) })).status()).toBe(404);

    // Corregir 10 → 8: anula la original y crea una nueva vinculada.
    const corr = await request.post(`${API}/trabajos/${origId}/corregir`, { headers: auth(S.token), data: { cantidad: 8, motivo: 'remedición en campo' } });
    expect(corr.status(), 'corregir').toBe(201);
    const cj = await corr.json();
    expect(cj.anulado_id).toBe(origId);
    expect(cj.nota, 'la corrección asienta su nota dice/debe-decir').toBeTruthy();

    // Estado final: original 'anulada', nueva 'vigente' con reemplaza_a; acumulado art.118 = 8 (no 18).
    t = await (await request.get(`${API}/trabajos/contrato/${id}`, { headers: auth(S.token) })).json();
    const av = t.avances.filter((a) => a.contrato_concepto_id === ccid);
    expect(av.find((a) => a.id === origId).estado).toBe('anulada');
    const nueva = av.find((a) => a.reemplaza_a === origId);
    expect(nueva, 'entrada correctiva vinculada').toBeTruthy();
    expect(Number(nueva.cantidad)).toBe(8);
    expect(Number(t.conceptos.find((c) => c.contrato_concepto_id === ccid).acumulado_ejecutado), 'acumulado cuenta solo vigentes').toBe(8);
  });
});
