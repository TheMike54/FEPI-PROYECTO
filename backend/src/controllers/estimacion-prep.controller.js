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
      `SELECT id, monto, anticipo_pct, pena_convencional_pct, created_by, residente_id, superintendente_id, supervision_id
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
    // Etapa C: % de pena por atraso pactado (NULL = sin pena → retención $0) + pagado acumulado (HU-21)
    // para el avance financiero. La carátula viva calcula la retención por atraso con estos datos.
    const penaPct = contrato.pena_convencional_pct == null ? null : Number(contrato.pena_convencional_pct);
    const pgq = await pool.query('SELECT COALESCE(SUM(importe),0) AS pagado FROM pagos WHERE contrato_id = $1', [contratoId]);
    const pagadoAcum = Number(pgq.rows[0].pagado);
    const financieroPct = montoContrato > 0 ? Number(((pagadoAcum / montoContrato) * 100).toFixed(2)) : null;

    // Conceptos del catálogo + PU + contratado (clave puede no existir en contratos legacy).
    const cc = await pool.query(
      `SELECT cc.id AS contrato_concepto_id, cc.orden, cc.clave, cc.concepto, cc.unidad,
              cc.cantidad AS cantidad_contratada, cc.pu, cc.es_adicional
         FROM contrato_conceptos cc
        WHERE cc.contrato_id = $1
        ORDER BY cc.orden`,
      [contratoId]
    );
    if (cc.rowCount === 0) {
      return res.status(200).json({
        contrato: { monto: contrato.monto, anticipo_pct: anticipoPct, importe_anticipo: importeAnticipo.toFixed(2), pena_convencional_pct: penaPct },
        tiene_programa: false, periodo_fin: periodoFin, conceptos: [],
        avance: { fisico_ejecutado: '0.00', fisico_pct: null, fisico_real_ejecutado: '0.00', fisico_real_pct: null,
                  planeado_valor: '0.00', planeado_pct: null,
                  pagado_acumulado: pagadoAcum.toFixed(2), financiero_pct: financieroPct, atraso_previo: false }
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

    // FIX 22-jun (profe): el AVANCE FÍSICO del contrato se mide del avance REPORTADO (HU-06,
    // concepto_avance vigente), NO de Σ estimaciones. Antes el "avance del contrato" salía 14.9%
    // (= valor ya estimado / monto); este es el avance físico real (0% si no se ha reportado nada).
    const fis = await pool.query(
      `SELECT ca.contrato_concepto_id AS cid, COALESCE(SUM(ca.cantidad),0) AS ejec
         FROM concepto_avance ca
        WHERE ca.contrato_concepto_id = ANY($1::int[]) AND ca.estado = 'vigente'
        GROUP BY ca.contrato_concepto_id`,
      [ids]
    );
    const fisMap = new Map(fis.rows.map((r) => [r.cid, Number(r.ejec)]));

    // FIX 22-jun (profe): (b) "solo conceptos del periodo" y (c) "jalar del avance" necesitan el periodo
    // EXACTO seleccionado (el contrato_periodo cuyo fin coincide con periodo_fin). Por concepto:
    // programado_periodo (plan de ESE periodo) y avance_periodo (terminado reportado en ESE periodo).
    let periodoSelId = null;
    if (periodoFin) {
      const psq = await pool.query("SELECT id FROM contrato_periodos WHERE contrato_id=$1 AND to_char(fin,'YYYY-MM-DD')=$2 LIMIT 1", [contratoId, periodoFin]);
      periodoSelId = psq.rows[0]?.id || null;
    }
    let progPerMap = new Map();
    let avPerMap = new Map();
    if (periodoSelId) {
      const ppq = await pool.query('SELECT contrato_concepto_id AS cid, COALESCE(SUM(cantidad),0) AS q FROM programa_obra WHERE contrato_periodo_id=$1 GROUP BY contrato_concepto_id', [periodoSelId]);
      progPerMap = new Map(ppq.rows.map((r) => [r.cid, Number(r.q)]));
      const apq = await pool.query("SELECT contrato_concepto_id AS cid, COALESCE(SUM(cantidad),0) AS q FROM concepto_avance WHERE contrato_periodo_id=$1 AND estado='vigente' GROUP BY contrato_concepto_id", [periodoSelId]);
      avPerMap = new Map(apq.rows.map((r) => [r.cid, Number(r.q)]));
    }

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

    let fisicoValor = 0;     // Σ (ya_estimado × pu) — valor de obra ya ESTIMADA acumulada (carátula)
    let fisicoRealValor = 0; // Σ (avance_fisico_reportado × pu) — avance FÍSICO real (HU-06)
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
      fisicoRealValor += (fisMap.get(cid) || 0) * pu;
      if (tienePrograma) planeadoValor += (planeado || 0) * pu;
      return {
        contrato_concepto_id: cid,
        clave: r.clave || null,
        concepto: r.concepto,
        unidad: r.unidad,
        es_adicional: r.es_adicional === true,   // G2 (art. 101 RLOPSRM): conceptos de convenio se distinguen
        cantidad_contratada: r.cantidad_contratada,
        pu: r.pu,
        ya_estimado: yaEstimado,
        planeado_hasta_periodo: planeado,
        disponible_periodo: disponible,
        // FIX 22-jun: (b) plan del periodo EXACTO (>0 ⇒ el concepto pertenece al periodo) y (c) avance
        // terminado reportado en ese periodo (para prellenar la estimación). null si no hay periodo elegido.
        programado_periodo: periodoSelId ? (progPerMap.get(cid) || 0) : null,
        avance_periodo: periodoSelId ? (avPerMap.get(cid) || 0) : null
      };
    });

    const pct = (a, b) => (b > 0 ? Number(((a / b) * 100).toFixed(2)) : null);
    return res.status(200).json({
      contrato: { monto: contrato.monto, anticipo_pct: anticipoPct, importe_anticipo: importeAnticipo.toFixed(2), pena_convencional_pct: penaPct },
      tiene_programa: tienePrograma,
      periodo_fin: periodoFin,
      conceptos,
      // Barras + retención por atraso (Etapa C): físico (ejecutado en valor) vs programado (curva S) vs
      // financiero (pagado/monto). atraso_previo = ya atrasado SIN la estimación actual; la carátula viva
      // recalcula el atraso REAL sumando el bruto del periodo (fisico_ejecutado + bruto < planeado_valor).
      // Definición físico/financiero: el avance financiero/monto se mide SIN IVA (art. 2 fr. XIX RLOPSRM).
      // Regla de disparo del atraso = criterio del equipo (default conservador): por concepto, en unidades
      // (programado al periodo − ejecutado); la pena por atraso es parametrizable (art. 46 Bis LOPSRM + arts.
      // 86-88 RLOPSRM), default sin pena → retención $0 hasta fijar el %.
      avance: {
        fisico_ejecutado: fisicoValor.toFixed(2),
        fisico_pct: pct(fisicoValor, montoContrato),
        // FIX 22-jun: avance FÍSICO real (HU-06), separado del "estimado acumulado" de la carátula.
        fisico_real_ejecutado: fisicoRealValor.toFixed(2),
        fisico_real_pct: pct(fisicoRealValor, montoContrato),
        planeado_valor: planeadoValor.toFixed(2),
        planeado_pct: tienePrograma ? pct(planeadoValor, montoContrato) : null,
        pagado_acumulado: pagadoAcum.toFixed(2),
        financiero_pct: financieroPct,
        atraso_previo: tienePrograma && planeadoValor > 0 && fisicoValor < planeadoValor - 1e-6
      }
    });
  } catch (err) {
    console.error('[preparacionEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { preparacionEstimacion };
