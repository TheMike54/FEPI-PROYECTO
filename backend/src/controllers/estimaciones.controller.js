// HU-12 (Fase 2): integración de la estimación. La estimación es un EXPEDIENTE
// (art. 132 RLOPSRM): carátula materializada + números generadores con snapshots +
// notas de bitácora vinculadas. La carátula se calcula SERVER-SIDE al integrar
// (fuente única de verdad) y queda inmutable por trigger; el estado puede avanzar.
//
// Reglas de dominio:
// - Integra SOLO el superintendente del contrato (req.user.id === superintendente_id).
//   No es un rol global: es la posición en el equipo del contrato (espejo de cómo la
//   bitácora restringe al residente_id en abrirBitacora).
// - cantidad_anterior_acum se acumula de las estimaciones PREVIAS no rechazadas.
// - art. 118 RLOPSRM (CA-3): por concepto, acumulado + periodo <= lo contratado.
// - Sin IVA (art. 2 fr. XIX RLOPSRM). Amortización art. 143 fr. I; retención 5 al
//   millar art. 191 LFD.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
function fechaValida(s) {
  if (typeof s !== 'string' || !PATRON_FECHA.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}
// periodo_inicio + 1 mes calendario, con la MISMA semántica que Postgres
// (date + INTERVAL '1 month'): avanza un mes y, si el día no existe en el mes destino,
// lo fija al último día (p. ej. 2026-01-31 -> 2026-02-28). Devuelve 'AAAA-MM-DD'.
function masUnMes(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  let ny = y, nm = m + 1;
  if (nm > 12) { nm = 1; ny += 1; }
  const ultimoDia = new Date(Date.UTC(ny, nm, 0)).getUTCDate(); // último día del mes destino
  const nd = Math.min(d, ultimoDia);
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}
// Redondeo a 2 decimales (centavos), money-safe para las magnitudes de obra.
function r2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
// Cuantiza a 4 decimales = escala REAL de estimacion_generadores.cantidad_periodo. El
// cálculo server-side debe operar sobre EXACTAMENTE el valor que se persiste: así el
// subtotal congelado de la carátula es reproducible desde los generadores (el detalle
// recomputa importe = ROUND(cantidad_periodo × pu_snapshot, 2)) y el acumulado del art.
// 118 de estimaciones futuras coincide con lo validado al integrar. Sin esto, un cliente
// que mande >4 decimales descuadra carátula vs detalle de forma permanente.
function q4(n) { return Math.round((Number(n) + Number.EPSILON) * 1e4) / 1e4; }
// Tolerancia para comparar cantidades (numeric con hasta 4 decimales) sin que el
// epsilon de punto flotante dispare un falso "excede" en el límite exacto (art. 118
// permite acumulado == contratado).
const EPS_CANT = 1e-6;

// POST /api/estimaciones — integra la estimación (CA-1) en UNA transacción.
async function integrarEstimacion(req, res) {
  const body = req.body || {};
  const contratoId = Number(body.contrato_id);
  const periodoInicio = body.periodo_inicio;
  const periodoFin = body.periodo_fin;

  // --- Validaciones de forma (400), antes de abrir transacción ---
  if (!Number.isInteger(contratoId) || contratoId <= 0) {
    return res.status(400).json({ error: 'El contrato (contrato_id) es requerido' });
  }
  if (!fechaValida(periodoInicio)) return res.status(400).json({ error: 'periodo_inicio es requerido (AAAA-MM-DD)' });
  if (!fechaValida(periodoFin)) return res.status(400).json({ error: 'periodo_fin es requerido (AAAA-MM-DD)' });
  if (periodoFin < periodoInicio) return res.status(400).json({ error: 'periodo_fin no puede ser anterior a periodo_inicio' });
  // Periodicidad máxima 1 mes (art. 54): la estimación se formula por periodos que no
  // exceden un mes calendario (mismo cálculo que Postgres date + INTERVAL '1 month').
  if (periodoFin > masUnMes(periodoInicio)) {
    return res.status(400).json({ error: 'El periodo de la estimación no puede exceder un mes (art. 54)' });
  }

  // deductivas: manual, opcional, default 0; no negativo (art. 46 Bis LOPSRM).
  let deductivas = 0;
  if (body.deductivas !== undefined && body.deductivas !== null && body.deductivas !== '') {
    deductivas = Number(body.deductivas);
    if (!Number.isFinite(deductivas) || deductivas < 0) {
      return res.status(400).json({ error: 'deductivas, si se envía, debe ser un número mayor o igual a 0' });
    }
  }
  deductivas = r2(deductivas);

  // Generadores: FILTRA cantidad_periodo <= 0 (no se persisten). Requiere >= 1 línea
  // con avance. Sin conceptos repetidos (un renglón por concepto y estimación).
  const generadoresRaw = Array.isArray(body.generadores) ? body.generadores : [];
  const generadores = [];
  for (const g of generadoresRaw) {
    const cantRaw = Number(g && g.cantidad_periodo);
    if (!Number.isFinite(cantRaw)) return res.status(400).json({ error: 'Hay un concepto con cantidad_periodo inválida' });
    const cant = q4(cantRaw); // a la escala de la columna ANTES de calcular/validar/insertar
    if (cant <= 0) continue;  // filtra lo que no tiene avance (incluye lo que redondea a 0)
    const cid = Number(g && g.contrato_concepto_id);
    if (!Number.isInteger(cid) || cid <= 0) return res.status(400).json({ error: 'Hay un concepto con contrato_concepto_id inválido' });
    generadores.push({ contrato_concepto_id: cid, cantidad_periodo: cant });
  }
  if (generadores.length === 0) {
    return res.status(400).json({ error: 'Incluye al menos un concepto con cantidad mayor a 0' });
  }
  const conceptoIds = generadores.map((g) => g.contrato_concepto_id);
  if (new Set(conceptoIds).size !== conceptoIds.length) {
    return res.status(400).json({ error: 'No repitas el mismo concepto en una estimación' });
  }

  // Notas: ids enteros, deduplicadas (la pertenencia se valida en la transacción).
  const notasRaw = Array.isArray(body.notas) ? body.notas : [];
  const notas = [];
  for (const n of notasRaw) {
    const nid = Number(n);
    if (!Number.isInteger(nid) || nid <= 0) return res.status(400).json({ error: 'Hay un nota_id inválido' });
    notas.push(nid);
  }
  const notasUnicas = [...new Set(notas)];

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      // (1) Contrato + auth localizada. 404 antes que 403 (espejo de la bitácora).
      const cres = await client.query(
        `SELECT id, anticipo_pct, created_by, residente_id, superintendente_id, supervision_id
           FROM contratos WHERE id = $1`,
        [contratoId]
      );
      if (cres.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El contrato indicado no existe' }); }
      const contrato = cres.rows[0];
      if (contrato.superintendente_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Solo el superintendente asignado a este contrato puede integrar estimaciones' });
      }
      // Sin % de anticipo definido => 0 (no hay amortización que aplicar).
      const anticipoPct = contrato.anticipo_pct == null ? 0 : Number(contrato.anticipo_pct);

      // (1b) GATING SERVER-SIDE del PDF firmado del contrato (antes solo era de UI, salteable por
      //      API directo). No se integra una estimación (carátula financiera append-only) sobre un
      //      contrato sin su PDF firmado ligado (formalización, HU-01). Si el anticipo supera el
      //      umbral, además debe existir la autorización del titular (art. 50 fr. IV LOPSRM). Umbral
      //      parametrizable (no se duplica el 30 hardcodeado de la UI). [validar art. 50 fr. IV con el profe].
      const pdfC = await client.query("SELECT 1 FROM contrato_documentos WHERE contrato_id=$1 AND tipo='contrato' LIMIT 1", [contratoId]);
      if (pdfC.rowCount === 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'El contrato no tiene su PDF firmado ligado; no se pueden integrar estimaciones (formalización pendiente, HU-01)' }); }
      const ANTICIPO_UMBRAL_PDF = Number(process.env.ANTICIPO_UMBRAL_PDF ?? 30);
      if (anticipoPct > ANTICIPO_UMBRAL_PDF) {
        const pdfA = await client.query("SELECT 1 FROM contrato_documentos WHERE contrato_id=$1 AND tipo='anticipo_autorizacion' LIMIT 1", [contratoId]);
        if (pdfA.rowCount === 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: `Anticipo ${anticipoPct}% supera el ${ANTICIPO_UMBRAL_PDF}%: falta la autorización del titular ligada (art. 50 fr. IV LOPSRM)` }); }
      }

      // (2) Serializa numeración, acumulación y no-solape por contrato (MAX+1 y SUM con
      //     el UNIQUE(contrato_id,numero) de respaldo). El lock se mantiene hasta el
      //     COMMIT, así que todo lo que leemos abajo ya incluye estimaciones previas
      //     confirmadas. Forma de DOS enteros (classid=2, objid=contrato_id): su espacio
      //     de claves NO se traslapa con el del bigint que usa bitacora_notas, así que la
      //     numeración de estimaciones queda aislada sin tocar el código de notas.
      await client.query('SELECT pg_advisory_xact_lock(2, $1::int)', [contratoId]);

      // (2b) NO-SOLAPE: el periodo no debe traslaparse con el de ninguna estimación NO
      //      rechazada del contrato (fechas que se tocan cuentan como solape).
      const solape = await client.query(
        `SELECT numero FROM estimaciones
          WHERE contrato_id = $1 AND estado <> 'rechazada'
            AND $2::date <= periodo_fin AND $3::date >= periodo_inicio
          ORDER BY numero`,
        [contratoId, periodoInicio, periodoFin]
      );
      if (solape.rowCount > 0) {
        await client.query('ROLLBACK');
        const nums = solape.rows.map((r) => r.numero).join(', ');
        return res.status(409).json({ error: `El periodo se traslapa con la(s) estimación(es): ${nums}` });
      }

      // (3) Los conceptos deben pertenecer al contrato (snapshot de PU y cantidad
      //     contratada desde el catálogo).
      const ccres = await client.query(
        `SELECT id, concepto, cantidad, pu FROM contrato_conceptos
          WHERE contrato_id = $1 AND id = ANY($2::int[])`,
        [contratoId, conceptoIds]
      );
      const ccMap = new Map(ccres.rows.map((r) => [r.id, r]));
      const ajenos = conceptoIds.filter((id) => !ccMap.has(id));
      if (ajenos.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Estos conceptos no pertenecen al contrato: ${ajenos.join(', ')}` });
      }

      // (4) Acumulado previo por concepto (estimaciones NO rechazadas del contrato).
      const acures = await client.query(
        `SELECT eg.contrato_concepto_id AS cid, COALESCE(SUM(eg.cantidad_periodo), 0) AS acum
           FROM estimacion_generadores eg
           JOIN estimaciones e ON e.id = eg.estimacion_id
          WHERE e.contrato_id = $1 AND e.estado <> 'rechazada'
            AND eg.contrato_concepto_id = ANY($2::int[])
          GROUP BY eg.contrato_concepto_id`,
        [contratoId, conceptoIds]
      );
      const acumMap = new Map(acures.rows.map((r) => [r.cid, Number(r.acum)]));

      // (5) Notas: cada una debe colgar de la bitácora de ESTE contrato (art. 132 fr. II).
      if (notasUnicas.length) {
        const nres = await client.query(
          `SELECT bn.id FROM bitacora_notas bn
             JOIN bitacora_aperturas ba ON ba.id = bn.bitacora_id
            WHERE ba.contrato_id = $1 AND bn.id = ANY($2::int[])`,
          [contratoId, notasUnicas]
        );
        const validas = new Set(nres.rows.map((r) => r.id));
        const notasAjenas = notasUnicas.filter((id) => !validas.has(id));
        if (notasAjenas.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Estas notas no pertenecen a la bitácora del contrato: ${notasAjenas.join(', ')}` });
        }
      }

      // (6) Validación art. 118 por línea (acumulado ≤ contratado) — usa cantidad, no importe.
      //     pu_snapshot se conserva como STRING exacto del catálogo (sin pasar por float).
      const excedidos = [];
      const lineas = generadores.map((g) => {
        const c = ccMap.get(g.contrato_concepto_id);
        const anterior = acumMap.get(g.contrato_concepto_id) || 0;
        if (anterior + g.cantidad_periodo > Number(c.cantidad) + EPS_CANT) excedidos.push(c.concepto);
        return {
          contrato_concepto_id: g.contrato_concepto_id,
          concepto: c.concepto,
          cantidad_periodo: g.cantidad_periodo,
          cantidad_anterior_acum: anterior,
          pu_snapshot: c.pu // string NUMERIC exacto (no Number(): evita el float)
        };
      });
      if (excedidos.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Excede lo contratado (art. 118 RLOPSRM) en: ${excedidos.join('; ')}`
        });
      }

      // (6c) ENDURECIMIENTO A2 (la otra mitad del art. 118): el acumulado por concepto no debe
      //      exceder lo PLANEADO en el programa de obra HASTA el periodo de la estimación (curva S).
      //      Solo aplica si el contrato tiene programa A2 (programa_obra); los contratos sin programa
      //      (legacy/precio alzado) se rigen solo por el art. 118 total de arriba. Fundamento: art. 45
      //      ap. A fr. X RLOPSRM (programa por periodos) + art. 52 LOPSRM (base del avance) + art. 118.
      //      [validar con el profe: bloqueo duro vs alerta].
      const tieneProg = await client.query('SELECT 1 FROM programa_obra po JOIN contrato_conceptos cc ON cc.id=po.contrato_concepto_id WHERE cc.contrato_id=$1 LIMIT 1', [contratoId]);
      if (tieneProg.rowCount > 0) {
        const plan = await client.query(
          `SELECT po.contrato_concepto_id AS cid, COALESCE(SUM(po.cantidad),0) AS planeado
             FROM programa_obra po JOIN contrato_periodos cp ON cp.id = po.contrato_periodo_id
            WHERE po.contrato_concepto_id = ANY($1::int[]) AND cp.fin <= $2::date
            GROUP BY po.contrato_concepto_id`,
          [conceptoIds, periodoFin]
        );
        const planMap = new Map(plan.rows.map((r) => [r.cid, Number(r.planeado)]));
        const sobrePlan = [];
        for (const g of generadores) {
          const anterior = acumMap.get(g.contrato_concepto_id) || 0;
          const planeado = planMap.get(g.contrato_concepto_id) || 0;
          if (anterior + g.cantidad_periodo > planeado + EPS_CANT) sobrePlan.push(ccMap.get(g.contrato_concepto_id).concepto);
        }
        if (sobrePlan.length) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: `Excede lo PLANEADO en el programa hasta este periodo (art. 45 ap. A fr. X RLOPSRM + art. 52 LOPSRM): ${sobrePlan.join('; ')}` });
        }
      }

      // (6b) Carátula con UN SOLO motor de redondeo (Postgres NUMERIC) y la MISMA fórmula
      //      Σ ROUND(cantidad×pu, 2) que el catálogo (contratos.controller) y que el detalle
      //      reproducido (detalleEstimacion): subtotal === Σ importes del detalle, al centavo.
      //        · RETENCIÓN FISCAL: 5 al millar (art. 191 LFD), ROUND UNA vez sobre el subtotal,
      //          nunca por renglón (art. 128 RLOPSRM). Es DISTINTA de las 'deductivas', que son
      //          retenciones ECONÓMICAS por atraso / penas convencionales (art. 46 / 46 Bis
      //          LOPSRM), capturadas aparte. (El 2 al millar CMIC sería otra retención FISCAL
      //          —LFD/acuerdos CMIC, no LOPSRM— y queda DIFERIDO.)
      //        · IVA: la estimación es SIN IVA (art. 2 fr. XIX RLOPSRM); el IVA se aplicaría una
      //          sola vez sobre el subtotal donde corresponda (factura/pago), nunca por renglón.
      //        · DRIFT entre estimaciones (DIFERIDO al finiquito): como cada estimación redondea
      //          su retención por separado, Σ ROUND(subtotal_i×0.005) puede diferir de
      //          ROUND(Σ subtotales×0.005). Reconciliación en la estimación de CIERRE:
      //          retencion_objetivo = ROUND(Σ subtotales × 0.005, 2); ajuste = objetivo − Σ retenido.
      const vals = lineas.map((_, i) => `($${i * 3 + 1}::int, $${i * 3 + 2}::numeric(14,4), $${i * 3 + 3}::numeric(16,4))`).join(', ');
      const prm = lineas.flatMap((l, i) => [i, l.cantidad_periodo, l.pu_snapshot]);
      const pA = prm.push(anticipoPct); // índice 1-based de anticipoPct
      const pD = prm.push(deductivas);  // índice 1-based de deductivas
      const cal = await client.query(
        `WITH gen(idx, cant, pu) AS (VALUES ${vals}),
              lin AS (SELECT idx, ROUND(cant * pu, 2)::numeric(14,2) AS importe FROM gen),
              sub AS (SELECT COALESCE(SUM(importe), 0)::numeric(14,2) AS subtotal FROM lin)
         SELECT s.subtotal,
                ROUND(s.subtotal * $${pA}::numeric / 100, 2)::numeric(14,2) AS amortizacion,
                ROUND(s.subtotal * 0.005, 2)::numeric(14,2)                 AS retencion,
                (s.subtotal
                   - ROUND(s.subtotal * $${pA}::numeric / 100, 2)
                   - ROUND(s.subtotal * 0.005, 2)
                   - $${pD}::numeric(14,2))::numeric(14,2)                  AS neto,
                (SELECT json_agg(importe::text ORDER BY idx) FROM lin)      AS importes
           FROM sub s`,
        prm
      );
      const { subtotal, amortizacion, retencion, neto, importes } = cal.rows[0];
      lineas.forEach((l, i) => { l.importe = importes[i]; }); // importe SQL-exacto para la respuesta
      // Las deductivas (manuales) no pueden dejar el neto en negativo.
      if (Number(neto) < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Las deductivas no pueden dejar el neto en negativo' });
      }

      // (7) Numeración correlativa atómica y carátula.
      const num = await client.query(
        'SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM estimaciones WHERE contrato_id = $1',
        [contratoId]
      );
      const numero = num.rows[0].numero;

      const ins = await client.query(
        `INSERT INTO estimaciones
           (contrato_id, numero, periodo_inicio, periodo_fin, estado, anticipo_pct_snapshot,
            subtotal, amortizacion, retencion, deductivas, neto, integrada_por)
         VALUES ($1, $2, $3, $4, 'integrada', $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, contrato_id, numero, periodo_inicio, periodo_fin, estado, anticipo_pct_snapshot,
                   subtotal, amortizacion, retencion, deductivas, neto, integrada_por, integrada_en`,
        [contratoId, numero, periodoInicio, periodoFin, anticipoPct, subtotal, amortizacion, retencion, deductivas, neto, req.user.id]
      );
      const estimacion = ins.rows[0];

      // (8) Generadores (con snapshots) y notas vinculadas.
      for (const l of lineas) {
        await client.query(
          `INSERT INTO estimacion_generadores
             (estimacion_id, contrato_concepto_id, cantidad_periodo, cantidad_anterior_acum, pu_snapshot)
           VALUES ($1, $2, $3, $4, $5)`,
          [estimacion.id, l.contrato_concepto_id, l.cantidad_periodo, l.cantidad_anterior_acum, l.pu_snapshot]
        );
      }
      for (const nid of notasUnicas) {
        await client.query(
          'INSERT INTO estimacion_notas (estimacion_id, nota_id) VALUES ($1, $2)',
          [estimacion.id, nid]
        );
      }

      await client.query('COMMIT');
      return res.status(201).json({ ...estimacion, generadores: lineas, notas: notasUnicas });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Número de estimación duplicado; reintenta' });
    console.error('[integrarEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/estimaciones/contrato/:contratoId — lista acotada por participación.
async function estimacionesDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contratoId inválido' });

    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a las estimaciones de este contrato' });
    }

    const r = await pool.query(
      `SELECT e.id, e.numero, e.periodo_inicio, e.periodo_fin, e.estado, e.subtotal, e.neto,
              e.integrada_por, u.nombre AS integrada_por_nombre, e.integrada_en
         FROM estimaciones e
         LEFT JOIN usuarios u ON u.id = e.integrada_por
        WHERE e.contrato_id = $1
        ORDER BY e.numero`,
      [contratoId]
    );
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[estimacionesDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/estimaciones/:id — detalle acotado por participación: carátula +
// generadores (con importe, acumulado y % de avance derivados) + notas vinculadas.
async function detalleEstimacion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    const e = await pool.query(
      `SELECT e.id, e.contrato_id, e.numero, e.periodo_inicio, e.periodo_fin, e.estado,
              e.anticipo_pct_snapshot, e.subtotal, e.amortizacion, e.retencion, e.deductivas, e.neto,
              e.integrada_por, u.nombre AS integrada_por_nombre, e.integrada_en,
              c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM estimaciones e
         JOIN contratos c ON c.id = e.contrato_id
         LEFT JOIN usuarios u ON u.id = e.integrada_por
        WHERE e.id = $1`,
      [id]
    );
    if (e.rowCount === 0) return res.status(404).json({ error: 'Estimación no encontrada' });
    const row = e.rows[0];
    if (!esParteOSupervision(req.user, row)) {
      return res.status(403).json({ error: 'No tienes acceso a esta estimación' });
    }

    const g = await pool.query(
      `SELECT eg.id, eg.contrato_concepto_id, cc.orden, cc.concepto, cc.unidad,
              cc.cantidad AS cantidad_contratada, eg.cantidad_periodo, eg.cantidad_anterior_acum, eg.pu_snapshot,
              ROUND(eg.cantidad_periodo * eg.pu_snapshot, 2) AS importe,
              (eg.cantidad_anterior_acum + eg.cantidad_periodo) AS acumulado,
              CASE WHEN cc.cantidad > 0
                   THEN ROUND((eg.cantidad_anterior_acum + eg.cantidad_periodo) / cc.cantidad * 100, 2)
                   ELSE NULL END AS avance_pct
         FROM estimacion_generadores eg
         JOIN contrato_conceptos cc ON cc.id = eg.contrato_concepto_id
        WHERE eg.estimacion_id = $1
        ORDER BY cc.orden`,
      [id]
    );

    const n = await pool.query(
      `SELECT en.nota_id, bn.numero, bn.tipo, bn.asunto, bn.estado, bn.fecha
         FROM estimacion_notas en
         JOIN bitacora_notas bn ON bn.id = en.nota_id
        WHERE en.estimacion_id = $1
        ORDER BY bn.numero`,
      [id]
    );

    // ACUMULADOS/SALDOS de la carátula (formato real GACM/NAICM): derivados de las estimaciones
    // PREVIAS no rechazadas + monto/anticipo del contrato. SIN IVA (art. 2 fr. XIX RLOPSRM); el IVA
    // del pago se trata aparte [decisión, ver doc]. Read-side: no muta la estimación inmutable.
    const cm = await pool.query(
      `SELECT c.monto,
              COALESCE(ROUND(c.monto * COALESCE(c.anticipo_pct,0)/100, 2),0)::numeric(18,2) AS importe_anticipo,
              COALESCE((SELECT SUM(subtotal)     FROM estimaciones e2 WHERE e2.contrato_id=$1 AND e2.estado<>'rechazada' AND e2.numero < $2),0)::numeric(18,2) AS est_acum_ant,
              COALESCE((SELECT SUM(amortizacion) FROM estimaciones e2 WHERE e2.contrato_id=$1 AND e2.estado<>'rechazada' AND e2.numero < $2),0)::numeric(18,2) AS amort_acum_ant
         FROM contratos c WHERE c.id=$1`,
      [row.contrato_id, row.numero]
    );
    const cmr = cm.rows[0];
    const N = (x) => Number(x);
    const estAcumAct = N(cmr.est_acum_ant) + N(row.subtotal);
    const amortAcumAct = N(cmr.amort_acum_ant) + N(row.amortizacion);
    const pct = (a, b) => (N(b) > 0 ? Number((N(a) / N(b) * 100).toFixed(2)) : null);
    const acumulados = {
      sin_iva: {
        importe_contrato: cmr.monto,
        estimado_acumulado_anterior: cmr.est_acum_ant, estimado_acumulado_anterior_pct: pct(cmr.est_acum_ant, cmr.monto),
        estimacion_actual: row.subtotal, estimacion_actual_pct: pct(row.subtotal, cmr.monto),
        estimado_acumulado_actual: estAcumAct.toFixed(2), estimado_acumulado_actual_pct: pct(estAcumAct, cmr.monto),
        saldo_por_estimar: (N(cmr.monto) - estAcumAct).toFixed(2), saldo_por_estimar_pct: pct(N(cmr.monto) - estAcumAct, cmr.monto)
      },
      anticipo: {
        importe_anticipo: cmr.importe_anticipo,
        amortizado_acumulado_anterior: cmr.amort_acum_ant, amortizado_acumulado_anterior_pct: pct(cmr.amort_acum_ant, cmr.importe_anticipo),
        amortizacion_actual: row.amortizacion, amortizacion_actual_pct: pct(row.amortizacion, cmr.importe_anticipo),
        amortizado_acumulado_actual: amortAcumAct.toFixed(2), amortizado_acumulado_actual_pct: pct(amortAcumAct, cmr.importe_anticipo),
        saldo_por_amortizar: (N(cmr.importe_anticipo) - amortAcumAct).toFixed(2), saldo_por_amortizar_pct: pct(N(cmr.importe_anticipo) - amortAcumAct, cmr.importe_anticipo)
      }
    };

    // No exponer el equipo del contrato en el detalle (solo se usó para el acceso).
    const { created_by, residente_id, superintendente_id, supervision_id, ...caratula } = row;
    return res.status(200).json({ ...caratula, acumulados, generadores: g.rows, notas: n.rows });
  } catch (err) {
    console.error('[detalleEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/estimaciones/contrato/:contratoId/avance — azúcar para el preview de
// generadores del cliente: por concepto del contrato, lo contratado + PU + el
// acumulado previo. acumulado_anterior usa EXACTAMENTE el mismo cálculo que el POST
// (Σ cantidad_periodo de estimaciones NO rechazadas), para que el preview del
// cliente y la validación del art. 118 coincidan. Acotado por participación.
async function avanceDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contratoId inválido' });

    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }

    const r = await pool.query(
      `SELECT cc.id AS contrato_concepto_id, cc.concepto, cc.unidad,
              cc.cantidad AS cantidad_contratada, cc.pu,
              COALESCE((
                SELECT SUM(eg.cantidad_periodo)
                  FROM estimacion_generadores eg
                  JOIN estimaciones e ON e.id = eg.estimacion_id
                 WHERE e.contrato_id = $1 AND e.estado <> 'rechazada'
                   AND eg.contrato_concepto_id = cc.id
              ), 0) AS acumulado_anterior
         FROM contrato_conceptos cc
        WHERE cc.contrato_id = $1
        ORDER BY cc.orden`,
      [contratoId]
    );
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[avanceDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { integrarEstimacion, estimacionesDeContrato, detalleEstimacion, avanceDeContrato };
