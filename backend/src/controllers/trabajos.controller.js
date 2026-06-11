// HU-06 (Equipo 2 → O4 v2, 10-jun): registro de TRABAJOS TERMINADOS (avance ejecutado por concepto).
// Cada captura es una cantidad EJECUTADA imputada a un PERIODO del programa (SELECTOR, ya no la
// fecha libre — P14 del profe) y respaldada por una NOTA AUTOMÁTICA de bitácora tipo `avance`.
// Alimenta la curva ejecutada (HU-05).
//
// Reglas de dominio (O4):
// - art. 118 RLOPSRM (BLOQUEO DURO, 409): por concepto, Σ cantidad ejecutada ≤ lo contratado
//   (contrato_conceptos.cantidad). CRUCE DE FILAS. NO se toca: es el candado total.
// - Programa VIGENTE por periodo (P14, art. 45-A-X RLOPSRM + art. 52 LOPSRM) — AHORA BLOQUEA (antes
//   alertaba): ejecutado_acumulado(≤ periodo sel) + nuevo ≤ programado_acumulado(≤ periodo sel),
//   computado sobre programa_obra (= el programa VIGENTE: los convenios lo reescriben en vivo vía
//   guardarMatriz, así que un convenio que adelantó volumen lo permite solo). Mensajes: "concepto
//   no programado en el periodo" / "excede lo programado del periodo — requiere convenio (art. 59)".
//   Solo aplica si el contrato TIENE programa (matriz); sin programa, solo rige art. 118.
//   [validar profe] si prefiere AVISO en vez de bloqueo.
// - NOTA AUTOMÁTICA (P14: "el aviso es a través de una nota"): el registro GENERA su nota de bitácora
//   tipo `avance` (insertarNotaAtomica, folio atómico) y la liga (nota_id). DIFERIDO si no hay bitácora
//   abierta (se asienta sola al abrirla — abrirBitacora). Emisor = quien registra (contratista) [validar].
// - Captura EDITABLE (POST/PATCH/DELETE): no append-only; cada escritura revalida art. 118 + periodo.
// - registrado_por SIEMPRE sale del JWT (req.user.id), nunca del body.
// - Acotamiento: el contrato llega vía el concepto; acceso por participación (esParteOSupervision).
//   El rol contratista (escritura) lo exige el router.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
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
      WHERE contrato_concepto_id = $1 AND ($2::int IS NULL OR id <> $2::int)`,
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

// O4 — VALIDACIÓN BLOQUEANTE contra el programa VIGENTE (programa_obra) hasta el periodo
// seleccionado (P14). programado_acumulado = Σ programa_obra del concepto hasta cp.numero <=
// periodo.numero (el programa vigente: los convenios lo reescriben en vivo). ejecutado_acumulado
// = Σ concepto_avance del concepto imputado a periodos hasta el seleccionado (excluyendo `excluirId`).
// Devuelve { error } (string) si bloquea, o { programadoAcum, ejecutadoAcum } si pasa. NO se llama
// si el contrato no tiene programa (solo rige art. 118).
async function validarProgramaPeriodo(client, concepto, periodo, nuevaCantidad, excluirId) {
  const plan = await client.query(
    `SELECT COALESCE(SUM(po.cantidad), 0) AS planeado
       FROM programa_obra po
       JOIN contrato_periodos cp ON cp.id = po.contrato_periodo_id
      WHERE po.contrato_concepto_id = $1 AND cp.numero <= $2`,
    [concepto.concepto_id, periodo.numero]
  );
  const programadoAcum = Number(plan.rows[0].planeado);
  // "concepto no programado en este periodo": no hay volumen autorizado del concepto hasta aquí.
  if (programadoAcum <= EPS_CANT) {
    return { error: `El concepto "${concepto.concepto}" no está programado en el periodo ${periodo.numero} (ni antes). Para ejecutarlo aquí se requiere un convenio modificatorio (art. 59 LOPSRM).` };
  }
  const ejec = await client.query(
    `SELECT COALESCE(SUM(ca.cantidad), 0) AS ejecutado
       FROM concepto_avance ca
       JOIN contrato_periodos cp ON cp.id = ca.contrato_periodo_id
      WHERE ca.contrato_concepto_id = $1 AND cp.numero <= $2
        AND ($3::int IS NULL OR ca.id <> $3::int)`,
    [concepto.concepto_id, periodo.numero, excluirId ?? null]
  );
  const ejecutadoAcum = Number(ejec.rows[0].ejecutado);
  if (ejecutadoAcum + Number(nuevaCantidad) > programadoAcum + EPS_CANT) {
    return { error: `Excede lo programado del periodo ${periodo.numero} para "${concepto.concepto}": ejecutado acumulado ${ejecutadoAcum} + ${nuevaCantidad} supera lo programado ${programadoAcum}. Para adelantar volumen se requiere un convenio modificatorio (art. 59 LOPSRM).` };
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

      // O4: el periodo viene del SELECTOR; debe existir en el programa del contrato.
      const periodo = await cargarPeriodoPorNumero(client, concepto.contrato_id, periodoNumero);
      if (!periodo) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `El periodo ${periodoNumero} no existe en el programa de este contrato` });
      }

      // O4 — VALIDACIÓN BLOQUEANTE contra el programa VIGENTE por periodo (P14). Solo si el contrato
      // tiene programa (matriz); sin programa, solo rige art. 118 (abajo). Mensajes: no programado /
      // excede lo programado del periodo (art. 59). Es ADEMÁS del art. 118.
      if (cantidad > 0 && await contratoTienePrograma(client, concepto.contrato_id)) {
        const vp = await validarProgramaPeriodo(client, concepto, periodo, cantidad, null);
        if (vp.error) { await client.query('ROLLBACK'); return res.status(409).json({ error: vp.error }); }
      }

      // art. 118 (BLOQUEO, NO se toca): Σ ejecutado TOTAL por concepto + esta cantidad ≤ contratado.
      const acum = await acumuladoEjecutado(client, conceptoId, null);
      if (acum + cantidad > Number(concepto.cantidad_contratada) + EPS_CANT) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Excede lo contratado (art. 118 RLOPSRM) en: ${concepto.concepto}` });
      }

      // O4 — NOTA AUTOMÁTICA de avance (folio atómico). Si hay bitácora abierta y cantidad>0, se
      // asienta aquí (mismo BEGIN/COMMIT); si NO hay bitácora, se DIFIERE (nota_id NULL) y se asentará
      // sola al abrir la bitácora (abrirBitacora). Emisor = quien registra (contratista) [validar].
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
        aviso: notaDiferida ? 'El avance quedó registrado; su nota de bitácora se asentará automáticamente al abrir la bitácora.' : null
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

// PATCH /api/trabajos/:id — edita cantidad / observaciones de una entrada. Revalida art. 118
// (excluyéndose) y la validación de periodo (bloqueante, como el POST). El PERIODO no cambia.
// O4: la nota es AUTOMÁTICA y de sistema (no se edita aquí); la nota original queda como el
// asiento del registro inicial (editar la cantidad no la regenera — limitación documentada).
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

      // Candado SIMÉTRICO al POST (cierre del art. 118): además del lock de la fila editada (arriba),
      // se toma el lock de la fila del CONCEPTO para que un POST y un PATCH —o dos PATCH— concurrentes
      // sobre el MISMO concepto se serialicen al revalidar el acumulado. Orden de locks avance→concepto
      // (el POST solo toma el concepto y nunca filas de avance) ⇒ sin ciclos/deadlock.
      await client.query('SELECT 1 FROM contrato_conceptos WHERE id = $1 FOR UPDATE', [actual.contrato_concepto_id]);

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

      // observaciones final.
      let observaciones = actual.observaciones;
      if ('observaciones' in body) {
        observaciones = typeof body.observaciones === 'string' ? body.observaciones.trim() || null : null;
      }

      // O4: validación de periodo BLOQUEANTE (periodo intacto, el guardado), igual que el POST.
      if (cantidad > 0 && actual.contrato_periodo_id && await contratoTienePrograma(client, concepto.contrato_id)) {
        const pr = await client.query('SELECT id, numero, inicio, fin FROM contrato_periodos WHERE id = $1', [actual.contrato_periodo_id]);
        if (pr.rowCount) {
          const vp = await validarProgramaPeriodo(client, concepto, pr.rows[0], cantidad, id);
          if (vp.error) { await client.query('ROLLBACK'); return res.status(409).json({ error: vp.error }); }
        }
      }

      // art. 118 (BLOQUEO, NO se toca): Σ ejecutado por concepto (excluyéndose) + cantidad ≤ contratado.
      const acum = await acumuladoEjecutado(client, actual.contrato_concepto_id, id);
      if (acum + cantidad > Number(concepto.cantidad_contratada) + EPS_CANT) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Excede lo contratado (art. 118 RLOPSRM) en: ${concepto.concepto}` });
      }

      const upd = await client.query(
        `UPDATE concepto_avance SET cantidad = $2, observaciones = $3
          WHERE id = $1
         RETURNING id, contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones, registrado_por`,
        [id, cantidad, observaciones]
      );

      await client.query('COMMIT');
      return res.status(200).json({ avance: upd.rows[0] });
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
