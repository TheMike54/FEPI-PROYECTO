// HU-06 (Equipo 2 → O4 v2, 10-jun): registro de TRABAJOS TERMINADOS (avance ejecutado por concepto).
// Cada captura es una cantidad EJECUTADA imputada a un PERIODO del programa (SELECTOR, ya no la
// fecha libre — P14 del profe) y respaldada por una NOTA AUTOMÁTICA de bitácora tipo `avance`.
// Alimenta la curva ejecutada (HU-05).
//
// Reglas de dominio (O4 + O-PROFE):
// - art. 118 RLOPSRM (BLOQUEO DURO, 409): por concepto, Σ cantidad ejecutada ≤ lo contratado
//   (contrato_conceptos.cantidad). CRUCE DE FILAS. NO se toca: es el candado total. También bloquearían
//   los conceptos fuera de catálogo (imposible aquí: el avance es siempre de un concepto del catálogo).
// - Programa VIGENTE por periodo (P14, art. 45-A-X RLOPSRM + art. 52 LOPSRM) — AVISO, ya NO BLOQUEA
//   (O-PROFE, el profe: adelantar avance a PRECIOS PACTADOS no requiere convenio): ejecutado_acumulado
//   (≤ periodo sel) + nuevo vs programado_acumulado(≤ periodo sel) sobre programa_obra (= el programa
//   VIGENTE; los convenios lo reescriben en vivo). Si excede, o el concepto no estaba programado, se
//   REGISTRA igual y se devuelve `aviso_programa` (verificar monto/conceptos). Solo aplica si hay programa.
// - NOTA AUTOMÁTICA (P14: "el aviso es a través de una nota"): el registro GENERA su nota de bitácora
//   tipo `avance` (insertarNotaAtomica, folio atómico) y la liga (nota_id). DIFERIDO si no hay bitácora
//   abierta (se asienta sola al abrirla — abrirBitacora). Emisor = quien registra (contratista):
//   criterio del equipo (default conservador); el avance lo registra el contratista, identificado en los
//   datos de la nota (art. 123 fr. II RLOPSRM).
// - Captura EDITABLE (POST/PATCH/DELETE): no append-only; cada escritura revalida art. 118 + periodo.
// - registrado_por SIEMPRE sale del JWT (req.user.id), nunca del body.
// - Acotamiento: el contrato llega vía el concepto; acceso por participación (esParteOSupervision).
//   El rol contratista (escritura) lo exige el router.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { contratoCerrado, msgCerrado } = require('../lib/gateCierre');
// O4: nota automática de avance (folio atómico + texto), reutilizada del controller de bitácora.
const { insertarNotaAtomica, textoNotaAvance } = require('./bitacora.controller');
// Cuantiza a 3 decimales = escala REAL de concepto_avance.cantidad (NUMERIC(14,3)) y del
// catálogo (contrato_conceptos.cantidad). Validar/insertar sobre EXACTAMENTE el valor que
// se persiste evita que >3 decimales descuadren el art. 118.
function q3(n) { return Math.round((Number(n) + Number.EPSILON) * 1e3) / 1e3; }
// Tolerancia para comparar cantidades sin que el epsilon de float dispare un falso
// "excede" en el límite exacto (art. 118 permite acumulado == contratado). Misma EPS
// que estimaciones.controller.
const EPS_CANT = 1e-6;

// Carga concepto (+ unidad) + el equipo del contrato (para auth) desde un contrato_concepto_id.
// null si el concepto no existe.
async function cargarConceptoContrato(client, conceptoId) {
  const r = await client.query(
    `SELECT cc.id AS concepto_id, cc.contrato_id, cc.concepto, cc.unidad,
            cc.cantidad AS cantidad_contratada,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
       FROM contrato_conceptos cc
       JOIN contratos c ON c.id = cc.contrato_id
      WHERE cc.id = $1`,
    [conceptoId]
  );
  return r.rowCount ? r.rows[0] : null;
}

// O4: el periodo del programa por NÚMERO (el SELECTOR, ya no la fecha). Devuelve {id, numero,
// inicio, fin} o null si el contrato no tiene ese periodo.
async function cargarPeriodoPorNumero(client, contratoId, numero) {
  const r = await client.query(
    'SELECT id, numero, inicio, fin FROM contrato_periodos WHERE contrato_id = $1 AND numero = $2',
    [contratoId, numero]
  );
  return r.rowCount ? r.rows[0] : null;
}

// Σ cantidad ejecutada por concepto (TOTAL, todos los periodos), EXCLUYENDO opcionalmente una
// entrada (su id) — para el candado del art. 118 (que el PATCH no se cuente a sí mismo).
async function acumuladoEjecutado(client, conceptoId, excluirId) {
  const r = await client.query(
    `SELECT COALESCE(SUM(cantidad), 0) AS acum
       FROM concepto_avance
      WHERE contrato_concepto_id = $1 AND estado = 'vigente' AND ($2::int IS NULL OR id <> $2::int)`,
    [conceptoId, excluirId ?? null]
  );
  return Number(r.rows[0].acum);
}

// ¿El contrato tiene programa (matriz)? Si no, la validación por periodo no aplica (solo art. 118).
async function contratoTienePrograma(client, contratoId) {
  const r = await client.query(
    `SELECT 1 FROM programa_obra po JOIN contrato_conceptos cc ON cc.id = po.contrato_concepto_id
      WHERE cc.contrato_id = $1 LIMIT 1`,
    [contratoId]
  );
  return r.rowCount > 0;
}

// O4 + O-PROFE — VALIDACIÓN INFORMATIVA (AVISO, ya NO bloqueante) contra el programa VIGENTE
// (programa_obra) hasta el periodo seleccionado (P14). El profe aclaró: adelantar avance a PRECIOS
// PACTADOS no requiere convenio; el sistema AVISA pero DEJA registrar. Solo BLOQUEAN el art. 118
// (acumulado sobre lo contratado, en el caller) y los conceptos fuera de catálogo (imposible aquí: el
// avance siempre es de un concepto del catálogo). programado_acumulado = Σ programa_obra del concepto
// hasta cp.numero <= periodo.numero; ejecutado_acumulado = Σ concepto_avance hasta el periodo (excl.
// `excluirId`). Devuelve { aviso } (string, NO bloquea) o { programadoAcum, ejecutadoAcum } si está al día.
async function validarProgramaPeriodo(client, concepto, periodo, nuevaCantidad, excluirId) {
  const plan = await client.query(
    `SELECT COALESCE(SUM(po.cantidad), 0) AS planeado
       FROM programa_obra po
       JOIN contrato_periodos cp ON cp.id = po.contrato_periodo_id
      WHERE po.contrato_concepto_id = $1 AND cp.numero <= $2`,
    [concepto.concepto_id, periodo.numero]
  );
  const programadoAcum = Number(plan.rows[0].planeado);
  // "concepto no programado en este periodo": no hay volumen programado del concepto hasta aquí. AVISO.
  if (programadoAcum <= EPS_CANT) {
    return { aviso: `El concepto "${concepto.concepto}" no está programado en el periodo ${periodo.numero} (ni antes): verifica el monto y los conceptos nuevos. Se registra de todos modos (adelantar a precios pactados no requiere convenio).` };
  }
  const ejec = await client.query(
    `SELECT COALESCE(SUM(ca.cantidad), 0) AS ejecutado
       FROM concepto_avance ca
       JOIN contrato_periodos cp ON cp.id = ca.contrato_periodo_id
      WHERE ca.contrato_concepto_id = $1 AND cp.numero <= $2 AND ca.estado = 'vigente'
        AND ($3::int IS NULL OR ca.id <> $3::int)`,
    [concepto.concepto_id, periodo.numero, excluirId ?? null]
  );
  const ejecutadoAcum = Number(ejec.rows[0].ejecutado);
  if (ejecutadoAcum + Number(nuevaCantidad) > programadoAcum + EPS_CANT) {
    return { aviso: `El avance del periodo ${periodo.numero} en "${concepto.concepto}" excede lo programado (ejecutado acumulado ${ejecutadoAcum} + ${nuevaCantidad} supera lo programado ${programadoAcum}): verifica el monto y los conceptos nuevos. Se registra (adelantar a precios pactados no requiere convenio).` };
  }
  return { programadoAcum, ejecutadoAcum };
}

// O4 — id de la bitácora ABIERTA del contrato (o null si aún no se apertura).
async function bitacoraAbiertaId(client, contratoId) {
  const r = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [contratoId]);
  return r.rowCount ? r.rows[0].id : null;
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
                         WHERE ca.contrato_concepto_id = cc.id AND ca.estado = 'vigente'), 0) AS acumulado_ejecutado
         FROM contrato_conceptos cc
        WHERE cc.contrato_id = $1
        ORDER BY cc.orden`,
      [contratoId]
    );

    // Entradas de avance del contrato (vía el concepto), con periodo, nota y fecha.
    const avances = await pool.query(
      `SELECT ca.id, ca.contrato_concepto_id, ca.contrato_periodo_id, cp.numero AS periodo_numero,
              ca.nota_id, bn.numero AS nota_numero, bn.asunto AS nota_asunto,
              ca.cantidad, ca.fecha, ca.observaciones, ca.registrado_por,
              ca.estado, ca.reemplaza_a
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

// POST /api/trabajos — registra una entrada de avance. El periodo se SELECCIONA (periodo_numero),
// valida art. 118 (409, bloquea), exige nota `avance` si cantidad > 0 y devuelve `aviso_programa`
// (no bloqueante) si el avance excede lo programado del periodo. registrado_por del JWT.
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
  // O4: el periodo se SELECCIONA (ya no se deriva de una fecha libre). periodo_numero requerido.
  const periodoNumero = Number(body.periodo_numero);
  if (!Number.isInteger(periodoNumero) || periodoNumero <= 0) {
    return res.status(400).json({ error: 'periodo_numero es requerido (selecciona el periodo del programa)' });
  }
  const observaciones = typeof body.observaciones === 'string' ? body.observaciones.trim() || null : null;

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Cierre de carrera del art. 118 (mismo patrón del no-doble-pago G3 en pagos): se toma el lock
      // de la fila del concepto ANTES de leer el acumulado, así dos POST concurrentes al MISMO concepto
      // se serializan (el segundo espera al COMMIT del primero y revalida sobre el acumulado ya escrito).
      await client.query('SELECT 1 FROM contrato_conceptos WHERE id = $1 FOR UPDATE', [conceptoId]);

      const concepto = await cargarConceptoContrato(client, conceptoId);
      if (!concepto) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Concepto no encontrado' }); }
      if (!esParteOSupervision(req.user, concepto)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No tienes acceso a este contrato' });
      }
      // FIX #3 (22-jun) — contrato cerrado (finiquito) = SOLO-LECTURA (art. 64 LOPSRM).
      if (await contratoCerrado(client, concepto.contrato_id)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: msgCerrado('no se registra avance') });
      }

      // O4: el periodo viene del SELECTOR; debe existir en el programa del contrato.
      const periodo = await cargarPeriodoPorNumero(client, concepto.contrato_id, periodoNumero);
      if (!periodo) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `El periodo ${periodoNumero} no existe en el programa de este contrato` });
      }

      // O4 + O-PROFE — VALIDACIÓN INFORMATIVA (AVISO, ya NO bloquea) contra el programa por periodo. El
      // profe: adelantar avance a precios pactados NO requiere convenio → se registra con un aviso. Solo
      // si hay programa. El BLOQUEO real es el art. 118 (abajo). El aviso viaja en la respuesta 201.
      let avisoPrograma = null;
      if (cantidad > 0 && await contratoTienePrograma(client, concepto.contrato_id)) {
        const vp = await validarProgramaPeriodo(client, concepto, periodo, cantidad, null);
        if (vp.aviso) avisoPrograma = vp.aviso;
      }

      // art. 118 (BLOQUEO, NO se toca): Σ ejecutado TOTAL por concepto + esta cantidad ≤ contratado.
      const acum = await acumuladoEjecutado(client, conceptoId, null);
      if (acum + cantidad > Number(concepto.cantidad_contratada) + EPS_CANT) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Excede lo contratado (art. 118 RLOPSRM) en: ${concepto.concepto}` });
      }

      // O4 — NOTA AUTOMÁTICA de avance (folio atómico). Si hay bitácora abierta y cantidad>0, se
      // asienta aquí (mismo BEGIN/COMMIT); si NO hay bitácora, se DIFIERE (nota_id NULL) y se asentará
      // sola al abrir la bitácora (abrirBitacora). Emisor = quien registra (contratista): criterio del
      // equipo (default conservador), identificado en los datos de la nota (art. 123 fr. II RLOPSRM).
      // La fecha del avance se fija al CIERRE del periodo (la curva HU-05 usa fecha + contrato_periodo_id).
      let notaId = null;
      let notaCreada = null;
      if (cantidad > 0) {
        const bitId = await bitacoraAbiertaId(client, concepto.contrato_id);
        if (bitId) {
          const { asunto, contenido } = textoNotaAvance({
            concepto: concepto.concepto, unidad: concepto.unidad, cantidad,
            periodoNumero: periodo.numero, diferida: false
          });
          notaCreada = await insertarNotaAtomica(client, {
            bitacoraId: bitId, tipo: 'avance', asunto, contenido, emisorId: req.user.id, tag: 'avance'
          });
          notaId = notaCreada.id;
        }
      }

      const ins = await client.query(
        `INSERT INTO concepto_avance
           (contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones, registrado_por`,
        [conceptoId, periodo.id, notaId, cantidad, periodo.fin, observaciones, req.user.id]
      );

      await client.query('COMMIT');
      // nota_diferida: hubo avance real pero aún no hay bitácora → la nota se asienta al abrir.
      const notaDiferida = cantidad > 0 && notaId === null;
      return res.status(201).json({
        avance: ins.rows[0],
        nota: notaCreada ? { id: notaCreada.id, numero: notaCreada.numero, tipo: notaCreada.tipo } : null,
        nota_diferida: notaDiferida,
        aviso: notaDiferida ? 'El avance quedó registrado; su nota de bitácora se asentará automáticamente al abrir la bitácora.' : null,
        // O-PROFE: aviso (no bloqueante) si el avance excede lo programado del periodo o el concepto no
        // estaba programado. El registro se hizo igual (solo art. 118 bloquea).
        aviso_programa: avisoPrograma
      });
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

// POST /api/trabajos/:id/corregir — FIX 3.3: el avance es APPEND-ONLY (art. 123 fr. VI/VII RLOPSRM). La
// entrada original NO se edita ni se borra: se ANULA (estado vigente→anulada, blindado por el trigger
// sigecop_avance_inmutable) y se registra una entrada NUEVA vinculada (reemplaza_a) con la cantidad
// corregida + su propia nota de bitácora "dice / debe decir". Así la cadena dato↔nota inmutable queda
// íntegra. Body: { cantidad, observaciones?, motivo? }. art. 118 se revalida sobre las VIGENTES.
async function corregirAvance(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
  const body = req.body || {};
  const cantRaw = Number(body.cantidad);
  if (!Number.isFinite(cantRaw) || cantRaw < 0) return res.status(400).json({ error: 'cantidad debe ser un número mayor o igual a 0' });
  const cantidad = q3(cantRaw);
  const observaciones = typeof body.observaciones === 'string' ? body.observaciones.trim() || null : null;
  const motivo = typeof body.motivo === 'string' ? body.motivo.trim() || null : null;

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ares = await client.query(
        "SELECT id, contrato_concepto_id, contrato_periodo_id, cantidad, estado FROM concepto_avance WHERE id = $1 FOR UPDATE",
        [id]
      );
      if (ares.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Avance no encontrado' }); }
      const original = ares.rows[0];
      if (original.estado !== 'vigente') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Ese avance ya fue anulado/corregido; corrige la entrada vigente.' }); }

      // Lock del concepto (cierre del art. 118, simétrico al POST).
      await client.query('SELECT 1 FROM contrato_conceptos WHERE id = $1 FOR UPDATE', [original.contrato_concepto_id]);

      const concepto = await cargarConceptoContrato(client, original.contrato_concepto_id);
      if (!concepto) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Concepto no encontrado' }); }
      if (!esParteOSupervision(req.user, concepto)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No tienes acceso a este contrato' }); }
      // FIX #3 (22-jun) — contrato cerrado (finiquito) = SOLO-LECTURA (art. 64 LOPSRM).
      if (await contratoCerrado(client, concepto.contrato_id)) { await client.query('ROLLBACK'); return res.status(409).json({ error: msgCerrado('no se corrige avance') }); }

      // Periodo del original (la corrección conserva el periodo).
      let periodo = null;
      if (original.contrato_periodo_id) {
        const pr = await client.query('SELECT id, numero, inicio, fin FROM contrato_periodos WHERE id = $1', [original.contrato_periodo_id]);
        periodo = pr.rowCount ? pr.rows[0] : null;
      }

      // (1) ANULA la original (el trigger solo permite vigente→anulada, sin tocar sus datos).
      await client.query("UPDATE concepto_avance SET estado = 'anulada', anulada_por = $2, anulada_en = NOW() WHERE id = $1", [id, req.user.id]);

      // (2) art. 118 (BLOQUEO): Σ ejecutado VIGENTE (ya sin la original anulada) + nueva cantidad ≤ contratado.
      const acum = await acumuladoEjecutado(client, original.contrato_concepto_id, null);
      if (acum + cantidad > Number(concepto.cantidad_contratada) + EPS_CANT) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Excede lo contratado (art. 118 RLOPSRM) en: ${concepto.concepto}` });
      }

      // (3) aviso de programa (no bloquea, O-PROFE).
      let avisoPrograma = null;
      if (cantidad > 0 && periodo && await contratoTienePrograma(client, concepto.contrato_id)) {
        const vp = await validarProgramaPeriodo(client, concepto, periodo, cantidad, null);
        if (vp.aviso) avisoPrograma = vp.aviso;
      }

      // (4) Nota de bitácora de la corrección ("dice / debe decir") si hay bitácora abierta; si no, diferida.
      let notaId = null; let notaCreada = null;
      const bitId = await bitacoraAbiertaId(client, concepto.contrato_id);
      if (bitId) {
        const asunto = `Corrección de avance — ${concepto.concepto}`;
        const contenido =
          `Corrección del avance${periodo ? ` del periodo ${periodo.numero}` : ''} en "${concepto.concepto}": ` +
          `dice ${original.cantidad} ${concepto.unidad}, debe decir ${cantidad} ${concepto.unidad}.` +
          `${motivo ? ` Motivo: ${motivo}.` : ''} ` +
          `(art. 123 fr. VI/VII RLOPSRM: la entrada original se anula y se registra esta corrección vinculada; no se sobrescribe.)`;
        notaCreada = await insertarNotaAtomica(client, {
          bitacoraId: bitId, tipo: 'avance', asunto, contenido, emisorId: req.user.id, tag: 'correccion'
        });
        notaId = notaCreada.id;
      }

      // (5) INSERT de la entrada NUEVA vinculada (reemplaza_a = original), mismo periodo/concepto.
      const ins = await client.query(
        `INSERT INTO concepto_avance
           (contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones, registrado_por, reemplaza_a)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones, registrado_por, estado, reemplaza_a`,
        [original.contrato_concepto_id, original.contrato_periodo_id, notaId, cantidad, periodo ? periodo.fin : null, observaciones, req.user.id, id]
      );

      await client.query('COMMIT');
      return res.status(201).json({
        avance: ins.rows[0],
        anulado_id: id,
        nota: notaCreada ? { id: notaCreada.id, numero: notaCreada.numero, tipo: notaCreada.tipo } : null,
        nota_diferida: bitId === null,
        aviso_programa: avisoPrograma
      });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[corregirAvance]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// FIX 3.3 — se ELIMINARON los endpoints PATCH (actualizarAvance) y DELETE (eliminarAvance): el avance es
// append-only (art. 123 fr. VI RLOPSRM). La corrección se hace con POST /:id/corregir (anula + registro
// nuevo vinculado). El trigger sigecop_avance_inmutable blinda la regla también a nivel BD.
module.exports = { trabajosDeContrato, registrarAvance, corregirAvance };
