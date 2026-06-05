// HU-14 (Equipo 3) — Historial del ciclo de cobro de una estimación.
// Consulta SOLA (read-only): no muta nada. Devuelve, por contrato, cada estimación
// con su estado ACTUAL y la línea de tiempo de TRANSICIONES en orden cronológico.
//
// OPCIÓN A (cierre de diseño): el ciclo se modela con COLUMNAS de `estimaciones`,
// NO hay tabla `estimacion_transiciones`. La línea de tiempo se DERIVA de la propia
// fila de la estimación. Hoy la única columna de evento que existe es la integración
// (integrada_en / integrada_por); el estado vigente sale de estimaciones.estado.
// Cuando HU-13 (envío), HU-15 (autorización/rechazo) y HU-21 (pago) añadan SUS
// columnas de sello de tiempo/autor, cada una agrega su evento en el punto de
// extensión marcado abajo. NO se referencian aquí columnas inexistentes.
//
// Acotamiento por participación idéntico a estimaciones.controller (HU-12): reusa
// authMiddleware (en la ruta) + esParteOSupervision (lib/acceso). NO se edita el
// controller congelado de HU-12: esto es un archivo nuevo del dominio E3.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

// GET /api/estimaciones-ciclo/contrato/:contratoId/historial
// Acotado por participación. Orden cronológico de estimaciones por número correlativo
// (= orden de integración). Incluye las rechazadas (CA-1: trazabilidad fiscal).
async function historialEstimaciones(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) {
      return res.status(400).json({ error: 'contratoId inválido' });
    }

    // (1) Contrato + auth localizada (404 antes que 403, espejo de HU-12).
    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso al historial de estimaciones de este contrato' });
    }

    // (2) Estimaciones del contrato (todas, incl. rechazadas) en orden cronológico.
    //     HU-13 añade el sello de envío (enviada_en/enviada_por) ya presente en el esquema.
    const est = await pool.query(
      `SELECT e.id, e.numero, e.contrato_id, e.estado, e.periodo_inicio, e.periodo_fin,
              e.subtotal, e.amortizacion, e.retencion, e.deductivas, e.neto,
              e.integrada_por, u.nombre AS integrada_por_nombre, e.integrada_en,
              e.enviada_por, ue.nombre AS enviada_por_nombre, e.enviada_en
         FROM estimaciones e
         LEFT JOIN usuarios u  ON u.id  = e.integrada_por
         LEFT JOIN usuarios ue ON ue.id = e.enviada_por
        WHERE e.contrato_id = $1
        ORDER BY e.numero`,
      [contratoId]
    );

    // (3) Arma cada estimación con su línea de tiempo DERIVADA de la fila.
    const salida = est.rows.map((e) => {
      // Línea de tiempo DERIVADA de la fila (Opción A — columnas de `estimaciones`).
      const transiciones = [
        {
          estado: 'integrada',
          estado_anterior: null,
          en: e.integrada_en,
          por: e.integrada_por,
          por_nombre: e.integrada_por_nombre
        }
        // PUNTO DE EXTENSIÓN (resto de HUs añaden su push SOLO cuando su columna exista):
        //   · HU-15  autorización: { estado: 'autorizada', en: e.autorizada_en, por: e.autorizada_por }
        //   · HU-15  rechazo:      { estado: 'rechazada',  en: e.rechazada_en,  por: e.rechazada_por }
        //   · HU-21  pago:         { estado: 'pagada',     en: e.pagada_en,     por: e.pagada_por }
      ];
      // HU-13 envío: sello que arranca el plazo del art. 54 LOPSRM (columnas ya en el esquema).
      if (e.enviada_en) {
        transiciones.push({
          estado: 'enviada',
          estado_anterior: 'integrada',
          en: e.enviada_en,
          por: e.enviada_por,
          por_nombre: e.enviada_por_nombre
        });
      }
      return {
        id: e.id,
        numero: e.numero,
        contrato_id: e.contrato_id,
        estado: e.estado,
        periodo_inicio: e.periodo_inicio,
        periodo_fin: e.periodo_fin,
        subtotal: e.subtotal,
        amortizacion: e.amortizacion,
        retencion: e.retencion,
        deductivas: e.deductivas,
        neto: e.neto,
        integrada_por: e.integrada_por,
        integrada_por_nombre: e.integrada_por_nombre,
        integrada_en: e.integrada_en,
        enviada_por: e.enviada_por,
        enviada_por_nombre: e.enviada_por_nombre,
        enviada_en: e.enviada_en,
        transiciones
      };
    });

    return res.status(200).json(salida);
  } catch (err) {
    console.error('[historialEstimaciones]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/estimaciones-ciclo/estimacion/:id/enviar — HU-13: ENVÍO de la estimación.
// Sella enviada_en = NOW() y enviada_por = req.user.id (del JWT, NUNCA del body) y avanza
// el estado 'integrada' -> 'enviada'. Escribe SOLO estado + sellos: NO toca la carátula.
// El trigger sigecop_estimacion_inmutable congela la carátula y deja LIBRE estado/enviada_*
// (a propósito, ver schema.sql ~L951 y la pasada de soporte HU-13/16), así que este UPDATE
// pasa sin tocar esquema congelado.
//
// Acceso: SOLO el superintendente asignado al contrato (HU-13 nivel 'E' = contratista; es la
// MISMA posición que integra en HU-12, no un rol global). Espejo de integrarEstimacion.
//
// Plazo art. 54 LOPSRM: el envío ARRANCA el plazo de revisión (15 días naturales). NO se
// persiste contador alguno: el semáforo se DERIVA en lectura desde enviada_en (aquí solo se
// sella la fecha). La notificación a residencia/supervisión es un indicador in-app derivado
// (la estimación 'enviada' figura como pendiente de revisión): sin tabla, cron ni correo.
async function enviarEstimacion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    // (1) Estimación + equipo del contrato. 404 antes que 403 (espejo de HU-12).
    const e = await pool.query(
      `SELECT e.id, e.numero, e.contrato_id, e.estado, e.enviada_en, e.enviada_por,
              c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM estimaciones e
         JOIN contratos c ON c.id = e.contrato_id
        WHERE e.id = $1`,
      [id]
    );
    if (e.rowCount === 0) return res.status(404).json({ error: 'Estimación no encontrada' });
    const row = e.rows[0];

    // (2) Acceso localizado: solo el superintendente del contrato envía sus estimaciones.
    if (row.superintendente_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el superintendente asignado a este contrato puede enviar sus estimaciones' });
    }

    // (3) Máquina de estados: solo se envía desde 'integrada'. No reenviar; no saltar/retroceder.
    if (row.estado === 'enviada') {
      return res.status(409).json({ error: 'La estimación ya fue enviada' });
    }
    if (row.estado !== 'integrada') {
      return res.status(409).json({ error: `No se puede enviar una estimación en estado '${row.estado}'` });
    }

    // (4) Sello ATÓMICO: el WHERE estado='integrada' serializa y bloquea el doble-envío en
    //     carrera (si otro proceso la envió entre el SELECT y el UPDATE, rowCount = 0).
    const upd = await pool.query(
      `UPDATE estimaciones
          SET estado = 'enviada', enviada_en = NOW(), enviada_por = $2
        WHERE id = $1 AND estado = 'integrada'
        RETURNING id, numero, contrato_id, estado, enviada_en, enviada_por`,
      [id, req.user.id]
    );
    if (upd.rowCount === 0) {
      return res.status(409).json({ error: 'La estimación ya fue enviada' });
    }
    return res.status(200).json(upd.rows[0]);
  } catch (err) {
    console.error('[enviarEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { historialEstimaciones, enviarEstimacion };
