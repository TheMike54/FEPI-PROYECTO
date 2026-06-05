// HU-06 (Equipo 2): registro de TRABAJOS TERMINADOS (avance ejecutado por concepto).
// Cada captura es una cantidad EJECUTADA imputada a un concepto del catálogo, a un
// periodo del programa (derivado de la fecha) y respaldada por una nota de bitácora
// tipo `avance`. Alimenta la curva ejecutada (HU-05).
//
// Reglas de dominio:
// - art. 118 RLOPSRM (BLOQUEO DURO, 409): por concepto, Σ cantidad ejecutada ≤ lo
//   contratado (contrato_conceptos.cantidad). Es CRUCE DE FILAS → se valida aquí, igual
//   que HU-12 valida el exceso de la estimación.
// - Exceso vs programa de obra por periodo (art. 45 ap. A fr. X RLOPSRM + art. 52
//   LOPSRM): NO bloquea, se devuelve como ALERTA en la respuesta (decisión Etapa 1).
// - Nota REQUERIDA cuando cantidad > 0: debe ser una bitacora_notas que cuelgue de la
//   bitácora de ESTE contrato y de tipo `avance` (art. 125 fr. II). Si falta o no cumple
//   → 400.
// - Captura EDITABLE (POST/PATCH/DELETE): no append-only; cada escritura revalida art. 118.
// - registrado_por SIEMPRE sale del JWT (req.user.id), nunca del body.
// - Acotamiento: el contrato llega vía el concepto; acceso por participación
//   (esParteOSupervision). El rol contratista (escritura) lo exige el router.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
function fechaValida(s) {
  if (typeof s !== 'string' || !PATRON_FECHA.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}
// Cuantiza a 3 decimales = escala REAL de concepto_avance.cantidad (NUMERIC(14,3)) y del
// catálogo (contrato_conceptos.cantidad). Validar/insertar sobre EXACTAMENTE el valor que
// se persiste evita que >3 decimales descuadren el art. 118.
function q3(n) { return Math.round((Number(n) + Number.EPSILON) * 1e3) / 1e3; }
// Tolerancia para comparar cantidades sin que el epsilon de float dispare un falso
// "excede" en el límite exacto (art. 118 permite acumulado == contratado). Misma EPS
// que estimaciones.controller.
const EPS_CANT = 1e-6;

// Carga concepto + el equipo del contrato (para auth) desde un contrato_concepto_id.
// null si el concepto no existe.
async function cargarConceptoContrato(client, conceptoId) {
  const r = await client.query(
    `SELECT cc.id AS concepto_id, cc.contrato_id, cc.concepto, cc.cantidad AS cantidad_contratada,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
       FROM contrato_conceptos cc
       JOIN contratos c ON c.id = cc.contrato_id
      WHERE cc.id = $1`,
    [conceptoId]
  );
  return r.rowCount ? r.rows[0] : null;
}

// El periodo del programa cuyo [inicio, fin] contiene la fecha (art. 54: mosaico contiguo
// sin solapes → a lo sumo uno). Devuelve la fila {id, numero, fin} o null si ninguno aplica.
async function derivarPeriodo(client, contratoId, fecha) {
  const r = await client.query(
    `SELECT id, numero, fin FROM contrato_periodos
      WHERE contrato_id = $1 AND inicio <= $2::date AND fin >= $2::date
      ORDER BY numero LIMIT 1`,
    [contratoId, fecha]
  );
  return r.rowCount ? r.rows[0] : null;
}

// Valida que nota_id sea una nota de la bitácora del contrato y de tipo `avance` (no
// anulada). Devuelve true/false. (La nota de tipo `avance` es la EXISTENTE del catálogo
// art. 125; no se crea ningún tipo nuevo.)
async function notaAvanceValida(client, contratoId, notaId) {
  const r = await client.query(
    `SELECT 1 FROM bitacora_notas bn
       JOIN bitacora_aperturas ba ON ba.id = bn.bitacora_id
      WHERE ba.contrato_id = $1 AND bn.id = $2 AND bn.tipo = 'avance' AND bn.estado <> 'anulada'`,
    [contratoId, notaId]
  );
  return r.rowCount > 0;
}

// Σ cantidad ejecutada por concepto, EXCLUYENDO opcionalmente una entrada (su id) — para
// que el PATCH no se cuente a sí mismo en la revalidación del art. 118.
async function acumuladoEjecutado(client, conceptoId, excluirId) {
  const r = await client.query(
    `SELECT COALESCE(SUM(cantidad), 0) AS acum
       FROM concepto_avance
      WHERE contrato_concepto_id = $1 AND ($2::int IS NULL OR id <> $2::int)`,
    [conceptoId, excluirId ?? null]
  );
  return Number(r.rows[0].acum);
}

// Alerta A2 (NO bloquea): Σ ejecutado hasta el periodo derivado > Σ planeado (programa_obra)
// hasta cp.fin. Solo aplica si hay periodo derivado y el contrato tiene programa. Devuelve
// el objeto de alerta o null. `nuevaCantidad` es la cantidad de ESTA captura; `excluirId`
// excluye la entrada en edición del acumulado ejecutado previo.
async function alertaProgramaPeriodo(client, concepto, periodo, nuevaCantidad, excluirId) {
  if (!periodo) return null;
  const plan = await client.query(
    `SELECT COALESCE(SUM(po.cantidad), 0) AS planeado
       FROM programa_obra po
       JOIN contrato_periodos cp ON cp.id = po.contrato_periodo_id
      WHERE po.contrato_concepto_id = $1 AND cp.fin <= $2::date`,
    [concepto.concepto_id, periodo.fin]
  );
  // Sin programa para este concepto → no hay curva planeada que comparar.
  if (Number(plan.rows[0].planeado) === 0) {
    const existe = await client.query(
      'SELECT 1 FROM programa_obra WHERE contrato_concepto_id = $1 LIMIT 1',
      [concepto.concepto_id]
    );
    if (existe.rowCount === 0) return null;
  }
  const planeado = Number(plan.rows[0].planeado);
  // Σ ejecutado de las OTRAS entradas imputadas a periodos hasta cp.fin + esta captura.
  const ejec = await client.query(
    `SELECT COALESCE(SUM(ca.cantidad), 0) AS ejecutado
       FROM concepto_avance ca
       JOIN contrato_periodos cp ON cp.id = ca.contrato_periodo_id
      WHERE ca.contrato_concepto_id = $1 AND cp.fin <= $2::date
        AND ($3::int IS NULL OR ca.id <> $3::int)`,
    [concepto.concepto_id, periodo.fin, excluirId ?? null]
  );
  const ejecutado = Number(ejec.rows[0].ejecutado) + Number(nuevaCantidad);
  if (ejecutado > planeado + EPS_CANT) {
    return {
      tipo: 'periodo_excede_programa',
      contrato_concepto_id: concepto.concepto_id,
      concepto: concepto.concepto,
      periodo_numero: periodo.numero,
      ejecutado,
      planeado,
      mensaje: `El avance acumulado hasta el periodo ${periodo.numero} (${ejecutado}) supera lo PLANEADO en el programa (${planeado}) para "${concepto.concepto}" — revisar curva S (art. 45 ap. A fr. X RLOPSRM + art. 52 LOPSRM).`
    };
  }
  return null;
}

// GET /api/trabajos/contrato/:contratoId — por concepto: contratada + acumulado ejecutado;
// las entradas de avance (con periodo, nota, fecha, cantidad); el programa (celdas
// planeadas) para la alerta; los periodos del contrato y las notas tipo `avance`
// vinculables. Acotado por participación.
async function trabajosDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) {
      return res.status(400).json({ error: 'contratoId inválido' });
    }

    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }

    // Conceptos del catálogo + acumulado ejecutado (Σ concepto_avance por concepto).
    const conceptos = await pool.query(
      `SELECT cc.id AS contrato_concepto_id, cc.clave, cc.concepto, cc.unidad,
              cc.cantidad AS cantidad_contratada,
              COALESCE((SELECT SUM(ca.cantidad) FROM concepto_avance ca
                         WHERE ca.contrato_concepto_id = cc.id), 0) AS acumulado_ejecutado
         FROM contrato_conceptos cc
        WHERE cc.contrato_id = $1
        ORDER BY cc.orden`,
      [contratoId]
    );

    // Entradas de avance del contrato (vía el concepto), con periodo, nota y fecha.
    const avances = await pool.query(
      `SELECT ca.id, ca.contrato_concepto_id, ca.contrato_periodo_id, cp.numero AS periodo_numero,
              ca.nota_id, bn.numero AS nota_numero, bn.asunto AS nota_asunto,
              ca.cantidad, ca.fecha, ca.observaciones, ca.registrado_por
         FROM concepto_avance ca
         JOIN contrato_conceptos cc ON cc.id = ca.contrato_concepto_id
         LEFT JOIN contrato_periodos cp ON cp.id = ca.contrato_periodo_id
         LEFT JOIN bitacora_notas bn ON bn.id = ca.nota_id
        WHERE cc.contrato_id = $1
        ORDER BY ca.fecha, ca.id`,
      [contratoId]
    );

    // Periodos REALES del contrato (la UI los usa para ubicar la fecha).
    const periodos = await pool.query(
      'SELECT id, numero, inicio, fin FROM contrato_periodos WHERE contrato_id = $1 ORDER BY numero',
      [contratoId]
    );

    // Celdas planeadas (programa_obra) para mostrar/alertar la curva por periodo.
    const programa = await pool.query(
      `SELECT po.contrato_concepto_id, po.contrato_periodo_id, po.cantidad
         FROM programa_obra po
         JOIN contrato_conceptos cc ON cc.id = po.contrato_concepto_id
        WHERE cc.contrato_id = $1`,
      [contratoId]
    );

    // Notas tipo `avance` vinculables (de la bitácora del contrato, no anuladas).
    const notas = await pool.query(
      `SELECT bn.id, bn.numero, bn.asunto, bn.fecha
         FROM bitacora_notas bn
         JOIN bitacora_aperturas ba ON ba.id = bn.bitacora_id
        WHERE ba.contrato_id = $1 AND bn.tipo = 'avance' AND bn.estado <> 'anulada'
        ORDER BY bn.numero`,
      [contratoId]
    );

    return res.status(200).json({
      conceptos: conceptos.rows,
      avances: avances.rows,
      periodos: periodos.rows,
      programa: programa.rows,
      notas: notas.rows
    });
  } catch (err) {
    console.error('[trabajosDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/trabajos — registra una entrada de avance. Deriva el periodo de la fecha,
// valida art. 118 (409), exige nota `avance` si cantidad > 0 (400) y devuelve la alerta
// A2 por periodo (no bloquea). registrado_por del JWT.
async function registrarAvance(req, res) {
  const body = req.body || {};
  const conceptoId = Number(body.contrato_concepto_id);
  if (!Number.isInteger(conceptoId) || conceptoId <= 0) {
    return res.status(400).json({ error: 'contrato_concepto_id es requerido' });
  }
  const cantRaw = Number(body.cantidad);
  if (!Number.isFinite(cantRaw) || cantRaw < 0) {
    return res.status(400).json({ error: 'cantidad debe ser un número mayor o igual a 0' });
  }
  const cantidad = q3(cantRaw);
  if (!fechaValida(body.fecha)) {
    return res.status(400).json({ error: 'fecha es requerida (AAAA-MM-DD)' });
  }
  const notaId = (body.nota_id === undefined || body.nota_id === null || body.nota_id === '')
    ? null : Number(body.nota_id);
  if (notaId !== null && (!Number.isInteger(notaId) || notaId <= 0)) {
    return res.status(400).json({ error: 'nota_id inválido' });
  }
  const observaciones = typeof body.observaciones === 'string' ? body.observaciones.trim() || null : null;

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const concepto = await cargarConceptoContrato(client, conceptoId);
      if (!concepto) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Concepto no encontrado' }); }
      if (!esParteOSupervision(req.user, concepto)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No tienes acceso a este contrato' });
      }

      // Nota REQUERIDA si cantidad > 0: debe colgar de la bitácora del contrato y ser tipo `avance`.
      if (cantidad > 0) {
        if (notaId === null) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Se requiere una nota de bitácora tipo `avance` cuando la cantidad es mayor a 0 (art. 125 fr. II)' });
        }
        if (!(await notaAvanceValida(client, concepto.contrato_id, notaId))) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'La nota debe ser una nota de la bitácora de este contrato y de tipo `avance` (art. 125 fr. II)' });
        }
      }

      // art. 118 (BLOQUEO): Σ ejecutado por concepto + esta cantidad ≤ contratado.
      const acum = await acumuladoEjecutado(client, conceptoId, null);
      if (acum + cantidad > Number(concepto.cantidad_contratada) + EPS_CANT) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Excede lo contratado (art. 118 RLOPSRM) en: ${concepto.concepto}` });
      }

      // Periodo derivado de la fecha (null si ninguno la contiene).
      const periodo = await derivarPeriodo(client, concepto.contrato_id, body.fecha);
      // Alerta A2 por periodo (NO bloquea).
      const alerta = await alertaProgramaPeriodo(client, concepto, periodo, cantidad, null);

      const ins = await client.query(
        `INSERT INTO concepto_avance
           (contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones, registrado_por`,
        [conceptoId, periodo ? periodo.id : null, notaId, cantidad, body.fecha, observaciones, req.user.id]
      );

      await client.query('COMMIT');
      return res.status(201).json({ avance: ins.rows[0], alertas: alerta ? [alerta] : [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[registrarAvance]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// PATCH /api/trabajos/:id — edita cantidad / nota / observaciones de una entrada.
// Revalida art. 118 (excluyéndose a sí misma) y recalcula la alerta A2. La fecha (y por
// tanto el periodo) NO cambia.
async function actualizarAvance(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
  const body = req.body || {};

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ares = await client.query(
        'SELECT id, contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones FROM concepto_avance WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (ares.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Avance no encontrado' }); }
      const actual = ares.rows[0];

      const concepto = await cargarConceptoContrato(client, actual.contrato_concepto_id);
      if (!concepto) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Concepto no encontrado' }); }
      if (!esParteOSupervision(req.user, concepto)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No tienes acceso a este contrato' });
      }

      // cantidad final (la nueva si se envía; si no, la actual).
      let cantidad = Number(actual.cantidad);
      if (body.cantidad !== undefined) {
        const cantRaw = Number(body.cantidad);
        if (!Number.isFinite(cantRaw) || cantRaw < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'cantidad debe ser un número mayor o igual a 0' });
        }
        cantidad = q3(cantRaw);
      }

      // nota_id final (la nueva si la clave viene en el body; si no, la actual).
      let notaId = actual.nota_id;
      if ('nota_id' in body) {
        notaId = (body.nota_id === null || body.nota_id === '') ? null : Number(body.nota_id);
        if (notaId !== null && (!Number.isInteger(notaId) || notaId <= 0)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'nota_id inválido' });
        }
      }

      // observaciones final.
      let observaciones = actual.observaciones;
      if ('observaciones' in body) {
        observaciones = typeof body.observaciones === 'string' ? body.observaciones.trim() || null : null;
      }

      // Nota REQUERIDA si la cantidad final > 0: debe ser válida (bitácora del contrato, tipo `avance`).
      if (cantidad > 0) {
        if (notaId === null) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Se requiere una nota de bitácora tipo `avance` cuando la cantidad es mayor a 0 (art. 125 fr. II)' });
        }
        if (!(await notaAvanceValida(client, concepto.contrato_id, notaId))) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'La nota debe ser una nota de la bitácora de este contrato y de tipo `avance` (art. 125 fr. II)' });
        }
      }

      // art. 118 (BLOQUEO): Σ ejecutado por concepto (excluyéndose) + cantidad final ≤ contratado.
      const acum = await acumuladoEjecutado(client, actual.contrato_concepto_id, id);
      if (acum + cantidad > Number(concepto.cantidad_contratada) + EPS_CANT) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Excede lo contratado (art. 118 RLOPSRM) en: ${concepto.concepto}` });
      }

      // Alerta A2 por periodo (periodo intacto: el guardado). NO bloquea.
      let periodo = null;
      if (actual.contrato_periodo_id) {
        const pr = await client.query('SELECT id, numero, fin FROM contrato_periodos WHERE id = $1', [actual.contrato_periodo_id]);
        periodo = pr.rowCount ? pr.rows[0] : null;
      }
      const alerta = await alertaProgramaPeriodo(client, concepto, periodo, cantidad, id);

      const upd = await client.query(
        `UPDATE concepto_avance SET cantidad = $2, nota_id = $3, observaciones = $4
          WHERE id = $1
         RETURNING id, contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones, registrado_por`,
        [id, cantidad, notaId, observaciones]
      );

      await client.query('COMMIT');
      return res.status(200).json({ avance: upd.rows[0], alertas: alerta ? [alerta] : [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[actualizarAvance]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// DELETE /api/trabajos/:id — elimina una entrada de avance. Acotado por participación.
async function eliminarAvance(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ares = await client.query('SELECT id, contrato_concepto_id FROM concepto_avance WHERE id = $1 FOR UPDATE', [id]);
      if (ares.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Avance no encontrado' }); }

      const concepto = await cargarConceptoContrato(client, ares.rows[0].contrato_concepto_id);
      if (!concepto) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Concepto no encontrado' }); }
      if (!esParteOSupervision(req.user, concepto)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No tienes acceso a este contrato' });
      }

      await client.query('DELETE FROM concepto_avance WHERE id = $1', [id]);
      await client.query('COMMIT');
      return res.status(200).json({ eliminado: true, id });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[eliminarAvance]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { trabajosDeContrato, registrarAvance, actualizarAvance, eliminarAvance };
