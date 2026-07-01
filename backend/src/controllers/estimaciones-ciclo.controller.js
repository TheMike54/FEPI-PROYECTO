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
// OLEADA B (14-jun) — nota automática de bitácora ligada al ciclo de la estimación (art. 125 RLOPSRM,
// confirmado por el profe): al PRESENTAR (sup_estimaciones, fr. II-b) y al AUTORIZAR (res_estimaciones,
// fr. I-b). Reusa el folio atómico + inmutabilidad del controller de bitácora (no se duplica la lógica).
const { insertarNotaAtomica } = require('./bitacora.controller');
// Oleada 1 bug #25: al reingresar se copian los soportes documentales; se asegura su tabla antes de la tx
// (idempotente, memoizado) para que el INSERT ... SELECT no falle si la tabla aún no existía.
const { ensureSchema: ensureSoportesSchema } = require('./estimacion-soportes.controller');

// BUG #2 (Oleada 2): FECHA JURÍDICA/FORMAL de la nota de estimación. Se DERIVA del fin del periodo (mes de
// la estimación) para que una estimación de junio presentada/autorizada el 1-jul quede timbrada
// formalmente en JUNIO, no en el reloj del servidor. Si el body trae `fecha_nota`, se valida que caiga en
// la MISMA mensualidad del periodo (art. 54 LOPSRM: la estimación corresponde a su periodo mensual); si no
// concuerda, se rechaza (el caller devuelve 409). `firmado_en` (firma real) NO cambia.
function normISOfecha(v) {
  // pg entrega DATE como objeto Date (UTC medianoche). String(Date) da la cadena LOCAL ("Tue Mar 31…"),
  // no ISO → hay que formatear por partes UTC para obtener 'YYYY-MM-DD' correcto y TZ-safe.
  if (v instanceof Date) {
    const z = (n) => String(n).padStart(2, '0');
    return `${v.getUTCFullYear()}-${z(v.getUTCMonth() + 1)}-${z(v.getUTCDate())}`;
  }
  return String(v || '').slice(0, 10);
}
function fechaNotaDePeriodo(periodoFinISO, fechaNotaBody) {
  const pf = normISOfecha(periodoFinISO); // 'YYYY-MM-DD'
  if (fechaNotaBody != null && String(fechaNotaBody).trim() !== '') {
    const fn = String(fechaNotaBody).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fn)) return { error: 'La fecha de la nota es inválida (formato YYYY-MM-DD).' };
    if (fn.slice(0, 7) !== pf.slice(0, 7)) {
      return { error: `La fecha de la nota (${fn}) no corresponde al mes del periodo de la estimación (${pf.slice(0, 7)}); una estimación se timbra en su mensualidad (art. 54 LOPSRM).` };
    }
    return { fechaNota: fn };
  }
  return { fechaNota: pf || null }; // deriva del fin del periodo (mes de la estimación)
}

// FIX 1.1 — FINIQUITO bloquea el ciclo. Con el contrato CERRADO (finiquito elaborado), el art. 64 LOPSRM
// declara "extinguidos los derechos y obligaciones asumidos por ambas partes" (verificado en docs/legal):
// el saldo se liquida por el finiquito, no por estimaciones nuevas. Gate reusable (espejo del que ya existe
// en instruccion-pago para el pago). Requiere que el row traiga `contrato_estado` (c.estado AS contrato_estado).
function gateContratoCerrado(res, fila, accion) {
  if (fila && fila.contrato_estado === 'cerrado') {
    res.status(409).json({ error: `El contrato ya está cerrado (finiquito elaborado); ${accion}. El saldo se liquida por el finiquito (art. 64 LOPSRM).` });
    return true;
  }
  return false;
}

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
              e.enviada_por, ue.nombre AS enviada_por_nombre, e.enviada_en,
              e.reemplaza_a,
              -- G7 (mínima, SIN DDL): fechas de autorización/rechazo/pago DERIVADAS de datos ya existentes
              -- (no hay columnas-sello en estimaciones). Autorización = fecha de la nota res_estimaciones;
              -- rechazo = fecha de la observación tipo 'rechazo'; pago = fecha del pago registrado.
              (SELECT p.fecha_pago FROM pagos p WHERE p.estimacion_id = e.id ORDER BY p.id LIMIT 1) AS pagada_en,
              (SELECT MIN(bn.fecha) FROM estimacion_notas en JOIN bitacora_notas bn ON bn.id = en.nota_id
                WHERE en.estimacion_id = e.id AND bn.tipo = 'res_estimaciones' AND bn.tag = 'estimacion') AS autorizada_en,
              (SELECT MIN(eo.created_at) FROM estimacion_observaciones eo
                WHERE eo.estimacion_id = e.id AND eo.tipo = 'rechazo') AS rechazada_en
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
      // G7 (mínima, SIN DDL): autorización / rechazo / pago con fecha DERIVADA (ver SELECT). por/por_nombre
      // quedan null porque no se sella el autor sin columnas nuevas; la FECHA es lo que pide el historial.
      // #24 (25-jun) — la derivación ahora es CONSISTENTE con e.estado (antes pintaba transiciones imposibles
      // ante señales colaterales inconsistentes): NO se pinta 'rechazada' si el estado final es autorizada/pagada,
      // y SÍ se pinta 'autorizada' cuando el estado final lo implica aunque falte la nota res_estimaciones.
      const autorizadaOPagada = (e.estado === 'autorizada' || e.estado === 'pagada');
      if (e.autorizada_en || autorizadaOPagada) transiciones.push({ estado: 'autorizada', estado_anterior: 'enviada', en: e.autorizada_en, por: null, por_nombre: null });
      if (e.rechazada_en && e.estado === 'rechazada') transiciones.push({ estado: 'rechazada', estado_anterior: 'enviada', en: e.rechazada_en, por: null, por_nombre: null });
      if (e.pagada_en) transiciones.push({ estado: 'pagada', estado_anterior: 'autorizada', en: e.pagada_en, por: null, por_nombre: null });
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
        // HU-16: puntero a la estimación RECHAZADA que esta versión reingresa (null si
        // no es un reingreso). La trazabilidad de versiones y la derivación del plazo
        // del art. 54 (que NO se reinicia) se arman en lectura a partir de este campo.
        reemplaza_a: e.reemplaza_a,
        transiciones
      };
    });

    return res.status(200).json(salida);
  } catch (err) {
    console.error('[historialEstimaciones]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/estimaciones-ciclo/estimacion/:id/enviar — HU-13: PRESENTACIÓN de la estimación por el
// CONTRATISTA (art. 54 LOPSRM). RECONCILIACIÓN O7↔HU-15: O7 había puesto aquí la autorización del
// residente porque HU-15 no existía; ahora HU-15 implementa la autorización REAL (supervisión revisa →
// turna → residencia autoriza). Por eso HU-13 REGRESA a su sentido original: el contratista (puesto =
// superintendente) PRESENTA la estimación 'integrada' → 'enviada' (= "Presentada"). Sella enviada_en =
// NOW() y enviada_por = req.user.id (del JWT). El trigger sigecop_estimacion_inmutable congela la
// carátula y deja LIBRE estado/enviada_*; el endpoint conserva el path /enviar por compatibilidad.
//
// Acceso: SOLO el superintendente asignado al contrato (HU-13 nivel 'E' = contratista; MISMA posición
// que integra en HU-12, espejo de integrarEstimacion).
//
// Plazo art. 54 LOPSRM (referencia visual): la revisión/autorización corre 15 días naturales desde la
// PRESENTACIÓN (enviada_en, sellado aquí). El semáforo se DERIVA en lectura; aquí solo se sella la fecha.
async function enviarEstimacion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    // (1) Estimación + equipo del contrato. 404 antes que 403 (espejo de HU-12).
    const e = await pool.query(
      `SELECT e.id, e.numero, e.contrato_id, e.estado, e.periodo_inicio, e.periodo_fin, e.enviada_en, e.enviada_por,
              c.created_by, c.residente_id, c.superintendente_id, c.supervision_id, c.estado AS contrato_estado
         FROM estimaciones e
         JOIN contratos c ON c.id = e.contrato_id
        WHERE e.id = $1`,
      [id]
    );
    if (e.rowCount === 0) return res.status(404).json({ error: 'Estimación no encontrada' });
    const row = e.rows[0];
    if (gateContratoCerrado(res, row, 'no se presentan estimaciones')) return; // FIX 1.1 — finiquito bloquea (art. 64 LOPSRM)
    // BUG #2: fecha formal de la nota = mes del periodo (o body.fecha_nota validada). Se valida ANTES de la tx.
    const fnRes = fechaNotaDePeriodo(row.periodo_fin, (req.body || {}).fecha_nota);
    if (fnRes.error) return res.status(409).json({ error: fnRes.error });

    // (2) Acceso localizado: solo el superintendente del contrato PRESENTA sus estimaciones.
    if (row.superintendente_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el superintendente asignado a este contrato puede presentar sus estimaciones' });
    }

    // (3) Máquina de estados: solo se presenta desde 'integrada'. No re-presentar; no saltar/retroceder.
    if (row.estado === 'enviada') {
      return res.status(409).json({ error: 'La estimación ya fue presentada' });
    }
    if (row.estado !== 'integrada') {
      return res.status(409).json({ error: `No se puede presentar una estimación en estado '${row.estado}'` });
    }

    // FIX 22-jun (profe): SIN bitácora abierta NO se opera nada — cierra la asimetría del ciclo de
    // estimación (antes solo se omitía la nota, pero dejaba presentar). El contrato se opera DENTRO de
    // su bitácora (art. 122 RLOPSRM). Se señala `requiereBitacora` para que el front redirija a abrirla.
    const bitChk = await pool.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [row.contrato_id]);
    if (bitChk.rowCount === 0) {
      return res.status(409).json({
        error: 'La bitácora del contrato no está abierta; ábrela primero para presentar la estimación (art. 122 RLOPSRM).',
        requiereBitacora: true, contratoId: row.contrato_id
      });
    }

    // (4) Sello ATÓMICO + nota automática, en UNA transacción: el WHERE estado='integrada' serializa y
    //     bloquea la doble-presentación en carrera (rowCount = 0 si otro la presentó antes).
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const upd = await client.query(
        `UPDATE estimaciones
            SET estado = 'enviada', enviada_en = NOW(), enviada_por = $2
          WHERE id = $1 AND estado = 'integrada'
          RETURNING id, numero, contrato_id, estado, enviada_en, enviada_por`,
        [id, req.user.id]
      );
      if (upd.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'La estimación ya fue presentada' });
      }
      // OLEADA B — NOTA AUTOMÁTICA: la presentación es la "solicitud de aprobación de estimaciones" que
      // registra el superintendente (art. 125 fr. II-b RLOPSRM). Atómica si hay bitácora abierta; si no
      // hay, NO se bloquea la presentación (la nota simplemente no se asienta). Emisor = superintendente (JWT).
      let nota = null;
      const bit = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [row.contrato_id]);
      if (bit.rowCount > 0) {
        const asunto = `Solicitud de aprobación de la estimación No. ${row.numero}`;
        const contenido =
          `Solicitud de aprobación de la estimación No. ${row.numero} del periodo ` +
          `${String(row.periodo_inicio).slice(0, 10)} a ${String(row.periodo_fin).slice(0, 10)}. ` +
          `(art. 125 fr. II-b RLOPSRM; asiento automático del sistema al presentar la estimación.)`;
        nota = await insertarNotaAtomica(client, {
          bitacoraId: bit.rows[0].id, tipo: 'sup_estimaciones', asunto, contenido, emisorId: req.user.id, tag: 'estimacion',
          fechaNota: fnRes.fechaNota // BUG #2: fecha formal = mes del periodo
        });
        await client.query('INSERT INTO estimacion_notas (estimacion_id, nota_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, nota.id]);
      }
      await client.query('COMMIT');
      return res.status(200).json({ ...upd.rows[0], nota: nota ? { id: nota.id, numero: nota.numero, tipo: nota.tipo } : null });
    } catch (e2) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e2;
    } finally { client.release(); }
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
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id, c.estado AS contrato_estado
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

    const { seccion, tipo, descripcion } = req.body || {};
    if (!SECCIONES.includes(seccion)) return res.status(400).json({ error: 'seccion inválida' });
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'tipo inválido' });
    // FIX 22-jun (profe): se ELIMINA la severidad — no hay término medio; toda observación cuenta por igual.
    const desc = typeof descripcion === 'string' ? descripcion.trim() : '';
    if (!desc) return res.status(400).json({ error: 'La descripción de la observación es obligatoria' });

    const est = await cargarEstimacionConContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (est.supervision_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo la supervisión asignada al contrato puede registrar observaciones' });
    }
    if (gateContratoCerrado(res, est, 'no se registran observaciones')) return; // FIX 1.1
    if (est.estado !== 'enviada') {
      return res.status(409).json({ error: `No se pueden registrar observaciones en una estimación '${est.estado}'` });
    }
    if (await estaTurnada(id)) {
      return res.status(409).json({ error: 'La estimación ya fue turnada a residencia; la revisión de supervisión está cerrada' });
    }

    const ins = await pool.query(
      `INSERT INTO estimacion_observaciones (estimacion_id, seccion, tipo, descripcion, autor_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, estimacion_id, seccion, tipo, severidad, descripcion, estado, turnado_a, autor_id, created_at`,
      [id, seccion, tipo, desc, req.user.id]
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
    if (gateContratoCerrado(res, est, 'no se eliminan observaciones')) return; // FIX 1.1
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
    if (gateContratoCerrado(res, est, 'no se turnan estimaciones')) return; // FIX 1.1
    if (est.estado !== 'enviada') {
      return res.status(409).json({ error: `No se puede turnar una estimación '${est.estado}'` });
    }

    await client.query('BEGIN');
    // Lock de la fila de la estimación: serializa turnar/autorizar/rechazar concurrentes sobre la MISMA
    // estimación (cierra el TOCTOU del doble-turnado). El re-chequeo de turnado y el COUNT van DENTRO de
    // la tx con `client` (no con pool), para leer el estado ya serializado por el lock.
    await client.query('SELECT 1 FROM estimaciones WHERE id = $1 FOR UPDATE', [id]);

    const ya = await client.query(
      `SELECT 1 FROM estimacion_observaciones WHERE estimacion_id = $1 AND turnado_a = 'residencia' LIMIT 1`,
      [id]
    );
    if (ya.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La estimación ya fue turnada a residencia' });
    }
    // ¿Cuántas observaciones hay? Define el camino (marcar vs marcador).
    const cnt = await client.query(
      'SELECT COUNT(*)::int AS n FROM estimacion_observaciones WHERE estimacion_id = $1',
      [id]
    );
    const n = cnt.rows[0].n;
    if (n === 0 && !sinObservaciones) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Registra al menos una observación o marca la estimación sin observaciones para turnar' });
    }

    if (n > 0) {
      await client.query(
        `UPDATE estimacion_observaciones SET turnado_a = 'residencia' WHERE estimacion_id = $1`,
        [id]
      );
    } else {
      // Marcador del turnado sin observaciones: deja constancia de quién/cuándo turnó.
      await client.query(
        `INSERT INTO estimacion_observaciones (estimacion_id, seccion, tipo, descripcion, turnado_a, autor_id)
         VALUES ($1, 'caratula', 'aclaracion', 'Turnada a residencia sin observaciones de supervisión.', 'residencia', $2)`,
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
    if (gateContratoCerrado(res, est, 'no se autorizan estimaciones')) return; // FIX 1.1
    if (est.estado !== 'enviada') {
      return res.status(409).json({ error: `No se puede autorizar una estimación '${est.estado}'` });
    }
    if (!(await estaTurnada(id))) {
      return res.status(409).json({ error: 'La estimación aún no ha sido turnada por supervisión' });
    }
    // BUG #2: fecha formal de la nota de autorización = mes del periodo (o body.fecha_nota validada).
    const fnRes = fechaNotaDePeriodo(est.periodo_fin, (req.body || {}).fecha_nota);
    if (fnRes.error) return res.status(409).json({ error: fnRes.error });

    // Atómico (endurecido): el WHERE serializa la doble resolución (estado='enviada') Y exige el TURNADO
    // previo DENTRO del UPDATE (EXISTS turnado_a='residencia'), cerrando el TOCTOU entre el chequeo y el
    // UPDATE (que la supervisión turne entre estaTurnada() y el UPDATE no falsea la precondición).
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const upd = await client.query(
        `UPDATE estimaciones SET estado = 'autorizada'
          WHERE id = $1 AND estado = 'enviada'
            AND EXISTS (SELECT 1 FROM estimacion_observaciones WHERE estimacion_id = $1 AND turnado_a = 'residencia')
          RETURNING id, numero, contrato_id, estado`,
        [id]
      );
      if (upd.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'La estimación ya fue resuelta o no está turnada' });
      }
      // OLEADA B — NOTA AUTOMÁTICA: la autorización de estimaciones la registra el residente
      // (art. 125 fr. I-b RLOPSRM). Atómica si hay bitácora abierta; si no, no se bloquea la autorización.
      let nota = null;
      const bit = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [est.contrato_id]);
      if (bit.rowCount > 0) {
        const asunto = `Autorización de la estimación No. ${est.numero}`;
        const contenido =
          `Autorización de la estimación No. ${est.numero} del periodo ` +
          `${String(est.periodo_inicio).slice(0, 10)} a ${String(est.periodo_fin).slice(0, 10)}, ` +
          `por la residencia. (art. 125 fr. I-b RLOPSRM; asiento automático del sistema al autorizar la estimación.)`;
        nota = await insertarNotaAtomica(client, {
          bitacoraId: bit.rows[0].id, tipo: 'res_estimaciones', asunto, contenido, emisorId: req.user.id, tag: 'estimacion',
          fechaNota: fnRes.fechaNota // BUG #2: fecha formal = mes del periodo
        });
        await client.query('INSERT INTO estimacion_notas (estimacion_id, nota_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, nota.id]);
      }
      await client.query('COMMIT');
      return res.status(200).json({ ...upd.rows[0], nota: nota ? { id: nota.id, numero: nota.numero, tipo: nota.tipo } : null });
    } catch (e2) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e2;
    } finally { client.release(); }
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

    const { motivo, seccion } = req.body || {};
    const mot = typeof motivo === 'string' ? motivo.trim() : '';
    if (!mot) return res.status(400).json({ error: 'El motivo del rechazo es obligatorio' });
    const sec = SECCIONES.includes(seccion) ? seccion : 'caratula';

    const est = await cargarEstimacionConContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    // FIX 22-jun (profe): la SUPERVISIÓN puede RECHAZAR DIRECTO (sin turnar) o turnar; la RESIDENCIA
    // rechaza tras el turnado. Antes solo la residencia podía rechazar y exigía turnado previo.
    const esResidencia = est.residente_id === req.user.id;
    const esSupervision = est.supervision_id === req.user.id;
    if (!esResidencia && !esSupervision) {
      return res.status(403).json({ error: 'Solo la supervisión o la residencia del contrato pueden rechazar la estimación' });
    }
    if (gateContratoCerrado(res, est, 'no se rechazan estimaciones')) return; // FIX 1.1
    if (est.estado !== 'enviada') {
      return res.status(409).json({ error: `No se puede rechazar una estimación '${est.estado}'` });
    }
    // La residencia exige turnado previo; la supervisión rechaza directo (no requiere turnado).
    const exigeTurnado = esResidencia && !esSupervision;
    if (exigeTurnado && !(await estaTurnada(id))) {
      return res.status(409).json({ error: 'La estimación aún no ha sido turnada por supervisión' });
    }

    await client.query('BEGIN');
    // Atómico: exige estado='enviada'. Si quien rechaza es SOLO residencia, exige además el TURNADO
    // previo DENTRO del UPDATE (cierra el TOCTOU); la supervisión rechaza directo sin esa condición.
    const upd = await client.query(
      `UPDATE estimaciones SET estado = 'rechazada'
        WHERE id = $1 AND estado = 'enviada'
          AND ($2::boolean = false OR EXISTS (SELECT 1 FROM estimacion_observaciones WHERE estimacion_id = $1 AND turnado_a = 'residencia'))
        RETURNING id, numero, contrato_id, estado`,
      [id, exigeTurnado]
    );
    if (upd.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La estimación ya fue resuelta o no está turnada' });
    }
    const obs = await client.query(
      `INSERT INTO estimacion_observaciones (estimacion_id, seccion, tipo, descripcion, turnado_a, autor_id)
       VALUES ($1, $2, 'rechazo', $3, 'contratista', $4)
       RETURNING id, estimacion_id, seccion, tipo, severidad, descripcion, estado, turnado_a, autor_id, created_at`,
      [id, sec, mot, req.user.id]
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

// =====================================================================
// HU-16 (Equipo 3) — Reingreso de estimación tras rechazo.
// POST /api/estimaciones-ciclo/estimacion/:id/reingresar  (:id = la RECHAZADA)
//
// CA-1: la nueva versión es un BLOQUE COMPLETO INDEPENDIENTE — fila nueva en
//   `estimaciones` con su propio número correlativo (MAX+1), copiando los números
//   generadores y la carátula YA calculada de la rechazada. NO se re-deriva dinero:
//   se PROPAGA el snapshot que validó HU-12 (fuente única de verdad), no se recalcula
//   ninguna fórmula de carátula. La rechazada queda como HISTÓRICO VINCULADO a través
//   de reemplaza_a (self-FK) en la nueva.
// CA-3: la nueva versión REFERENCIA el timeline de la rechazada vía reemplaza_a y NO
//   reinicia el plazo de presentación (art. 54 LOPSRM): nace 'integrada' con
//   enviada_en = NULL; el "día N de plazo" se DERIVA en lectura desde la enviada_en de
//   la rechazada (sin contador persistido). El reingreso NO reinicia el plazo de
//   presentación con base en el art. 54 LOPSRM (verificado).
//
// SIN tocar zona congelada: no edita el controller de HU-12 ni el esquema. El INSERT no
//   dispara el trigger sigecop_estimacion_inmutable (es BEFORE UPDATE). reemplaza_a es
//   columna mutable (fuera de la lista del trigger). La numeración la serializa un
//   advisory lock transaccional por contrato (espejo de HU-12). Unicidad 1-rechazada→
//   1-reingreso garantizada por UNIQUE(reemplaza_a) + pre-chequeo.
//
// Gate de rol: SOLO el superintendente asignado al contrato (HU-16 = contratista nivel
//   'E'), espejo exacto de enviarEstimacion (HU-13).
//
// Nota: el texto de la "nota de atención a observaciones" NO se persiste — no existe
//   columna para él y el esquema es de Fundación. El gate de control es la confirmación
//   booleana. Criterio del equipo (default conservador): la "nota de atención a
//   observaciones" es control NO persistido en Etapa 1; persistirla requiere DDL nueva
//   (diferido para Maiki).
// =====================================================================
async function reingresarEstimacion(req, res) {
  const client = await pool.connect();
  try {
    const rechazadaId = Number(req.params.id);
    if (!Number.isInteger(rechazadaId) || rechazadaId <= 0) return res.status(400).json({ error: 'id inválido' });

    // El contratista declara que atendió las observaciones (gate de control).
    if (!(req.body && req.body.confirmacion === true)) {
      return res.status(400).json({ error: 'Debes confirmar que atendiste las observaciones de la versión rechazada' });
    }

    // (1) Estimación + equipo del contrato. 404 antes que 403 (espejo de HU-12/13).
    const est = await cargarEstimacionConContrato(rechazadaId);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });

    // (2) Acceso localizado: solo el superintendente del contrato reingresa sus estimaciones.
    if (est.superintendente_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el superintendente asignado a este contrato puede reingresar sus estimaciones' });
    }
    if (gateContratoCerrado(res, est, 'no se reingresan estimaciones')) return; // FIX 1.1

    // (3) Máquina de estados: solo se reingresa lo RECHAZADO.
    if (est.estado !== 'rechazada') {
      return res.status(409).json({ error: `Solo se puede reingresar una estimación 'rechazada' (estado actual: '${est.estado}')` });
    }

    // Oleada 1 bug #25: asegura la tabla de soportes ANTES de la tx (si aún no existía) para que la copia de
    // soportes no rompa el reingreso (un error dentro de la tx la abortaría).
    await ensureSoportesSchema().catch(() => {});

    await client.query('BEGIN');
    // Serializa numeración/no-duplicado por contrato (espejo de HU-12).
    await client.query('SELECT pg_advisory_xact_lock($1)', [est.contrato_id]);

    // (4) Unicidad del reingreso: 1 rechazada → a lo sumo 1 reingreso (pre-chequeo; el
    //     UNIQUE(reemplaza_a) lo blinda en carrera).
    const ya = await client.query('SELECT 1 FROM estimaciones WHERE reemplaza_a = $1', [rechazadaId]);
    if (ya.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Esta estimación rechazada ya fue reingresada' });
    }

    // (5) Número correlativo propio (bloque independiente, CA-1).
    const num = await client.query(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM estimaciones WHERE contrato_id = $1',
      [est.contrato_id]
    );
    const numero = num.rows[0].numero;

    // (6) Cabecera + carátula: COPIA el snapshot validado por HU-12 (no se re-deriva),
    //     número nuevo, estado 'integrada', integrada_por del JWT, reemplaza_a = rechazada.
    //     enviada_en/por quedan NULL (CA-3: no reinicia el plazo).
    const ins = await client.query(
      `INSERT INTO estimaciones
         (contrato_id, numero, periodo_inicio, periodo_fin, estado, anticipo_pct_snapshot,
          subtotal, amortizacion, retencion, deductivas, neto, integrada_por, reemplaza_a)
       SELECT contrato_id, $2, periodo_inicio, periodo_fin, 'integrada', anticipo_pct_snapshot,
              subtotal, amortizacion, retencion, deductivas, neto, $3, id
         FROM estimaciones WHERE id = $1
       RETURNING id, contrato_id, numero, periodo_inicio, periodo_fin, estado,
                 subtotal, amortizacion, retencion, deductivas, neto,
                 integrada_por, integrada_en, reemplaza_a`,
      [rechazadaId, numero, req.user.id]
    );
    const nueva = ins.rows[0];

    // (7) Números generadores: copia los mismos snapshots (pu_snapshot, cantidad_anterior_acum).
    await client.query(
      `INSERT INTO estimacion_generadores
         (estimacion_id, contrato_concepto_id, cantidad_periodo, cantidad_anterior_acum, pu_snapshot)
       SELECT $2, contrato_concepto_id, cantidad_periodo, cantidad_anterior_acum, pu_snapshot
         FROM estimacion_generadores WHERE estimacion_id = $1`,
      [rechazadaId, nueva.id]
    );

    // (7-bis) BUG #25 — el expediente NO se pierde en el reingreso: se COPIAN al nuevo bloque las NOTAS
    // vinculadas, las FOTOS de evidencia y los SOPORTES documentales de la versión rechazada. Append-only:
    // se crean registros NUEVOS ligados a la estimación reingresada; la RECHAZADA queda intacta y trazable
    // vía reemplaza_a. (Las notas de bitácora son inmutables/compartidas → se re-vincula el mismo nota_id.)
    await client.query(
      `INSERT INTO estimacion_notas (estimacion_id, nota_id)
       SELECT $2, nota_id FROM estimacion_notas WHERE estimacion_id = $1
       ON CONFLICT DO NOTHING`,
      [rechazadaId, nueva.id]
    );
    await client.query(
      `INSERT INTO estimacion_fotos
         (estimacion_id, contrato_concepto_id, nombre, descripcion, mime, tamano, contenido, subido_por)
       SELECT $2, contrato_concepto_id, nombre, descripcion, mime, tamano, contenido, subido_por
         FROM estimacion_fotos WHERE estimacion_id = $1`,
      [rechazadaId, nueva.id]
    );
    await client.query(
      `INSERT INTO estimacion_soportes_concepto
         (estimacion_id, contrato_concepto_id, nombre, descripcion, tipo, mime, tamano, contenido, subido_por)
       SELECT $2, contrato_concepto_id, nombre, descripcion, tipo, mime, tamano, contenido, subido_por
         FROM estimacion_soportes_concepto WHERE estimacion_id = $1`,
      [rechazadaId, nueva.id]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      nueva,
      reemplaza_a: rechazadaId,
      // El plazo del art. 54 NO se reinicia: la lectura deriva el día N desde este sello.
      plazo_origen_enviada_en: est.enviada_en || null
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Esta estimación rechazada ya fue reingresada' });
    }
    console.error('[reingresarEstimacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
}

// GET /api/estimaciones-ciclo/rechazadas — BUG #8: notificación de RECHAZO al contratista, DERIVADA del
// estado (sin tabla nueva, append-only por naturaleza). Lista las estimaciones RECHAZADAS de los contratos
// donde el usuario es el superintendente (contratista) que AÚN NO fueron atendidas: sin reingreso
// (reemplaza_a) y sin una estimación POSTERIOR del mismo periodo en estado ≠ rechazada (cubre también el
// flujo "volver a integrar + presentar"). Trae el motivo del rechazo y datos para el enlace. Al atender el
// rechazo (reingresar o re-integrar el periodo) la fila DESAPARECE de esta lista = "notificación atendida".
async function rechazadasContratista(req, res) {
  try {
    const uid = req.user.id;
    const r = await pool.query(
      `SELECT e.id AS estimacion_id, e.numero AS estimacion_numero, e.contrato_id, c.folio,
              e.periodo_inicio, e.periodo_fin, e.neto,
              (SELECT o.descripcion FROM estimacion_observaciones o
                WHERE o.estimacion_id = e.id AND o.tipo = 'rechazo'
                ORDER BY o.created_at DESC, o.id DESC LIMIT 1) AS motivo,
              (SELECT MIN(o.created_at) FROM estimacion_observaciones o
                WHERE o.estimacion_id = e.id AND o.tipo = 'rechazo') AS rechazada_en
         FROM estimaciones e
         JOIN contratos c ON c.id = e.contrato_id
        WHERE e.estado = 'rechazada'
          AND c.superintendente_id = $1
          AND NOT EXISTS (SELECT 1 FROM estimaciones r WHERE r.reemplaza_a = e.id)
          AND NOT EXISTS (
            SELECT 1 FROM estimaciones e2
             WHERE e2.contrato_id = e.contrato_id
               AND e2.periodo_inicio = e.periodo_inicio AND e2.periodo_fin = e.periodo_fin
               AND e2.numero > e.numero AND e2.estado <> 'rechazada'
          )
        ORDER BY e.contrato_id, e.numero`,
      [uid]
    );
    return res.status(200).json(r.rows);
  } catch (err) { console.error('[rechazadasContratista]', err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = {
  historialEstimaciones,
  enviarEstimacion,
  revisionEstimacion,
  crearObservacion,
  eliminarObservacion,
  turnarEstimacion,
  autorizarEstimacion,
  rechazarEstimacion,
  reingresarEstimacion,
  rechazadasContratista
};
