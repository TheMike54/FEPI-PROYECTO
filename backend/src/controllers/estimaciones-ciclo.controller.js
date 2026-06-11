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

// POST /api/estimaciones-ciclo/estimacion/:id/enviar — HU-13 (O7): REVISIÓN Y AUTORIZACIÓN de la
// estimación por la RESIDENCIA (art. 54 LOPSRM; el profe CONFIRMÓ invertir el flujo: el contratista
// PRESENTA en HU-12, la residencia AUTORIZA aquí). SIN migrar datos: el estado interno avanza
// 'integrada' -> 'enviada' (igual que antes) y se REUTILIZAN las columnas enviada_en/enviada_por como
// SELLO DE AUTORIZACIÓN (solo cambia la etiqueta de UI a "Autorizada", no las columnas). Escribe SOLO
// estado + sellos: NO toca la carátula. El trigger sigecop_estimacion_inmutable congela la carátula y
// deja LIBRE estado/enviada_*, así que este UPDATE pasa sin tocar esquema congelado. El endpoint
// conserva el path /enviar por compatibilidad de API (no es una columna).
//
// Acceso (O7): SOLO el RESIDENTE asignado al contrato (HU-13 nivel 'E' = residente; antes era el
// superintendente). Acotamiento de IDENTIDAD localizado (no un rol global), espejo de integrarEstimacion.
//
// Plazo art. 54 LOPSRM (referencia visual, NO bloqueante en esta fase): la autorización corre 15 días
// naturales desde la PRESENTACIÓN (integrada_en); el pago 20 días desde la AUTORIZACIÓN (enviada_en).
// El semáforo se DERIVA en lectura; aquí solo se sella la fecha.
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

    // (2) Acceso localizado (O7): solo el RESIDENTE del contrato autoriza sus estimaciones.
    if (row.residente_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el residente asignado a este contrato puede revisar y autorizar sus estimaciones (art. 54 LOPSRM)' });
    }

    // (3) Máquina de estados: solo se autoriza desde 'integrada' (Presentada). No reautorizar; no saltar.
    if (row.estado === 'enviada') {
      return res.status(409).json({ error: 'La estimación ya fue autorizada' });
    }
    if (row.estado !== 'integrada') {
      return res.status(409).json({ error: `No se puede autorizar una estimación en estado '${row.estado}'` });
    }

    // (4) Sello ATÓMICO: el WHERE estado='integrada' serializa y bloquea la doble-autorización en
    //     carrera (si otro proceso la autorizó entre el SELECT y el UPDATE, rowCount = 0).
    const upd = await pool.query(
      `UPDATE estimaciones
          SET estado = 'enviada', enviada_en = NOW(), enviada_por = $2
        WHERE id = $1 AND estado = 'integrada'
        RETURNING id, numero, contrato_id, estado, enviada_en, enviada_por`,
      [id, req.user.id]
    );
    if (upd.rowCount === 0) {
      return res.status(409).json({ error: 'La estimación ya fue autorizada' });
    }
    return res.status(200).json(upd.rows[0]);
  } catch (err) {
    console.error('[enviarEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// =====================================================================
// HU-15 (Equipo 3) — Recepción, revisión y autorización/rechazo de la estimación.
// SIN tocar esquema: se modela TODO con columnas que YA existen:
//   · La DECISIÓN avanza estimaciones.estado: 'enviada' -> 'autorizada' | 'rechazada'
//     (valores ya en chk_estimaciones_estado). El trigger sigecop_estimacion_inmutable
//     deja LIBRE 'estado', así que el UPDATE pasa sin tocar la carátula.
//   · OBSERVACIONES y TURNADO viven en estimacion_observaciones (seccion/tipo/severidad/
//     descripcion + autor_id/created_at para el quién/cuándo/motivo + turnado_a para el
//     turnado supervisión->residencia->contratista).
//   · El SEMÁFORO de 15 días (art. 54 LOPSRM) se DERIVA en el frontend desde enviada_en
//     (sello de HU-13). Aquí no se persiste contador.
// Roles (confirmado contra permisos.js HU-15: residente='E', supervision='E', dep='C'):
//   · Supervisión = contrato.supervision_id -> registra observaciones y TURNA.
//   · Residencia  = contrato.residente_id   -> AUTORIZA / RECHAZA (solo tras el turnado).
// Acotamiento de lectura por participación = esParteOSupervision (espejo de HU-12/14).

const SECCIONES = ['caratula', 'generadores', 'fotos', 'soportes', 'notas'];
const TIPOS = ['aclaracion', 'correccion', 'rechazo'];
const SEVERIDADES = ['menor', 'mayor', 'critica'];

// Carga la estimación con el equipo de su contrato. null si no existe.
async function cargarEstimacionConContrato(id) {
  const e = await pool.query(
    `SELECT e.id, e.numero, e.contrato_id, e.estado, e.periodo_inicio, e.periodo_fin,
            e.neto, e.enviada_en, e.enviada_por,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
       FROM estimaciones e
       JOIN contratos c ON c.id = e.contrato_id
      WHERE e.id = $1`,
    [id]
  );
  return e.rowCount === 0 ? null : e.rows[0];
}

// ¿La estimación ya fue turnada a residencia? = existe alguna observación con
// turnado_a='residencia' (el acto de turnar marca las observaciones o inserta un marcador).
async function estaTurnada(estimacionId) {
  const r = await pool.query(
    `SELECT 1 FROM estimacion_observaciones
      WHERE estimacion_id = $1 AND turnado_a = 'residencia' LIMIT 1`,
    [estimacionId]
  );
  return r.rowCount > 0;
}

// Observaciones de la estimación (con nombre del autor), orden cronológico.
async function listarObservaciones(estimacionId) {
  const r = await pool.query(
    `SELECT o.id, o.seccion, o.tipo, o.severidad, o.descripcion, o.estado,
            o.turnado_a, o.autor_id, u.nombre AS autor_nombre, o.created_at, o.solventada_en
       FROM estimacion_observaciones o
       LEFT JOIN usuarios u ON u.id = o.autor_id
      WHERE o.estimacion_id = $1
      ORDER BY o.created_at, o.id`,
    [estimacionId]
  );
  return r.rows;
}

// GET /api/estimaciones-ciclo/estimacion/:id/revision
// Estado de la revisión: estimación + observaciones + bandera de turnado. Lectura por
// participación (cualquier parte/supervisión/dependencia ve; el gating de ACCIÓN va en
// cada endpoint de escritura). El frontend deriva el semáforo desde enviada_en.
async function revisionEstimacion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    const est = await cargarEstimacionConContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) {
      return res.status(403).json({ error: 'No tienes acceso a la revisión de esta estimación' });
    }

    const observaciones = await listarObservaciones(id);
    const turnada = observaciones.some((o) => o.turnado_a === 'residencia');

    return res.status(200).json({
      id: est.id,
      numero: est.numero,
      contrato_id: est.contrato_id,
      estado: est.estado,
      periodo_inicio: est.periodo_inicio,
      periodo_fin: est.periodo_fin,
      neto: est.neto,
      enviada_en: est.enviada_en,
      enviada_por: est.enviada_por,
      // Posición del usuario en ESTE contrato (la UI muestra/oculta acciones; el backend revalida).
      es_supervision: est.supervision_id === req.user.id,
      es_residencia: est.residente_id === req.user.id,
      turnada,
      observaciones
    });
  } catch (err) {
    console.error('[revisionEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/estimaciones-ciclo/estimacion/:id/observaciones — supervisión registra una
// observación (CA-1). Solo en estado 'enviada' y ANTES de turnar.
async function crearObservacion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    const { seccion, tipo, severidad, descripcion } = req.body || {};
    if (!SECCIONES.includes(seccion)) return res.status(400).json({ error: 'seccion inválida' });
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'tipo inválido' });
    const sev = severidad || 'menor';
    if (!SEVERIDADES.includes(sev)) return res.status(400).json({ error: 'severidad inválida' });
    const desc = typeof descripcion === 'string' ? descripcion.trim() : '';
    if (!desc) return res.status(400).json({ error: 'La descripción de la observación es obligatoria' });

    const est = await cargarEstimacionConContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (est.supervision_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo la supervisión asignada al contrato puede registrar observaciones' });
    }
    if (est.estado !== 'enviada') {
      return res.status(409).json({ error: `No se pueden registrar observaciones en una estimación '${est.estado}'` });
    }
    if (await estaTurnada(id)) {
      return res.status(409).json({ error: 'La estimación ya fue turnada a residencia; la revisión de supervisión está cerrada' });
    }

    const ins = await pool.query(
      `INSERT INTO estimacion_observaciones (estimacion_id, seccion, tipo, severidad, descripcion, autor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, estimacion_id, seccion, tipo, severidad, descripcion, estado, turnado_a, autor_id, created_at`,
      [id, seccion, tipo, sev, desc, req.user.id]
    );
    return res.status(201).json(ins.rows[0]);
  } catch (err) {
    console.error('[crearObservacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// DELETE /api/estimaciones-ciclo/estimacion/:id/observaciones/:obsId — supervisión elimina
// SU propia observación, solo en 'enviada' y antes de turnar.
async function eliminarObservacion(req, res) {
  try {
    const id = Number(req.params.id);
    const obsId = Number(req.params.obsId);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    if (!Number.isInteger(obsId) || obsId <= 0) return res.status(400).json({ error: 'obsId inválido' });

    const est = await cargarEstimacionConContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (est.supervision_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo la supervisión asignada al contrato puede eliminar observaciones' });
    }
    if (est.estado !== 'enviada') {
      return res.status(409).json({ error: `No se pueden eliminar observaciones en una estimación '${est.estado}'` });
    }
    if (await estaTurnada(id)) {
      return res.status(409).json({ error: 'La estimación ya fue turnada a residencia; la revisión de supervisión está cerrada' });
    }

    const del = await pool.query(
      `DELETE FROM estimacion_observaciones
        WHERE id = $1 AND estimacion_id = $2 AND autor_id = $3
        RETURNING id`,
      [obsId, id, req.user.id]
    );
    if (del.rowCount === 0) {
      return res.status(404).json({ error: 'Observación no encontrada o no es tuya' });
    }
    return res.status(200).json({ id: del.rows[0].id });
  } catch (err) {
    console.error('[eliminarObservacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/estimaciones-ciclo/estimacion/:id/turnar — supervisión turna a residencia (CA-2).
// Marca turnado_a='residencia' en las observaciones; si no hay y se marca sin_observaciones,
// inserta un marcador (deja constancia del turnado). Tras esto, residencia puede resolver.
async function turnarEstimacion(req, res) {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    const sinObservaciones = !!(req.body && req.body.sin_observaciones);

    const est = await cargarEstimacionConContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (est.supervision_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo la supervisión asignada al contrato puede turnar la estimación' });
    }
    if (est.estado !== 'enviada') {
      return res.status(409).json({ error: `No se puede turnar una estimación '${est.estado}'` });
    }
    if (await estaTurnada(id)) {
      return res.status(409).json({ error: 'La estimación ya fue turnada a residencia' });
    }

    // ¿Cuántas observaciones hay? Define el camino (marcar vs marcador).
    const cnt = await pool.query(
      'SELECT COUNT(*)::int AS n FROM estimacion_observaciones WHERE estimacion_id = $1',
      [id]
    );
    const n = cnt.rows[0].n;
    if (n === 0 && !sinObservaciones) {
      return res.status(409).json({ error: 'Registra al menos una observación o marca la estimación sin observaciones para turnar' });
    }

    await client.query('BEGIN');
    if (n > 0) {
      await client.query(
        `UPDATE estimacion_observaciones SET turnado_a = 'residencia' WHERE estimacion_id = $1`,
        [id]
      );
    } else {
      // Marcador del turnado sin observaciones: deja constancia de quién/cuándo turnó.
      await client.query(
        `INSERT INTO estimacion_observaciones (estimacion_id, seccion, tipo, severidad, descripcion, turnado_a, autor_id)
         VALUES ($1, 'caratula', 'aclaracion', 'menor', 'Turnada a residencia sin observaciones de supervisión.', 'residencia', $2)`,
        [id, req.user.id]
      );
    }
    await client.query('COMMIT');

    const observaciones = await listarObservaciones(id);
    return res.status(200).json({ id, estado: est.estado, turnada: true, observaciones });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[turnarEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
}

// POST /api/estimaciones-ciclo/estimacion/:id/autorizar — residencia autoriza (CA-2).
// Requiere turnado previo. Avanza estado 'enviada' -> 'autorizada' de forma atómica.
async function autorizarEstimacion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    const est = await cargarEstimacionConContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (est.residente_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo la residencia asignada al contrato puede autorizar la estimación' });
    }
    if (est.estado !== 'enviada') {
      return res.status(409).json({ error: `No se puede autorizar una estimación '${est.estado}'` });
    }
    if (!(await estaTurnada(id))) {
      return res.status(409).json({ error: 'La estimación aún no ha sido turnada por supervisión' });
    }

    // Atómico: el WHERE estado='enviada' serializa y bloquea la doble resolución en carrera.
    const upd = await pool.query(
      `UPDATE estimaciones SET estado = 'autorizada'
        WHERE id = $1 AND estado = 'enviada'
        RETURNING id, numero, contrato_id, estado`,
      [id]
    );
    if (upd.rowCount === 0) {
      return res.status(409).json({ error: 'La estimación ya fue resuelta' });
    }
    return res.status(200).json(upd.rows[0]);
  } catch (err) {
    console.error('[autorizarEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/estimaciones-ciclo/estimacion/:id/rechazar — residencia rechaza (CA-2).
// Requiere turnado previo. Avanza estado 'enviada' -> 'rechazada' + registra la observación
// del rechazo (tipo='rechazo', turnado_a='contratista') con quién/cuándo/motivo. Atómico.
async function rechazarEstimacion(req, res) {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    const { motivo, seccion, severidad } = req.body || {};
    const mot = typeof motivo === 'string' ? motivo.trim() : '';
    if (!mot) return res.status(400).json({ error: 'El motivo del rechazo es obligatorio' });
    const sec = SECCIONES.includes(seccion) ? seccion : 'caratula';
    const sev = SEVERIDADES.includes(severidad) ? severidad : 'mayor';

    const est = await cargarEstimacionConContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (est.residente_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo la residencia asignada al contrato puede rechazar la estimación' });
    }
    if (est.estado !== 'enviada') {
      return res.status(409).json({ error: `No se puede rechazar una estimación '${est.estado}'` });
    }
    if (!(await estaTurnada(id))) {
      return res.status(409).json({ error: 'La estimación aún no ha sido turnada por supervisión' });
    }

    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE estimaciones SET estado = 'rechazada'
        WHERE id = $1 AND estado = 'enviada'
        RETURNING id, numero, contrato_id, estado`,
      [id]
    );
    if (upd.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La estimación ya fue resuelta' });
    }
    const obs = await client.query(
      `INSERT INTO estimacion_observaciones (estimacion_id, seccion, tipo, severidad, descripcion, turnado_a, autor_id)
       VALUES ($1, $2, 'rechazo', $3, $4, 'contratista', $5)
       RETURNING id, estimacion_id, seccion, tipo, severidad, descripcion, estado, turnado_a, autor_id, created_at`,
      [id, sec, sev, mot, req.user.id]
    );
    await client.query('COMMIT');
    return res.status(200).json({ estimacion: upd.rows[0], observacion: obs.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[rechazarEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
}

module.exports = {
  historialEstimaciones,
  enviarEstimacion,
  revisionEstimacion,
  crearObservacion,
  eliminarObservacion,
  turnarEstimacion,
  autorizarEstimacion,
  rechazarEstimacion
};
