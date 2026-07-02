// HU-21: registro del pago efectuado (variante mínima, sin estimación persistida aún).
// - El actor (registrado_por) SIEMPRE sale del JWT, nunca del body (CA-2).
// - estimacion_id queda NULL hasta que HU-12 persista estimaciones (diferido).
// - El indicador del plazo de 20 días naturales (art. 54 LOPSRM) se DERIVA en la
//   lectura (no se almacena).
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { contratoCerrado, msgCerrado } = require('../lib/gateCierre');

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
function fechaValida(s) {
  if (typeof s !== 'string' || !PATRON_FECHA.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}
function limpiar(v) { return typeof v === 'string' ? v.trim() : ''; }
function aImporte(v) { return Number(String(v).replace(/[$,\s]/g, '')); }

// POST /api/pagos — SOLO finanzas (gate en la ruta). registrado_por = req.user.id (JWT).
// ENDURECIDO (HU-21): el pago se AMARRA a una estimación REAL del contrato (estimacion_id), el
// importe = NETO de esa estimación (no arbitrario), no se paga dos veces (UNIQUE parcial +
// FOR UPDATE), SOLO estimaciones AUTORIZADAS por la residencia (art. 54 LOPSRM; no integradas/
// presentadas/rechazadas/pagadas), y al pagar la estimación avanza a 'pagada' (cierra CA-1: marcar
// pagada + avance financiero), en UNA transacción.
async function registrarPago(req, res) {
  const body = req.body || {};
  const contratoId = Number(body.contrato_id);
  const estimacionId = Number(body.estimacion_id);
  const fechaPago = body.fecha_pago;
  const referencia = limpiar(body.referencia);
  const facturaCfdi = limpiar(body.factura_cfdi);
  const fechaFactura = body.fecha_factura;
  const fechaAutorizacionRaw = body.fecha_autorizacion;
  const observaciones = (typeof body.observaciones === 'string' && body.observaciones.trim())
    ? body.observaciones.trim() : null;

  // Validaciones de forma (400). El importe YA NO se teclea: se deriva del neto de la estimación.
  if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'El contrato (contrato_id) es requerido' });
  if (!Number.isInteger(estimacionId) || estimacionId <= 0) return res.status(400).json({ error: 'La estimación (estimacion_id) es requerida; selecciona una estimación del contrato' });
  if (!fechaValida(fechaPago)) return res.status(400).json({ error: 'La fecha de pago es requerida y debe tener formato AAAA-MM-DD válido' });
  if (!referencia) return res.status(400).json({ error: 'La referencia bancaria (clave de rastreo SPEI) es requerida' });
  if (referencia.length > 100) return res.status(400).json({ error: 'La referencia bancaria no puede exceder 100 caracteres' });
  // FIX 22-jun (profe): la clave de rastreo SPEI es NUMÉRICA — antes el formulario aceptaba letras sin validar.
  if (!/^\d{6,100}$/.test(referencia)) return res.status(400).json({ error: 'La referencia bancaria (clave de rastreo SPEI) debe ser numérica (solo dígitos)' });
  if (!facturaCfdi) return res.status(400).json({ error: 'El folio fiscal (factura_cfdi) es requerido' });
  if (facturaCfdi.length > 60) return res.status(400).json({ error: 'El folio fiscal no puede exceder 60 caracteres' });
  if (!fechaValida(fechaFactura)) return res.status(400).json({ error: 'La fecha de la factura es requerida y debe tener formato AAAA-MM-DD válido' });
  // FIX 22-jun (profe): la factura NO puede estar POST-FECHADA (fecha futura). "No emito una factura un mes después".
  if (fechaFactura > new Date().toISOString().slice(0, 10)) return res.status(400).json({ error: `La fecha de la factura (${fechaFactura}) no puede ser futura` });
  let fechaAutorizacion = null;
  if (fechaAutorizacionRaw !== undefined && fechaAutorizacionRaw !== null && fechaAutorizacionRaw !== '') {
    if (!fechaValida(fechaAutorizacionRaw)) return res.status(400).json({ error: 'La fecha de autorización, si se envía, debe tener formato AAAA-MM-DD válido' });
    fechaAutorizacion = fechaAutorizacionRaw;
  }
  if (observaciones && observaciones.length > 2000) return res.status(400).json({ error: 'Las observaciones no pueden exceder 2000 caracteres' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      // H1 (01-jul): FOR UPDATE del contrato — serializa la verificación de suficiencia (abajo) contra
      // otros pagos/instrucciones concurrentes; además trae monto/dependencia/fecha para calcular el techo.
      const c = await client.query('SELECT id, monto, dependencia_id, fecha_inicio FROM contratos WHERE id = $1 FOR UPDATE', [contratoId]);
      if (c.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El contrato indicado no existe' }); }
      const contrato = c.rows[0];
      // #2 (gate art. 64): un contrato cerrado (finiquito elaborado) es SOLO-LECTURA; el saldo se liquida
      // por el finiquito. NO se registran pagos por separado (evita doble liquidación). Coherente con
      // instruccion-pago/convenios/garantías que ya bloquean por art. 64.
      if (await contratoCerrado(client, contratoId)) { await client.query('ROLLBACK'); return res.status(409).json({ error: msgCerrado('no se registran pagos') }); }

      // Estimación REAL: existe, del contrato, estado pagable, no pagada. FOR UPDATE serializa el
      // no-doble-pago contra otra transacción concurrente.
      const e = await client.query('SELECT id, contrato_id, numero, estado, neto, integrada_en FROM estimaciones WHERE id = $1 FOR UPDATE', [estimacionId]);
      if (e.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'La estimación indicada no existe' }); }
      const est = e.rows[0];
      if (est.contrato_id !== contratoId) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'La estimación no pertenece al contrato indicado' }); }
      if (est.estado === 'pagada') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Esta estimación ya está pagada' }); }
      if (est.estado === 'rechazada') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'No se puede pagar una estimación rechazada' }); }
      // OLEADA PAGO (14-jun) — candado ESTRICTO confirmado por la ley: SOLO se paga lo AUTORIZADO por la
      // residencia. El art. 54 LOPSRM hace de la AUTORIZACIÓN el disparador del pago (plazo de 20 días "a
      // partir de la fecha en que hayan sido autorizadas por la residencia"). Antes el conjunto era
      // permisivo ['integrada','enviada','autorizada']; pagar una 'integrada'/'enviada' contradecía el art. 54.
      if (est.estado !== 'autorizada') { await client.query('ROLLBACK'); return res.status(409).json({ error: `Solo puede pagarse una estimación AUTORIZADA por la residencia (art. 54 LOPSRM); estado actual: ${est.estado}` }); }
      const dup = await client.query('SELECT 1 FROM pagos WHERE estimacion_id = $1 LIMIT 1', [estimacionId]);
      if (dup.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Esta estimación ya tiene un pago registrado' }); }

      // FIX 22-jun (profe): NO se paga sin AVANCE físico reportado del contrato (HU-06). El profe: "acabas
      // de pagar y no tienes reportado tu avance". Se exige al menos un registro de avance vigente.
      const av = await client.query(
        `SELECT 1 FROM concepto_avance ca
            JOIN contrato_conceptos cc ON cc.id = ca.contrato_concepto_id
          WHERE cc.contrato_id = $1 AND ca.estado = 'vigente' LIMIT 1`,
        [contratoId]
      );
      if (av.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'No se puede pagar: el contrato no tiene avance físico reportado (HU-06). Registra el avance antes de pagar.' });
      }

      // H6-B6-3 (25-jun, decisión de Maik) — el COBRO lo PROMUEVE el contratista: Finanzas no registra el pago
      // hasta que el contratista haya subido el CFDI del cobro (cobro_soportes tipo='cfdi') en el tránsito a pago.
      // art. 54 LOPSRM (la factura/CFDI es precondición del pago). [El rediseño de UI de B6-3 va aparte.]
      const cfdiSop = await client.query("SELECT 1 FROM cobro_soportes WHERE estimacion_id = $1 AND tipo = 'cfdi' LIMIT 1", [estimacionId]);
      if (cfdiSop.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Falta el CFDI del cobro: el contratista debe subir el comprobante fiscal en el tránsito a pago antes de que Finanzas registre el pago (art. 54 LOPSRM).' });
      }

      // Plan2 Pase3: la fecha del pago NO puede ser anterior al día en que se integró la estimación
      // (integrada_en). No se paga antes de que la estimación exista formalmente. Comparación por DÍA
      // en UTC: fecha_pago es DATE (sin hora); integrada_en es TIMESTAMPTZ. El MISMO día de la
      // integración SÍ es válido (estricto <). fechaPago ya viene validada como 'AAAA-MM-DD' (string),
      // por lo que la comparación lexicográfica equivale a la cronológica. Fundamento: art. 54 LOPSRM (derivado: no se paga antes de que la estimación exista formalmente).
      if (est.integrada_en) {
        const diaIntegracion = new Date(est.integrada_en).toISOString().slice(0, 10); // 'AAAA-MM-DD' (UTC)
        if (fechaPago < diaIntegracion) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `La fecha de pago (${fechaPago}) no puede ser anterior a la fecha de integración de la estimación (${diaIntegracion})` });
        }
      }

      // H1 (01-jul) — SUFICIENCIA PRESUPUESTAL TAMBIÉN AL PAGAR (art. 24 párrs. 1-2 LOPSRM: el GASTO se
      // sujeta al PEF/LFPRH; la suficiencia en la partida específica es requisito PREVIO). Antes este
      // gate solo vivía en generarInstruccion (HU-20) y el "pago directo sin tránsito" (HU-21) lo
      // brincaba — el pago procedía aunque el techo estuviera excedido. Fuente del techo (regla de
      // Maiki): la PARTIDA capturada (presupuesto_anual) si existe; sin partida, el MONTO VIGENTE del
      // contrato (fallback 'contrato': pagar por encima del monto pactado carece de soporte contractual;
      // las ampliaciones van por convenio, art. 59 LOPSRM) [validar profe]. Comprometido = Σ neto
      // autorizadas+pagadas del ámbito de la fuente, EXCLUYENDO esta estimación (que está 'autorizada').
      {
        const ejercicioPago = contrato.fecha_inicio ? new Date(contrato.fecha_inicio).getUTCFullYear() : null;
        let techo = null; let comprometido = null; let fuente = null;
        if (contrato.dependencia_id != null && Number.isFinite(ejercicioPago)) {
          const p = await client.query(
            'SELECT id, techo FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia_id = $2 ORDER BY id FOR UPDATE',
            [ejercicioPago, contrato.dependencia_id]
          );
          if (p.rowCount > 0) {
            techo = p.rows.reduce((s, r) => s + Number(r.techo), 0);
            fuente = 'partida';
            const cq = await client.query(
              `SELECT COALESCE(SUM(e.neto),0) AS comprometido
                 FROM estimaciones e JOIN contratos ct ON ct.id = e.contrato_id
                WHERE ct.dependencia_id = $1 AND EXTRACT(YEAR FROM ct.fecha_inicio) = $2
                  AND e.estado IN ('autorizada','pagada') AND e.id <> $3`,
              [contrato.dependencia_id, ejercicioPago, estimacionId]
            );
            comprometido = Number(cq.rows[0].comprometido);
          }
        }
        if (fuente == null) {
          techo = Number(contrato.monto);
          fuente = 'contrato';
          const cq = await client.query(
            `SELECT COALESCE(SUM(neto),0) AS comprometido FROM estimaciones
              WHERE contrato_id = $1 AND estado IN ('autorizada','pagada') AND id <> $2`,
            [contratoId, estimacionId]
          );
          comprometido = Number(cq.rows[0].comprometido);
        }
        const disponible = Math.round((techo - comprometido + Number.EPSILON) * 100) / 100;
        const netoPago = Math.round((Number(est.neto) + Number.EPSILON) * 100) / 100;
        if (netoPago > disponible) {
          await client.query('ROLLBACK');
          const fuenteTxt = fuente === 'partida' ? 'el techo de la partida capturada' : 'el monto vigente del contrato (sin partida capturada)';
          return res.status(409).json({
            error: `No se puede registrar el pago: el neto ($${netoPago.toFixed(2)}) excede el disponible ($${disponible.toFixed(2)}) contra ${fuenteTxt}; requiere ampliación/adecuación presupuestal (art. 24 LOPSRM).`,
            suficiencia: { techo: techo.toFixed(2), comprometido: comprometido.toFixed(2), disponible: disponible.toFixed(2), neto: netoPago.toFixed(2), fuente },
          });
        }
      }

      // El importe = NETO de la estimación (server-side, no arbitrario). Pago exacto del neto (no parcial): criterio del equipo (default conservador), menos superficie de error; los ajustes van en otra estimación o el finiquito.
      const importe = est.neto;
      const estimacionRef = `Estimación #${est.numero}`;
      const ins = await client.query(
        `INSERT INTO pagos
           (contrato_id, estimacion_id, estimacion_ref, fecha_pago, importe, referencia, factura_cfdi, fecha_factura, fecha_autorizacion, observaciones, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, contrato_id, estimacion_id, estimacion_ref, fecha_pago, importe, referencia,
                   factura_cfdi, fecha_factura, fecha_autorizacion, observaciones, registrado_por, created_at`,
        [contratoId, estimacionId, estimacionRef, fechaPago, importe, referencia, facturaCfdi, fechaFactura, fechaAutorizacion, observaciones, req.user.id]
      );
      // Avanza la estimación a 'pagada' (CA-1). El trigger sigecop_estimacion_inmutable deja libre 'estado'.
      await client.query("UPDATE estimaciones SET estado = 'pagada' WHERE id = $1", [estimacionId]);
      // G4 (23-jun): cierra la instrucción de pago de esa estimación (emitida→cumplida) en la MISMA tx, para
      // que la solicitud SALGA de la cola global de finanzas (colaCobro filtra estado='emitida') en vez de
      // quedarse ahí marcada "pagada" para siempre. instruccion_pago no tiene trigger de inmutabilidad y el
      // CHECK ya admite 'cumplida'. Si no hubo instrucción (pago directo sin tránsito), el UPDATE no afecta filas.
      await client.query("UPDATE instruccion_pago SET estado = 'cumplida' WHERE estimacion_id = $1 AND estado = 'emitida'", [estimacionId]);
      await client.query('COMMIT');
      return res.status(201).json(ins.rows[0]);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      if (e && e.code === '23505') return res.status(409).json({ error: 'Esta estimación ya tiene un pago registrado' });
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('[registrarPago]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/pagos/contrato/:contratoId — acotado por participación (reusa acceso.js);
// devuelve los pagos del contrato con el nombre de quien registró (CA-2) y el
// indicador DERIVADO del plazo de 20 días (art. 54 LOPSRM).
async function pagosDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contratoId inválido' });

    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a los pagos de este contrato' });
    }

    // dias_transcurridos = fecha_pago - GREATEST(fecha_autorizacion, fecha_factura).
    // GREATEST ignora NULL: sin autorización (HU-20) cae a fecha_factura -> plazo provisional.
    const r = await pool.query(
      `SELECT p.id, p.contrato_id, p.estimacion_id, p.estimacion_ref, p.fecha_pago, p.importe,
              p.referencia, p.factura_cfdi, p.fecha_factura, p.fecha_autorizacion, p.observaciones,
              p.registrado_por, u.nombre AS registrado_por_nombre, p.created_at,
              (p.fecha_pago - GREATEST(p.fecha_autorizacion, p.fecha_factura)) AS dias_transcurridos,
              ((p.fecha_pago - GREATEST(p.fecha_autorizacion, p.fecha_factura)) <= 20) AS plazo_cumplido,
              (p.fecha_autorizacion IS NULL) AS base_provisional
         FROM pagos p
         LEFT JOIN usuarios u ON u.id = p.registrado_por
        WHERE p.contrato_id = $1
        ORDER BY p.fecha_pago`,
      [contratoId]
    );
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[pagosDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { registrarPago, pagosDeContrato };
