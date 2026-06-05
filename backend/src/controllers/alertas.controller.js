// HU-07: configuración de alertas de atraso por concepto del catálogo + evaluación
// de disparo por avance físico. Alcance Etapa 1:
// - El actor (creada_por) SIEMPRE sale del JWT, nunca del body.
// - canal SOLO 'sistema' (in-app); 'correo' depende de notificaciones (Etapa 2).
// - alerta_atraso NO tiene contrato_id: el contrato se resuelve por
//   contrato_concepto_id → contrato_conceptos.contrato_id → contratos, y se acota
//   con esParteOSupervision (igual que pagos.controller).
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

const CANAL_PERMITIDO = 'sistema';

// Columnas mínimas del contrato para esParteOSupervision (lib/acceso).
const COLS_ACCESO = 'created_by, residente_id, superintendente_id, supervision_id';

// Resuelve el contrato (para acotamiento) a partir de un contrato_concepto_id.
// Devuelve { contrato } o null si el concepto no existe.
async function contratoPorConcepto(conceptoId) {
  const r = await pool.query(
    `SELECT c.id AS contrato_id, ${COLS_ACCESO}
       FROM contrato_conceptos cc
       JOIN contratos c ON c.id = cc.contrato_id
      WHERE cc.id = $1`,
    [conceptoId]
  );
  return r.rowCount === 0 ? null : r.rows[0];
}

// Resuelve el contrato a partir de un id de alerta (vía su concepto).
// Devuelve { contrato } o null si la alerta no existe.
async function contratoPorAlerta(alertaId) {
  const r = await pool.query(
    `SELECT c.id AS contrato_id, ${COLS_ACCESO}
       FROM alerta_atraso a
       JOIN contrato_conceptos cc ON cc.id = a.contrato_concepto_id
       JOIN contratos c ON c.id = cc.contrato_id
      WHERE a.id = $1`,
    [alertaId]
  );
  return r.rowCount === 0 ? null : r.rows[0];
}

// GET /api/alertas/contrato/:contratoId — alertas del contrato + evaluación de
// disparo. Lectura acotada por participación (reusa acceso.js).
async function alertasDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) {
      return res.status(400).json({ error: 'contratoId inválido' });
    }

    const c = await pool.query(`SELECT id, ${COLS_ACCESO} FROM contratos WHERE id = $1`, [contratoId]);
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a las alertas de este contrato' });
    }

    // Una alerta por concepto del catálogo. El avance físico ejecutado se agrega
    // de concepto_avance (HU-06); LEFT JOIN para distinguir "sin avance" (NULL)
    // de "0 ejecutado". cc.cantidad es la cantidad contratada (denominador).
    const r = await pool.query(
      `SELECT a.id, a.contrato_concepto_id, a.umbral_pct, a.canal, a.activa, a.created_at,
              cc.clave, cc.concepto, cc.cantidad,
              av.ejecutado
         FROM alerta_atraso a
         JOIN contrato_conceptos cc ON cc.id = a.contrato_concepto_id
         LEFT JOIN (
           SELECT contrato_concepto_id, SUM(cantidad) AS ejecutado
             FROM concepto_avance
            GROUP BY contrato_concepto_id
         ) av ON av.contrato_concepto_id = a.contrato_concepto_id
        WHERE cc.contrato_id = $1
        ORDER BY a.created_at DESC, a.id DESC`,
      [contratoId]
    );

    const alertas = r.rows.map((row) => {
      const umbral = Number(row.umbral_pct);
      const cantidad = Number(row.cantidad);
      // "Sin avance registrado": el concepto no tiene filas en concepto_avance
      // (av.ejecutado IS NULL). NO se trata como 0% para evitar falsos disparos.
      const avanceRegistrado = row.ejecutado !== null && row.ejecutado !== undefined;
      let avancePct = null;
      if (avanceRegistrado && cantidad > 0) {
        avancePct = Math.round((Number(row.ejecutado) / cantidad) * 100 * 100) / 100;
      }
      const disparada = avanceRegistrado && row.activa && avancePct !== null && avancePct < umbral;
      return {
        id: row.id,
        contrato_concepto_id: row.contrato_concepto_id,
        concepto_label: row.clave ? `${row.clave} · ${row.concepto}` : row.concepto,
        umbral_pct: umbral,
        canal: row.canal,
        activa: row.activa,
        avance_pct: avancePct,
        avance_registrado: avanceRegistrado,
        disparada
      };
    });

    return res.status(200).json(alertas);
  } catch (err) {
    console.error('[alertasDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/alertas — crea {contrato_concepto_id, umbral_pct, canal:'sistema'}.
// Gate de rol en la ruta (residente); aquí se valida participación ANTES de insertar.
async function crearAlerta(req, res) {
  try {
    const body = req.body || {};
    const conceptoId = Number(body.contrato_concepto_id);
    const umbral = Number(body.umbral_pct);
    // canal opcional: default 'sistema'. 'correo' se rechaza explícito en Etapa 1.
    const canal = body.canal === undefined || body.canal === null || body.canal === ''
      ? CANAL_PERMITIDO
      : String(body.canal);

    if (!Number.isInteger(conceptoId) || conceptoId <= 0) {
      return res.status(400).json({ error: 'El concepto (contrato_concepto_id) es requerido' });
    }
    if (!Number.isFinite(umbral) || umbral < 0 || umbral > 100) {
      return res.status(400).json({ error: 'El umbral (umbral_pct) debe ser un número entre 0 y 100' });
    }
    if (canal === 'correo') {
      return res.status(400).json({ error: "El canal 'correo' no está disponible en Etapa 1" });
    }
    if (canal !== CANAL_PERMITIDO) {
      return res.status(400).json({ error: "El canal debe ser 'sistema'" });
    }

    const contrato = await contratoPorConcepto(conceptoId);
    if (!contrato) return res.status(404).json({ error: 'El concepto indicado no existe' });
    if (!esParteOSupervision(req.user, contrato)) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }

    const ins = await pool.query(
      `INSERT INTO alerta_atraso (contrato_concepto_id, umbral_pct, canal, creada_por)
       VALUES ($1, $2, $3, $4)
       RETURNING id, contrato_concepto_id, umbral_pct, canal, activa, creada_por, created_at`,
      [conceptoId, umbral, canal, req.user.id]
    );
    return res.status(201).json(ins.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'El concepto indicado no existe' }); // FK violada
    if (err.code === '23514') return res.status(400).json({ error: 'Hay valores fuera de rango (umbral 0–100 o canal inválido)' });
    console.error('[crearAlerta]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// PATCH /api/alertas/:id — pausar/reanudar (vía el booleano activa).
async function actualizarAlerta(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    const { activa } = req.body || {};
    if (typeof activa !== 'boolean') {
      return res.status(400).json({ error: 'El campo "activa" (booleano) es requerido' });
    }

    const contrato = await contratoPorAlerta(id);
    if (!contrato) return res.status(404).json({ error: 'La alerta indicada no existe' });
    if (!esParteOSupervision(req.user, contrato)) {
      return res.status(403).json({ error: 'No tienes acceso a esta alerta' });
    }

    const upd = await pool.query(
      `UPDATE alerta_atraso SET activa = $2
        WHERE id = $1
        RETURNING id, contrato_concepto_id, umbral_pct, canal, activa, creada_por, created_at`,
      [id, activa]
    );
    return res.status(200).json(upd.rows[0]);
  } catch (err) {
    console.error('[actualizarAlerta]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// DELETE /api/alertas/:id — elimina la configuración de la alerta.
async function eliminarAlerta(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    const contrato = await contratoPorAlerta(id);
    if (!contrato) return res.status(404).json({ error: 'La alerta indicada no existe' });
    if (!esParteOSupervision(req.user, contrato)) {
      return res.status(403).json({ error: 'No tienes acceso a esta alerta' });
    }

    await pool.query('DELETE FROM alerta_atraso WHERE id = $1', [id]);
    return res.status(200).json({ id });
  } catch (err) {
    console.error('[eliminarAlerta]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { alertasDeContrato, crearAlerta, actualizarAlerta, eliminarAlerta };
