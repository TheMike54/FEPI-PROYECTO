// PASADA F (Fundación) — Sustitución de personas del roster del contrato.
// Fundamento Nivel 1 (literal, RLOPSRM art. 125 fr. I inciso g): al residente le corresponde
// registrar en la Bitácora "La SUSTITUCIÓN del superintendente, del anterior residente y de la
// supervisión". Se SUSTITUYE, NO se borra: el histórico se conserva.
//
// Dos endpoints (archivo NUEVO; NO toca la zona congelada salvo el montaje en server.js):
//   GET  /api/roster/contrato/:id            → roster VIGENTE (derivado) + histórico por rol.
//   POST /api/roster/contrato/:id/sustituir   → cierra la asignación anterior + crea la nueva +
//                                               sincroniza el caché escalar de contratos, en UNA
//                                               transacción. PROHIBIDO borrar a nadie.
//
// Las FIRMAS de la bitácora se atan a usuario_id (cuenta) con sus triggers de inmutabilidad; este
// controller NO toca bitacora_* → una firma pasada conserva al firmante ORIGINAL. La sustitución
// solo cambia quién es la persona ACTIVA del rol (y el caché que lee lib/acceso.js), afectando
// firmas FUTURAS, nunca las pasadas.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { contratoCerrado, msgCerrado } = require('../lib/gateCierre');
// Pase 2.3 — la sustitución asienta su nota en la bitácora (art. 123 fr. III / 125 fr. I g RLOPSRM).
// Se reutiliza el folio atómico y la redacción del controller de bitácora (NO se duplica la lógica).
const { insertarNotaAtomica, textoNotaSustitucion } = require('./bitacora.controller');

// FIX 3.4 — la DEPENDENCIA contratante NO es sustituible: el art. 125 fr. I inciso g) RLOPSRM solo manda
// registrar "la sustitución del superintendente, del anterior residente y de la supervisión" (verificado en
// docs/legal/reg.txt) — la dependencia no figura. Este whitelist es el blindaje: un `rol` fuera de estos 3
// (incluido 'dependencia') se rechaza con 400, y COL_CACHE no expone `dependencia_id`, así que la sustitución
// NUNCA puede tocar al contratante. La corrección de una dependencia mal capturada es vía administrativa, no
// por este endpoint.
const ROLES_ROSTER = ['residente', 'superintendente', 'supervision'];
// rol-de-roster → rol-de-cuenta esperado (convención del alta/HU-12: el superintendente es una
// cuenta de rol 'contratista'). Convención del equipo (criterio, default conservador): el "rol de
// roster" técnico mapea al "rol de cuenta" del sistema; el profe puede renombrar las etiquetas.
const ROL_CUENTA = { residente: 'residente', superintendente: 'contratista', supervision: 'supervision' };
// Caché escalar en `contratos` por rol (lo lee lib/acceso.js). Whitelist fija (no user input).
const COL_CACHE = { residente: 'residente_id', superintendente: 'superintendente_id', supervision: 'supervision_id' };

// GET /api/roster/contrato/:id — roster vigente (derivado) + histórico. Acotado por participación.
async function leerRoster(req, res) {
  try {
    const contratoId = Number(req.params.id);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contrato inválido' });

    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso al roster de este contrato' });
    }

    const hist = await pool.query(
      `SELECT r.id, r.rol, r.usuario_id, u.nombre AS usuario_nombre, u.email AS usuario_email,
              ue.nombre AS usuario_empresa,
              r.vigencia_desde, r.vigencia_hasta, r.motivo, r.sustituye_a,
              r.registrado_por, ru.nombre AS registrado_por_nombre, r.nota_id, r.created_at
         FROM contrato_roster r
         LEFT JOIN usuarios u  ON u.id  = r.usuario_id
         LEFT JOIN usuarios ru ON ru.id = r.registrado_por
         LEFT JOIN empresas ue ON ue.id = u.empresa_id
        WHERE r.contrato_id = $1
        ORDER BY r.rol, r.vigencia_desde, r.id`,
      [contratoId]
    );

    // Vigente por rol: prefiere la fila ACTIVA del roster; si no está versionado aún (contrato
    // nuevo), DERIVA del puntero escalar para no mostrar el rol vacío.
    const ct = c.rows[0];
    const vigente = {};
    for (const rol of ROLES_ROSTER) {
      const activa = hist.rows.find((r) => r.rol === rol && r.vigencia_hasta === null);
      if (activa) {
        vigente[rol] = { usuario_id: activa.usuario_id, nombre: activa.usuario_nombre, empresa: activa.usuario_empresa, desde: activa.vigencia_desde, roster_id: activa.id, versionado: true };
      } else if (ct[COL_CACHE[rol]]) {
        vigente[rol] = { usuario_id: ct[COL_CACHE[rol]], nombre: null, desde: null, roster_id: null, versionado: false };
      } else {
        vigente[rol] = null;
      }
    }

    return res.status(200).json({ contrato_id: contratoId, vigente, historial: hist.rows });
  } catch (err) {
    console.error('[leerRoster]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/roster/contrato/:id/sustituir — body { rol, nuevoUsuarioId, motivo, notaId? }
async function sustituirPersona(req, res) {
  const contratoId = Number(req.params.id);
  if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(404).json({ error: 'Contrato no encontrado' });

  const body = req.body || {};
  const rol = String(body.rol || '').trim();
  const nuevoUsuarioId = Number(body.nuevoUsuarioId);
  const motivo = (body.motivo != null ? String(body.motivo).trim() : '') || null;
  const notaId = Number.isInteger(Number(body.notaId)) && Number(body.notaId) > 0 ? Number(body.notaId) : null;

  if (!ROLES_ROSTER.includes(rol)) return res.status(400).json({ error: 'rol inválido (residente | superintendente | supervision)' });
  if (!Number.isInteger(nuevoUsuarioId) || nuevoUsuarioId <= 0) return res.status(400).json({ error: 'nuevoUsuarioId inválido' });
  if (!motivo) return res.status(400).json({ error: 'El motivo de la sustitución es obligatorio (art. 125 fr. I g RLOPSRM)' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serializa los cambios de roster de ESTE contrato (classid 3; estimación/programa usan 2).
      await client.query('SELECT pg_advisory_xact_lock(3, $1::int)', [contratoId]);

      const cres = await client.query(
        'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1 FOR UPDATE',
        [contratoId]
      );
      if (cres.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Contrato no encontrado' }); }
      const contrato = cres.rows[0];

      // AUTORIDAD (criterio del equipo, default conservador — B15): la dependencia (autoridad
      // contratante) o el residente asignado / creador del contrato; a este último le toca registrar
      // la sustitución en la bitácora (art. 125 fr. I g RLOPSRM). El residente solo sobre SU contrato;
      // la dependencia sobre cualquiera. (Quién la *autoriza* no es literal de ley → criterio.)
      const puede = req.user.rol === 'dependencia'
        || contrato.residente_id === req.user.id
        || contrato.created_by === req.user.id;
      if (!puede) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo la dependencia o el residente asignado puede sustituir personas del roster' }); }
      // FIX #3 (22-jun) — contrato cerrado (finiquito) = SOLO-LECTURA (art. 64 LOPSRM).
      if (await contratoCerrado(client, contratoId)) { await client.query('ROLLBACK'); return res.status(409).json({ error: msgCerrado('no se sustituyen personas del roster') }); }
      // P23 (22-jun) — DECISIÓN autónoma: exigir bitácora abierta también para la sustitución. El profe no la nombró,
      // pero el art. 125 fr. I g RLOPSRM manda REGISTRAR la sustitución EN la bitácora y el art. 122 la hace obligatoria;
      // sin bitácora no hay dónde asentarla. Consistente con convenio/avance (antes se difería).
      const bitRost = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [contratoId]);
      if (bitRost.rowCount === 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'El contrato no tiene bitácora abierta; ábrela primero para registrar la sustitución (art. 122 / 125 RLOPSRM).' }); }

      // El nuevo debe existir, estar ACTIVO y tener el rol de cuenta esperado para el slot.
      const ures = await client.query('SELECT id, rol, estado, nombre, empresa_id FROM usuarios WHERE id = $1', [nuevoUsuarioId]);
      if (ures.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El usuario nuevo no existe' }); }
      const nuevo = ures.rows[0];
      if (nuevo.estado !== 'activo') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El usuario nuevo no está activo' }); }
      if (nuevo.rol !== ROL_CUENTA[rol]) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Para el rol "${rol}" se requiere una cuenta de tipo "${ROL_CUENTA[rol]}"` }); }

      // Fila ACTIVA actual del rol. Si no existe (contrato nuevo aún sin versionar), se SIEMBRA
      // desde el puntero escalar (la persona que estaba desde el alta), para no perder el inicio.
      const act = await client.query(
        'SELECT id, usuario_id FROM contrato_roster WHERE contrato_id = $1 AND rol = $2 AND vigencia_hasta IS NULL',
        [contratoId, rol]
      );
      let anteriorRosterId = null;
      let anteriorUsuarioId = null;
      if (act.rowCount === 0) {
        const cacheUid = contrato[COL_CACHE[rol]];
        if (cacheUid) {
          const seed = await client.query(
            "INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo) VALUES ($1,$2,$3,CURRENT_DATE,'Asignación inicial (alta del contrato)') RETURNING id, usuario_id",
            [contratoId, rol, cacheUid]
          );
          anteriorRosterId = seed.rows[0].id;
          anteriorUsuarioId = seed.rows[0].usuario_id;
        }
        // Si el slot estaba vacío (p. ej. supervisión opcional), no hay anterior: es un ALTA del rol.
      } else {
        anteriorRosterId = act.rows[0].id;
        anteriorUsuarioId = act.rows[0].usuario_id;
      }

      if (anteriorUsuarioId === nuevoUsuarioId) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'La persona indicada ya ocupa ese rol' }); }

      // FIX 22-jun (profe): NO se puede sustituir a una persona con PENDIENTES. Si la sustituyes, ya no
      // podrá firmar lo que le corresponde. "Pendiente" = nota emitida por OTRA parte que el saliente aún
      // DEBE firmar y todavía está dentro de su plazo de firma (no aceptada tácitamente por vencimiento).
      // Interpretativo [validar]: el art. 125 fr. I g RLOPSRM no fija la regla; es criterio del equipo.
      if (anteriorUsuarioId != null) {
        const pend = await client.query(
          `SELECT COUNT(*)::int AS n
             FROM bitacora_notas bn
             JOIN bitacora_aperturas ba ON ba.id = bn.bitacora_id
            WHERE ba.contrato_id = $1
              AND bn.emisor_id IS DISTINCT FROM $2
              AND NOT EXISTS (SELECT 1 FROM bitacora_nota_firmas f WHERE f.nota_id = bn.id AND f.usuario_id = $2)
              AND now() <= bn.fecha + (ba.plazo_firma_dias || ' days')::interval`,
          [contratoId, anteriorUsuarioId]
        );
        const nPend = pend.rows[0]?.n || 0;
        if (nPend > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: `No se puede sustituir: la persona saliente tiene ${nPend} nota(s) de bitácora pendiente(s) de su firma. Debe firmarlas (o vencer su plazo) antes de ser sustituida (art. 125 RLOPSRM).`,
            pendientes: nPend
          });
        }
      }

      // REGLA 4 (BLOQUE 1 — empresa): la sustitución reemplaza a la PERSONA, NUNCA a la EMPRESA del
      // contrato. El contrato se liga a la EMPRESA, no a la persona; por eso el sustituto debe pertenecer
      // a la MISMA empresa que la persona saliente. Fundamento: criterio del equipo (default conservador);
      // el art. 125 fr. I g RLOPSRM solo obliga a REGISTRAR la sustitución en bitácora — "no cambiar la
      // empresa" no es literal de ley. Retrocompat: si la persona saliente no tiene empresa registrada
      // (cuenta legada, empresa_id NULL), no se bloquea (fail-open, como el acotamiento de lib/acceso.js).
      //
      // P3-1 (26-jun, decisión del profe): la SUPERVISIÓN externa es un tercero independiente; el profe
      // resolvió que SÍ puede ligarse a OTRA empresa (a diferencia de contratista/superintendente, que son
      // la contraparte del contrato). Por eso la regla de misma-empresa se exime para rol === 'supervision'.
      // Decisión Nivel 2 (la ley no lo dice literal): la supervisión se contrata aparte (criterio del profe).
      if (anteriorUsuarioId != null && rol !== 'supervision') {
        const ant = await client.query('SELECT empresa_id FROM usuarios WHERE id = $1', [anteriorUsuarioId]);
        const empAnterior = ant.rows[0] ? ant.rows[0].empresa_id : null;
        if (empAnterior != null && nuevo.empresa_id !== empAnterior) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'El sustituto debe pertenecer a la MISMA empresa que la persona saliente: la sustitución cambia a la persona, no la empresa del contrato (art. 125 RLOPSRM; el contrato se liga a la empresa). [La supervisión externa sí puede ser de otra empresa.]' });
        }
      }

      // (1) CERRAR la asignación anterior (si la hay) — NO se borra, queda en histórico.
      //     Primero cerrar y LUEGO insertar la nueva: el índice único parcial nunca ve 2 activas.
      if (anteriorRosterId != null) {
        await client.query('UPDATE contrato_roster SET vigencia_hasta = CURRENT_DATE WHERE id = $1', [anteriorRosterId]);
      }
      // (2) CREAR la nueva asignación ACTIVA, ligada a la anterior (sustituye_a) — identidad del JWT.
      const nueva = await client.query(
        `INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo, sustituye_a, nota_id, registrado_por)
         VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7) RETURNING id, vigencia_desde`,
        [contratoId, rol, nuevoUsuarioId, motivo, anteriorRosterId, notaId, req.user.id]
      );
      const nuevaAsignacionId = nueva.rows[0].id;

      // (3) NOTA DE BITÁCORA (Pase 2.3, art. 123 fr. III: la bitácora asienta los hechos
      //     relevantes; la sustitución de personas lo es, art. 125 fr. I g). AUTOMÁTICA y ATÓMICA:
      //     si el contrato YA tiene bitácora aperturada, se asienta aquí mismo (mismo BEGIN/COMMIT)
      //     reusando el folio correlativo del controller de bitácora; si NO hay bitácora, se DIFIERE
      //     (la sustitución NO se bloquea) y se asentará al abrir la bitácora (abrirBitacora).
      let notaCreada = null;
      const bit = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [contratoId]);
      if (bit.rowCount > 0 && anteriorRosterId != null) {
        // Sustitución real (hay titular anterior). Nombre del anterior para la nota.
        let anteriorNombre = null;
        if (anteriorUsuarioId != null) {
          const an = await client.query('SELECT nombre FROM usuarios WHERE id = $1', [anteriorUsuarioId]);
          anteriorNombre = an.rows[0] ? an.rows[0].nombre : null;
        }
        const { asunto, contenido } = textoNotaSustitucion({
          rol, anteriorNombre, anteriorId: anteriorUsuarioId,
          nuevoNombre: nuevo.nombre, nuevoId: nuevoUsuarioId,
          motivo, fecha: nueva.rows[0].vigencia_desde, diferida: false
        });
        // emisor = quien ejecuta la sustitución (del JWT): dependencia o residente. Criterio del equipo
        // (default conservador) consistente con art. 125 fr. I g RLOPSRM (al residente le toca registrar).
        notaCreada = await insertarNotaAtomica(client, {
          bitacoraId: bit.rows[0].id, tipo: 'res_sustitucion', asunto, contenido,
          emisorId: req.user.id, tag: 'sustitucion'
        });
        await client.query('UPDATE contrato_roster SET nota_id = $1 WHERE id = $2', [notaCreada.id, nuevaAsignacionId]);
      }

      // (4) SINCRONIZAR el caché escalar de contratos (lo lee lib/acceso.js) — UN solo punto de
      //     escritura, transaccional, para que el caché NUNCA derive del roster. (contratos no
      //     tiene trigger de inmutabilidad; COL_CACHE es whitelist fija, sin inyección.)
      await client.query(`UPDATE contratos SET ${COL_CACHE[rol]} = $1 WHERE id = $2`, [nuevoUsuarioId, contratoId]);

      await client.query('COMMIT');
      // nota_diferida: hubo sustitución real pero aún no hay bitácora → la nota se asienta al abrir.
      const notaDiferida = bit.rowCount === 0 && anteriorRosterId != null;
      return res.status(201).json({
        ok: true,
        contrato_id: contratoId,
        rol,
        anterior_usuario_id: anteriorUsuarioId,
        nuevo_usuario_id: nuevoUsuarioId,
        nueva_asignacion_id: nuevaAsignacionId,
        es_alta: anteriorRosterId == null,
        nota: notaCreada ? { id: notaCreada.id, numero: notaCreada.numero, tipo: notaCreada.tipo } : null,
        nota_diferida: notaDiferida,
        aviso: notaDiferida
          ? 'La sustitución quedó registrada; su nota de bitácora se asentará automáticamente al abrir la bitácora.'
          : null
      });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Conflicto de concurrencia en el roster; reintenta' });
    console.error('[sustituirPersona]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { leerRoster, sustituirPersona };
