// HU-07 v2 (O5, 10-jun) — ATRASO POR CONCEPTO, automático y en UNIDADES (rediseño del profe, P15).
// El panel ya NO se configura: para el contrato seleccionado se listan TODOS los conceptos con
// DÉFICIT = programado_acumulado(al periodo VIGENTE, programa_obra) − ejecutado_acumulado, en las
// UNIDADES del concepto, solo las filas con déficit > 0. Sin umbral, sin % y sin cron: se recalcula
// al consultar. Reglas:
// - "periodo actual" = el último periodo del contrato cuyo `inicio` ya pasó (inicio <= CURRENT_DATE);
//   si ninguno arrancó, no hay programado acumulado → no hay déficit.
// - programado_acumulado = Σ programa_obra del concepto en periodos con numero <= periodo actual (el
//   programa VIGENTE: los convenios lo reescriben en vivo vía guardarMatriz, igual que en O4/HU-06).
// - ejecutado_acumulado = Σ concepto_avance del concepto (TOTAL). Tomar el total (no acotado al periodo)
//   hace que "ir adelantado" NUNCA produzca un falso atraso y sobrevive a avances sin periodo (la matriz
//   se regenera con SET NULL); el déficit solo aparece cuando lo hecho va por debajo de lo que tocaba.
// - Acotamiento por participación (esParteOSupervision, igual que pagos/HU-06). HU-07 lo ven residente
//   (E) y supervisión (C); el badge del login y el "Asentar" los gatea el frontend por ese acceso.
// - "Asentar en bitácora" (residente, write) genera una nota de atraso (tag='atraso', tipo 'otro') usando
//   el folio atómico del controller de bitácora; EXIGE bitácora abierta (un atraso es derivado en vivo, no
//   un hecho persistido como sustitución/avance, así que no se difiere — se asienta un snapshot del momento).
// - La config previa (umbral/canal) queda RETIRADA: la tabla alerta_atraso se conserva pero ya no se usa.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
// O5: la nota de atraso reutiliza el folio atómico + la redacción del controller de bitácora (no se
// duplica la lógica de inmutabilidad; la nota es append-only como todas).
const { insertarNotaAtomica, textoNotaAtraso } = require('./bitacora.controller');

// Columnas mínimas del contrato para esParteOSupervision (lib/acceso).
const COLS_ACCESO = 'created_by, residente_id, superintendente_id, supervision_id';
// Tolerancia de redondeo (misma EPS que trabajos/estimaciones): un déficit por debajo de esto es 0.
const EPS_CANT = 1e-6;
// Cuantiza a 3 decimales = escala de las cantidades (NUMERIC(14,3)) para no mostrar ruido de float.
function q3(n) { return Math.round((Number(n) + Number.EPSILON) * 1e3) / 1e3; }

// El "periodo actual" del contrato: el de mayor número cuyo inicio ya ocurrió. null si ninguno arrancó.
// `db` = pool o client (ambos exponen .query).
async function periodoActualDe(db, contratoId) {
  const r = await db.query(
    `SELECT id, numero, inicio, fin
       FROM contrato_periodos
      WHERE contrato_id = $1 AND inicio <= CURRENT_DATE
      ORDER BY numero DESC
      LIMIT 1`,
    [contratoId]
  );
  return r.rowCount ? r.rows[0] : null;
}

// Déficit por concepto del contrato al periodo `paNum` (0 = ningún periodo arrancó). Devuelve TODAS
// las filas (con programado_acum, ejecutado_acum, deficit ya cuantizado); el llamador filtra > 0.
async function deficitsDeContrato(db, contratoId, paNum) {
  const r = await db.query(
    `SELECT cc.id AS contrato_concepto_id, cc.clave, cc.concepto, cc.unidad,
            cc.cantidad AS cantidad_contratada,
            COALESCE((SELECT SUM(po.cantidad)
                        FROM programa_obra po
                        JOIN contrato_periodos cp ON cp.id = po.contrato_periodo_id
                       WHERE po.contrato_concepto_id = cc.id AND cp.numero <= $2), 0) AS programado_acum,
            COALESCE((SELECT SUM(ca.cantidad)
                        FROM concepto_avance ca
                       WHERE ca.contrato_concepto_id = cc.id), 0) AS ejecutado_acum
       FROM contrato_conceptos cc
      WHERE cc.contrato_id = $1
      ORDER BY cc.orden`,
    [contratoId, paNum]
  );
  return r.rows.map((row) => {
    const programado = q3(row.programado_acum);
    const ejecutado = q3(row.ejecutado_acum);
    const deficit = q3(programado - ejecutado);
    return {
      contrato_concepto_id: row.contrato_concepto_id,
      clave: row.clave,
      concepto: row.concepto,
      unidad: row.unidad,
      concepto_label: row.clave ? `${row.clave} · ${row.concepto}` : row.concepto,
      cantidad_contratada: q3(row.cantidad_contratada),
      programado_acumulado: programado,
      ejecutado_acumulado: ejecutado,
      deficit
    };
  });
}

// GET /api/alertas/contrato/:contratoId — panel AUTOMÁTICO de atraso por concepto del contrato.
// Lectura acotada por participación. Solo conceptos con déficit > 0, en unidades, al periodo vigente.
async function alertasDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) {
      return res.status(400).json({ error: 'contratoId inválido' });
    }

    const c = await pool.query(`SELECT id, ${COLS_ACCESO} FROM contratos WHERE id = $1`, [contratoId]);
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso al atraso de este contrato' });
    }

    const periodo = await periodoActualDe(pool, contratoId);
    const paNum = periodo ? periodo.numero : 0;
    const todos = await deficitsDeContrato(pool, contratoId, paNum);
    const atrasos = todos.filter((f) => f.deficit > EPS_CANT);

    return res.status(200).json({
      contrato_id: contratoId,
      periodo_actual: periodo ? { numero: periodo.numero, inicio: periodo.inicio, fin: periodo.fin } : null,
      total_conceptos: todos.length,
      total_atrasos: atrasos.length,
      atrasos
    });
  } catch (err) {
    console.error('[alertasDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/alertas/resumen — AVISO al iniciar sesión: cuántos conceptos con déficit y en cuántos
// contratos, ACOTADO por participación (el frontend solo muestra el badge a residente/supervisión).
// Una sola consulta: por contrato accesible, su periodo vigente (max numero con inicio <= hoy) y, por
// concepto, programado_acum(≤ ese periodo) − ejecutado_acum(total) > 0.
async function resumenAtrasos(req, res) {
  try {
    const uid = req.user.id;
    const venTodo = req.user.rol === 'dependencia' || req.user.rol === 'finanzas';
    const r = await pool.query(
      `WITH contratos_acc AS (
         SELECT id FROM contratos
          WHERE $2::boolean
             OR created_by = $1 OR residente_id = $1 OR superintendente_id = $1 OR supervision_id = $1
       ),
       pa AS (
         SELECT contrato_id, MAX(numero) AS pa_num
           FROM contrato_periodos
          WHERE inicio <= CURRENT_DATE
          GROUP BY contrato_id
       ),
       defic AS (
         SELECT cc.contrato_id,
                COALESCE((SELECT SUM(po.cantidad)
                            FROM programa_obra po
                            JOIN contrato_periodos cp ON cp.id = po.contrato_periodo_id
                           WHERE po.contrato_concepto_id = cc.id
                             AND cp.numero <= COALESCE(pa.pa_num, 0)), 0)
              - COALESCE((SELECT SUM(ca.cantidad)
                            FROM concepto_avance ca
                           WHERE ca.contrato_concepto_id = cc.id), 0) AS deficit
           FROM contrato_conceptos cc
           JOIN contratos_acc ON contratos_acc.id = cc.contrato_id
           LEFT JOIN pa ON pa.contrato_id = cc.contrato_id
       )
       SELECT COUNT(*)                    FILTER (WHERE deficit > $3) AS conceptos,
              COUNT(DISTINCT contrato_id) FILTER (WHERE deficit > $3) AS contratos
         FROM defic`,
      [uid, venTodo, EPS_CANT]
    );
    const row = r.rows[0] || {};
    return res.status(200).json({
      conceptos: Number(row.conceptos || 0),
      contratos: Number(row.contratos || 0)
    });
  } catch (err) {
    console.error('[resumenAtrasos]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/alertas/contrato/:contratoId/asentar — body { contrato_concepto_id }. Genera la nota de
// ATRASO del concepto en la bitácora (residente; participación además en el controller). Es un snapshot
// EN VIVO: exige bitácora abierta (no se difiere) y solo procede si el concepto tiene déficit > 0 ahora.
async function asentarAtraso(req, res) {
  const contratoId = Number(req.params.contratoId);
  if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contratoId inválido' });
  const conceptoId = Number((req.body || {}).contrato_concepto_id);
  if (!Number.isInteger(conceptoId) || conceptoId <= 0) {
    return res.status(400).json({ error: 'contrato_concepto_id es requerido' });
  }

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const c = await client.query(`SELECT id, ${COLS_ACCESO} FROM contratos WHERE id = $1`, [contratoId]);
      if (c.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El contrato indicado no existe' }); }
      if (!esParteOSupervision(req.user, c.rows[0])) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No tienes acceso al atraso de este contrato' });
      }

      // El concepto debe pertenecer al contrato (no se asienta el atraso de un concepto ajeno).
      const cc = await client.query(
        'SELECT id, clave, concepto, unidad FROM contrato_conceptos WHERE id = $1 AND contrato_id = $2',
        [conceptoId, contratoId]
      );
      if (cc.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El concepto no pertenece a este contrato' }); }
      const concepto = cc.rows[0];

      // Déficit ACTUAL del concepto (mismo cálculo que el panel). Sin atraso → nada que asentar.
      const periodo = await periodoActualDe(client, contratoId);
      const paNum = periodo ? periodo.numero : 0;
      const filas = await deficitsDeContrato(client, contratoId, paNum);
      const fila = filas.find((f) => f.contrato_concepto_id === conceptoId);
      if (!fila || fila.deficit <= EPS_CANT) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `El concepto "${concepto.concepto}" no tiene atraso al periodo actual; nada que asentar.` });
      }

      // Snapshot en vivo: exige bitácora abierta (Q1 — un atraso es derivado, no se difiere).
      const bit = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [contratoId]);
      if (bit.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'El contrato no tiene bitácora abierta; ábrela para asentar el atraso en la bitácora (art. 123 RLOPSRM).' });
      }

      // FIX 1.5 — idempotencia: UN solo asiento de atraso por (concepto, periodo). El registro append-only de
      // bitácora (art. 123 RLOPSRM) no debe ensuciarse con la misma consecuencia repetida. Pre-chequeo dentro
      // de la tx; el UNIQUE uq_atraso_asentado es la red dura ante POST concurrentes (2.º → 23505 → 409 abajo).
      const periodoNum = periodo ? periodo.numero : 0;
      const yaAsentado = await client.query(
        'SELECT 1 FROM atraso_asentado WHERE contrato_concepto_id = $1 AND periodo_numero = $2',
        [conceptoId, periodoNum]
      );
      if (yaAsentado.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `El atraso del concepto "${concepto.concepto}" ya fue asentado en la bitácora para el periodo ${periodoNum || '—'}; no se duplica.` });
      }

      const { asunto, contenido } = textoNotaAtraso({
        concepto: concepto.concepto, unidad: concepto.unidad,
        cantidad: fila.deficit, periodoNumero: periodo ? periodo.numero : null
      });
      // O-PROFE: la nota de ATRASO es de CONSECUENCIA → la AVALA el RESIDENTE del contrato (art. 53
      // LOPSRM), no quien dispara la acción (aunque hoy solo el residente puede asentar). Emisor =
      // residente_id del contrato. Tipo PROPIO 'atraso' del catálogo (art. 125 fr. I), ya no 'otro'+tag.
      const nota = await insertarNotaAtomica(client, {
        bitacoraId: bit.rows[0].id, tipo: 'atraso', asunto, contenido,
        emisorId: c.rows[0].residente_id || req.user.id, tag: 'atraso'
      });

      // FIX 1.5 — registra el asiento (concepto, periodo) ligado a la nota → evita duplicados (uq_atraso_asentado).
      await client.query(
        'INSERT INTO atraso_asentado (contrato_concepto_id, periodo_numero, nota_id, asentado_por) VALUES ($1, $2, $3, $4)',
        [conceptoId, periodoNum, nota.id, req.user.id]
      );

      await client.query('COMMIT');
      return res.status(201).json({
        ok: true,
        contrato_id: contratoId,
        contrato_concepto_id: conceptoId,
        deficit: fila.deficit,
        unidad: concepto.unidad,
        periodo: periodo ? periodo.numero : null,
        nota: { id: nota.id, numero: nota.numero, tipo: nota.tipo, tag: nota.tag }
      });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') {
      // FIX 1.5 — colisión del UNIQUE de atraso (carrera entre dos POST del mismo concepto/periodo) vs folio de nota.
      if (err.constraint === 'uq_atraso_asentado') return res.status(409).json({ error: 'El atraso de ese concepto ya fue asentado para el periodo; no se duplica.' });
      return res.status(409).json({ error: 'Folio de nota duplicado; reintenta' });
    }
    console.error('[asentarAtraso]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/alertas/detalle?contrato=ID — DETALLE accionable de atrasos por concepto (FILAS, no conteos), para el
// CENTRO DE NOTIFICACIONES y los accesos directos de la campana. MISMO cálculo que resumenAtrasos (déficit al
// periodo vigente, programado_acum − ejecutado_acum), ACOTADO por participación; con ?contrato acota al contrato
// ACTIVO. LIMIT defensivo (100). Solo lectura; archivo NO congelado (router /alertas ya montado en server.js).
async function alertasDetalle(req, res) {
  try {
    const uid = req.user.id;
    const venTodo = req.user.rol === 'dependencia' || req.user.rol === 'finanzas';
    const contratoFiltro = req.query.contrato ? Number(req.query.contrato) : null;
    if (contratoFiltro != null && (!Number.isInteger(contratoFiltro) || contratoFiltro <= 0)) {
      return res.status(400).json({ error: 'contrato inválido' });
    }
    const r = await pool.query(
      `WITH contratos_acc AS (
         SELECT id, folio FROM contratos
          WHERE ($3::int IS NULL OR id = $3)
            AND ($2::boolean
              OR created_by = $1 OR residente_id = $1 OR superintendente_id = $1 OR supervision_id = $1)
       ),
       pa AS (
         SELECT contrato_id, MAX(numero) AS pa_num
           FROM contrato_periodos WHERE inicio <= CURRENT_DATE GROUP BY contrato_id
       )
       SELECT cc.contrato_id, ca_c.folio, cc.id AS contrato_concepto_id, cc.clave, cc.concepto, cc.unidad,
              ( COALESCE((SELECT SUM(po.cantidad) FROM programa_obra po
                           JOIN contrato_periodos cp ON cp.id = po.contrato_periodo_id
                          WHERE po.contrato_concepto_id = cc.id AND cp.numero <= COALESCE(pa.pa_num, 0)), 0)
              - COALESCE((SELECT SUM(av.cantidad) FROM concepto_avance av WHERE av.contrato_concepto_id = cc.id), 0)
              ) AS deficit
         FROM contrato_conceptos cc
         JOIN contratos_acc ca_c ON ca_c.id = cc.contrato_id
         LEFT JOIN pa ON pa.contrato_id = cc.contrato_id
        ORDER BY cc.contrato_id, cc.orden`,
      [uid, venTodo, contratoFiltro]
    );
    const filas = r.rows
      .map((row) => ({
        contrato_id: row.contrato_id,
        folio: row.folio,
        contrato_concepto_id: row.contrato_concepto_id,
        clave: row.clave,
        concepto: row.concepto,
        unidad: row.unidad,
        concepto_label: row.clave ? `${row.clave} · ${row.concepto}` : row.concepto,
        deficit: q3(row.deficit),
      }))
      .filter((f) => f.deficit > EPS_CANT)
      .slice(0, 100);
    return res.status(200).json(filas);
  } catch (err) {
    console.error('[alertasDetalle]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { alertasDeContrato, resumenAtrasos, asentarAtraso, alertasDetalle };
