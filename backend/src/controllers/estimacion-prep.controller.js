// HU-12 / Etapa A (presentación) — endpoint de SOLO LECTURA para la "pantalla única" de estimación.
// NO toca el núcleo (integrarEstimacion / G1-G8): solo LEE y expone lo que la carátula viva, el
// semáforo de plan y las barras de avance necesitan, sin que el cliente tenga que recalcular el plan
// por periodos. Reusa las MISMAS consultas que el POST (acumulado previo, art. 118, y el plan A2 6c)
// para que el "disponible este periodo" del semáforo coincida EXACTO con lo que el servidor validará.
//   · ya_estimado            = Σ cantidad_periodo de estimaciones NO rechazadas (= acumulado_anterior).
//   · planeado_hasta_periodo = Σ programa_obra hasta el periodo (cp.fin <= periodo_fin); null sin programa.
//   · disponible_periodo     = (tiene_programa&periodo ? planeado_hasta : contratado) − ya_estimado.
// Acotado por participación (esParteOSupervision, igual que avance/detalle).
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/estimacion-prep/contrato/:contratoId?periodo_fin=AAAA-MM-DD
async function preparacionEstimacion(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contratoId inválido' });
    const periodoFin = typeof req.query.periodo_fin === 'string' && PATRON_FECHA.test(req.query.periodo_fin)
      ? req.query.periodo_fin : null;

    const c = await pool.query(
      `SELECT id, monto, anticipo_pct, created_by, residente_id, superintendente_id, supervision_id
         FROM contratos WHERE id = $1`,
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    const contrato = c.rows[0];
    if (!esParteOSupervision(req.user, contrato)) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }
    const montoContrato = Number(contrato.monto) || 0;
    const anticipoPct = contrato.anticipo_pct == null ? 0 : Number(contrato.anticipo_pct);
    const importeAnticipo = Math.round((montoContrato * anticipoPct / 100 + Number.EPSILON) * 100) / 100;

    // Conceptos del catálogo + PU + contratado (clave puede no existir en contratos legacy).
    const cc = await pool.query(
      `SELECT cc.id AS contrato_concepto_id, cc.orden, cc.clave, cc.concepto, cc.unidad,
              cc.cantidad AS cantidad_contratada, cc.pu
         FROM contrato_conceptos cc
        WHERE cc.contrato_id = $1
        ORDER BY cc.orden`,
      [contratoId]
    );
    if (cc.rowCount === 0) {
      return res.status(200).json({
        contrato: { monto: contrato.monto, anticipo_pct: anticipoPct, importe_anticipo: importeAnticipo.toFixed(2) },
        tiene_programa: false, periodo_fin: periodoFin, conceptos: [],
        avance: { fisico_ejecutado: '0.00', fisico_pct: null, planeado_valor: '0.00', planeado_pct: null }
      });
    }
    const ids = cc.rows.map((r) => r.contrato_concepto_id);

    // ya_estimado por concepto (= acumulado_anterior del POST: estimaciones NO rechazadas).
    const acu = await pool.query(
      `SELECT eg.contrato_concepto_id AS cid, COALESCE(SUM(eg.cantidad_periodo),0) AS acum
         FROM estimacion_generadores eg JOIN estimaciones e ON e.id = eg.estimacion_id
        WHERE e.contrato_id = $1 AND e.estado <> 'rechazada' AND eg.contrato_concepto_id = ANY($2::int[])
        GROUP BY eg.contrato_concepto_id`,
      [contratoId, ids]
    );
    const acuMap = new Map(acu.rows.map((r) => [r.cid, Number(r.acum)]));

    // ¿tiene programa A2? (igual gating que el POST 6c).
    const tp = await pool.query(
      'SELECT 1 FROM programa_obra po JOIN contrato_conceptos cc ON cc.id=po.contrato_concepto_id WHERE cc.contrato_id=$1 LIMIT 1',
      [contratoId]
    );
    const tienePrograma = tp.rowCount > 0;

    // planeado por concepto: hasta el periodo (cp.fin <= periodo_fin) si se pasó; si no, TOTAL.
    let planMap = new Map();
    if (tienePrograma) {
      const plan = periodoFin
        ? await pool.query(
            `SELECT po.contrato_concepto_id AS cid, COALESCE(SUM(po.cantidad),0) AS planeado
               FROM programa_obra po JOIN contrato_periodos cp ON cp.id = po.contrato_periodo_id
              WHERE po.contrato_concepto_id = ANY($1::int[]) AND cp.fin <= $2::date
              GROUP BY po.contrato_concepto_id`,
            [ids, periodoFin]
          )
        : await pool.query(
            `SELECT po.contrato_concepto_id AS cid, COALESCE(SUM(po.cantidad),0) AS planeado
               FROM programa_obra po
              WHERE po.contrato_concepto_id = ANY($1::int[])
              GROUP BY po.contrato_concepto_id`,
            [ids]
          );
      planMap = new Map(plan.rows.map((r) => [r.cid, Number(r.planeado)]));
    }

    let fisicoValor = 0;     // Σ (ya_estimado × pu) — valor de obra ya estimada/ejecutada acumulada
    let planeadoValor = 0;   // Σ (planeado_hasta_periodo × pu) — curva S esperada a la fecha
    const conceptos = cc.rows.map((r) => {
      const cid = r.contrato_concepto_id;
      const pu = Number(r.pu) || 0;
      const contratado = Number(r.cantidad_contratada) || 0;
      const yaEstimado = acuMap.get(cid) || 0;
      const planeado = tienePrograma ? (planMap.get(cid) || 0) : null;
      // El tope del periodo es el plan (si hay programa) acotado por lo contratado (art. 118 nunca se supera).
      const tope = tienePrograma ? Math.min(planeado, contratado) : contratado;
      const disponible = Math.max(0, tope - yaEstimado);
      fisicoValor += yaEstimado * pu;
      if (tienePrograma) planeadoValor += (planeado || 0) * pu;
      return {
        contrato_concepto_id: cid,
        clave: r.clave || null,
        concepto: r.concepto,
        unidad: r.unidad,
        cantidad_contratada: r.cantidad_contratada,
        pu: r.pu,
        ya_estimado: yaEstimado,
        planeado_hasta_periodo: planeado,
        disponible_periodo: disponible
      };
    });

    const pct = (a, b) => (b > 0 ? Number(((a / b) * 100).toFixed(2)) : null);
    return res.status(200).json({
      contrato: { monto: contrato.monto, anticipo_pct: anticipoPct, importe_anticipo: importeAnticipo.toFixed(2) },
      tiene_programa: tienePrograma,
      periodo_fin: periodoFin,
      conceptos,
      // Barras: avance físico (lo ejecutado/estimado, en valor) vs programado (curva S del programa).
      // [validar la definición exacta físico/financiero con el profe].
      avance: {
        fisico_ejecutado: fisicoValor.toFixed(2),
        fisico_pct: pct(fisicoValor, montoContrato),
        planeado_valor: planeadoValor.toFixed(2),
        planeado_pct: tienePrograma ? pct(planeadoValor, montoContrato) : null
      }
    });
  } catch (err) {
    console.error('[preparacionEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { preparacionEstimacion };
