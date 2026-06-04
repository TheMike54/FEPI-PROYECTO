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
    const est = await pool.query(
      `SELECT e.id, e.numero, e.contrato_id, e.estado, e.periodo_inicio, e.periodo_fin,
              e.subtotal, e.amortizacion, e.retencion, e.deductivas, e.neto,
              e.integrada_por, u.nombre AS integrada_por_nombre, e.integrada_en
         FROM estimaciones e
         LEFT JOIN usuarios u ON u.id = e.integrada_por
        WHERE e.contrato_id = $1
        ORDER BY e.numero`,
      [contratoId]
    );

    // (3) Arma cada estimación con su línea de tiempo DERIVADA de la fila.
    const salida = est.rows.map((e) => {
      // Único evento que existe hoy: la integración (columnas ya presentes).
      const transiciones = [
        {
          estado: 'integrada',
          estado_anterior: null,
          en: e.integrada_en,
          por: e.integrada_por,
          por_nombre: e.integrada_por_nombre
        }
        // PUNTO DE EXTENSIÓN (Opción A — columnas de `estimaciones`, sin tabla aparte):
        //   · HU-13  envío:        { estado: 'enviada',    en: e.enviada_en,    por: e.enviada_por }
        //   · HU-15  autorización: { estado: 'autorizada', en: e.autorizada_en, por: e.autorizada_por }
        //   · HU-15  rechazo:      { estado: 'rechazada',  en: e.rechazada_en,  por: e.rechazada_por }
        //   · HU-21  pago:         { estado: 'pagada',     en: e.pagada_en,     por: e.pagada_por }
        // Cada HU añade su push SOLO cuando su columna exista (no referenciar antes).
      ];
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
        transiciones
      };
    });

    return res.status(200).json(salida);
  } catch (err) {
    console.error('[historialEstimaciones]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { historialEstimaciones };
