// HU-08 + identidad/firma: la apertura crea el acta-snapshot inmutable y deja una
// firma PENDIENTE por cada miembro del equipo del contrato. Cada quien firma despues
// desde SU cuenta (POST /:aperturaId/firmar). El estado "completa" se DERIVA.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

// Construye el acta (primera nota): snapshot inmutable de los datos minimos del art. 123
// fr. III RLOPSRM, tomados del contrato + el roster de firmantes (identidad por cuenta).
function construirActa(contrato, roster, cronograma, datos) {
  const d = datos || {};
  return {
    identificacion: {
      folio: contrato.folio,
      dependencia: contrato.dependencia,
      contratista: contrato.contratista,
      // art. 123 fr. III RLOPSRM: domicilios y teléfonos de las partes involucradas.
      domicilio_dependencia: d.domicilioDependencia || null,
      telefono_dependencia: d.telefonoDependencia || null,
      domicilio_contratista: d.domicilioContratista || null,
      telefono_contratista: d.telefonoContratista || null
    },
    objeto: contrato.objeto,
    // art. 123 fr. III RLOPSRM: alcances descriptivos de los trabajos y características del sitio.
    descripcion_trabajos: d.descripcionTrabajos || null,
    caracteristicas_sitio: d.caracteristicasSitio || null,
    datos_financieros: {
      monto: contrato.monto,
      anticipo_pct: contrato.anticipo_pct,
      plazo_dias: contrato.plazo_dias
    },
    cronograma: {
      inicio: cronograma.inicio,
      fin: cronograma.fin,
      entrega_sitio: cronograma.entregaSitio
    },
    firmas: roster.map((m) => ({
      rol_en_firma: m.rol_en_firma,
      usuario_id: m.usuario_id,
      nombre: m.nombre,
      correo: m.correo
    }))
  };
}

// POST /api/bitacora/apertura — el residente asignado abre la bitácora: crea el
// acta y una firma PENDIENTE por miembro del equipo. NO firma ninguna aquí.
async function abrirBitacora(req, res) {
  const body = req.body || {};
  const contratoId = Number(body.contratoId);
  if (!Number.isInteger(contratoId) || contratoId <= 0) {
    return res.status(400).json({ error: 'contratoId inválido' });
  }
  const fechaEntregaSitio = body.fechaEntregaSitio;
  if (!fechaEntregaSitio) {
    return res.status(400).json({ error: 'Falta la fecha de entrega del sitio' });
  }
  // Plazo de firma/aceptación de notas (art. 123 fr. III). Días naturales; default 2.
  const plazoFirmaDias = (body.plazoFirmaDias === undefined || body.plazoFirmaDias === null)
    ? 2 : Number(body.plazoFirmaDias);
  if (!Number.isInteger(plazoFirmaDias) || plazoFirmaDias < 1 || plazoFirmaDias > 60) {
    return res.status(400).json({ error: 'plazoFirmaDias debe ser un entero entre 1 y 60' });
  }
  // Datos mínimos de la apertura (art. 123 fr. III RLOPSRM): domicilios/teléfonos de las
  // partes + alcances/características del sitio. La vista los exige; aquí se normalizan.
  const t = (v) => (typeof v === 'string' ? v.trim() : '') || null;
  const minData = {
    domicilioDependencia: t(body.domicilioDependencia),
    telefonoDependencia: t(body.telefonoDependencia),
    domicilioContratista: t(body.domicilioContratista),
    telefonoContratista: t(body.telefonoContratista),
    descripcionTrabajos: t(body.descripcionTrabajos),
    caracteristicasSitio: t(body.caracteristicasSitio)
  };

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cres = await client.query(
        `SELECT id, folio, objeto, contratista, dependencia, monto, plazo_dias, anticipo_pct,
                fecha_inicio, fecha_termino, residente_id, superintendente_id, supervision_id
           FROM contratos WHERE id = $1`,
        [contratoId]
      );
      if (cres.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Contrato no encontrado' });
      }
      const contrato = cres.rows[0];

      // Solo el residente asignado a ESE contrato puede aperturar su bitácora.
      if (contrato.residente_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Solo el residente asignado a este contrato puede aperturar su bitácora' });
      }
      // Equipo mínimo: superintendente obligatorio.
      if (!contrato.superintendente_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El contrato no tiene superintendente asignado; asigna el equipo antes de aperturar' });
      }

      // Miembros que firmarán (pendientes): residente + superintendente (+ supervisión).
      const miembros = [
        { usuario_id: contrato.residente_id, rol_en_firma: 'residente' },
        { usuario_id: contrato.superintendente_id, rol_en_firma: 'superintendente' }
      ];
      if (contrato.supervision_id) {
        miembros.push({ usuario_id: contrato.supervision_id, rol_en_firma: 'supervision' });
      }

      // Identidades (nombre/correo) para congelar en el acta.
      const ures = await client.query(
        'SELECT id, nombre, email FROM usuarios WHERE id = ANY($1)',
        [miembros.map((m) => m.usuario_id)]
      );
      const byId = new Map(ures.rows.map((u) => [u.id, u]));
      const roster = miembros.map((m) => {
        const u = byId.get(m.usuario_id) || {};
        return { ...m, nombre: u.nombre || null, correo: u.email || null };
      });

      const acta = construirActa(contrato, roster, {
        inicio: contrato.fecha_inicio,
        fin: contrato.fecha_termino,
        entregaSitio: fechaEntregaSitio
      }, minData);

      // fecha_apertura = fecha de INICIO del contrato: la bitácora se abre el MISMO día en que
      // arranca el contrato (hallazgo del profe, audio 2026-06-01). La entrega del sitio se
      // conserva aparte (acta.cronograma.entrega_sitio). [validar] la regla "mismo día".
      const ins = await client.query(
        `INSERT INTO bitacora_aperturas
           (contrato_id, fecha_apertura, plazo_firma_dias, acta, aperturada_por,
            domicilio_dependencia, telefono_dependencia, domicilio_contratista, telefono_contratista,
            descripcion_trabajos, caracteristicas_sitio)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, contrato_id, fecha_apertura, plazo_firma_dias, apertura_en, acta, aperturada_por`,
        [contratoId, contrato.fecha_inicio, plazoFirmaDias, JSON.stringify(acta), req.user.id,
         minData.domicilioDependencia, minData.telefonoDependencia, minData.domicilioContratista,
         minData.telefonoContratista, minData.descripcionTrabajos, minData.caracteristicasSitio]
      );
      const bitacora = ins.rows[0];

      for (const m of miembros) {
        await client.query(
          `INSERT INTO bitacora_firmantes (bitacora_id, usuario_id, rol_en_firma, firmado)
           VALUES ($1, $2, $3, false)`,
          [bitacora.id, m.usuario_id, m.rol_en_firma]
        );
      }

      // PUNTO 1 (profe): "¿Cuál es la primer nota? La de la apertura, es la 1". La apertura se
      // registra COMO la nota #1 del libro (tipo 'apertura', art. 123 fr. III "se deberá iniciar
      // con una nota especial"); las notas emitidas después arrancan en #2. Su firma es la
      // CONJUNTA (bitacora_firmantes), no la del emisor → firmado_en NULL.
      const resumenApertura =
        `Apertura de bitácora del contrato ${contrato.folio}. Objeto: ${contrato.objeto}. ` +
        `Partes: ${contrato.dependencia} (dependencia) / ${contrato.contratista} (contratista). ` +
        `Inicio contractual ${String(contrato.fecha_inicio).slice(0, 10)}; entrega del sitio ${String(fechaEntregaSitio).slice(0, 10)}. ` +
        `Datos mínimos (art. 123 fr. III RLOPSRM): domicilios, teléfonos y características del sitio registrados en el acta.`;
      await client.query(
        `INSERT INTO bitacora_notas (bitacora_id, numero, tipo, asunto, contenido, emisor_id, estado, firmado_en)
         VALUES ($1, 1, 'apertura', 'Nota de apertura de bitácora', $2, $3, 'emitida', NULL)`,
        [bitacora.id, resumenApertura, req.user.id]
      );

      // Pase 2.3 — Asiento DIFERIDO: si hubo sustituciones del roster ANTES de abrir la bitácora
      // (filas con sustituye_a y sin nota), genera ahora sus notas (art. 125 fr. I g), numeradas
      // TRAS la #1 de apertura. El folio refleja el orden de ASIENTO; el contenido cita la fecha
      // real del acto. El emisor es el residente que apertura. [validar profe] el asiento
      // retroactivo de notas de sustitución (orden folio vs. fecha del hecho, art. 123 fr. V/VI).
      const pendientesSust = await client.query(
        `SELECT r.id, r.rol, r.usuario_id, un.nombre AS nuevo_nombre, r.motivo, r.vigencia_desde,
                ra.usuario_id AS anterior_id, ua.nombre AS anterior_nombre
           FROM contrato_roster r
           LEFT JOIN usuarios un ON un.id = r.usuario_id
           LEFT JOIN contrato_roster ra ON ra.id = r.sustituye_a
           LEFT JOIN usuarios ua ON ua.id = ra.usuario_id
          WHERE r.contrato_id = $1 AND r.sustituye_a IS NOT NULL AND r.nota_id IS NULL
          ORDER BY r.vigencia_desde, r.id`,
        [contratoId]
      );
      for (const s of pendientesSust.rows) {
        const { asunto, contenido } = textoNotaSustitucion({
          rol: s.rol, anteriorNombre: s.anterior_nombre, anteriorId: s.anterior_id,
          nuevoNombre: s.nuevo_nombre, nuevoId: s.usuario_id, motivo: s.motivo,
          fecha: s.vigencia_desde, diferida: true
        });
        const nota = await insertarNotaAtomica(client, {
          bitacoraId: bitacora.id, tipo: 'res_sustitucion', asunto, contenido,
          emisorId: req.user.id, tag: 'sustitucion'
        });
        await client.query('UPDATE contrato_roster SET nota_id = $1 WHERE id = $2', [nota.id, s.id]);
      }

      // O4 (HU-06 v2, 10-jun) — Asiento DIFERIDO de AVANCES registrados ANTES de abrir la bitácora
      // (concepto_avance con cantidad>0 y sin nota). Mismo patrón que la sustitución: el registro
      // de avance genera su nota de bitácora (art. 125 fr. II); si no había bitácora, se difiere y se
      // asienta aquí, numerada TRAS la #1 de apertura. Reusa textoNotaAvance (consistente con el
      // asiento en vivo de trabajos.controller). Emisor = quien apertura (residente). [validar profe].
      const pendientesAvance = await client.query(
        `SELECT ca.id, ca.cantidad, cc.concepto, cc.unidad, cp.numero AS periodo_numero
           FROM concepto_avance ca
           JOIN contrato_conceptos cc ON cc.id = ca.contrato_concepto_id
           LEFT JOIN contrato_periodos cp ON cp.id = ca.contrato_periodo_id
          WHERE cc.contrato_id = $1 AND ca.nota_id IS NULL AND ca.cantidad > 0
          ORDER BY ca.fecha, ca.id`,
        [contratoId]
      );
      for (const a of pendientesAvance.rows) {
        const { asunto, contenido } = textoNotaAvance({
          concepto: a.concepto, unidad: a.unidad, cantidad: a.cantidad,
          periodoNumero: a.periodo_numero, diferida: true
        });
        const nota = await insertarNotaAtomica(client, {
          bitacoraId: bitacora.id, tipo: 'avance', asunto, contenido,
          emisorId: req.user.id, tag: 'avance'
        });
        await client.query('UPDATE concepto_avance SET nota_id = $1 WHERE id = $2', [nota.id, a.id]);
      }

      // O6 (10-jun) — Asiento DIFERIDO de CONVENIOS registrados ANTES de abrir la bitácora (nota_id
      // NULL). Mismo patrón que la sustitución/avance: el registro del convenio genera su nota; si no
      // había bitácora, se difiere y se asienta aquí, numerada TRAS la #1 de apertura. El UPDATE de
      // nota_id es la ÚNICA transición que el trigger de inmutabilidad del convenio permite (NULL→valor).
      // Emisor = quien apertura (residente). [validar profe].
      const pendientesConvenio = await client.query(
        `SELECT id, numero, folio, tipo, delta_monto_pct, delta_plazo_pct, motivo
           FROM convenios_modificatorios
          WHERE contrato_id = $1 AND nota_id IS NULL
          ORDER BY numero`,
        [contratoId]
      );
      for (const cv of pendientesConvenio.rows) {
        const folioCv = cv.folio || `CM-${String(cv.numero).padStart(3, '0')}`;
        const { asunto, contenido } = textoNotaConvenio({
          folio: folioCv, tipo: cv.tipo, deltaMontoPct: cv.delta_monto_pct,
          deltaPlazoPct: cv.delta_plazo_pct, motivo: cv.motivo, diferida: true
        });
        // O-PROFE: nota de CONSECUENCIA (convenio) → la avala el RESIDENTE (art. 53); emisor = residente
        // del contrato (= quien apertura, pero explícito por art. 53). Las de HECHO (avance/sustitución, arriba) NO.
        const nota = await insertarNotaAtomica(client, {
          bitacoraId: bitacora.id, tipo: 'res_convenios', asunto, contenido,
          emisorId: contrato.residente_id || req.user.id, tag: 'convenio'
        });
        await client.query('UPDATE convenios_modificatorios SET nota_id = $1 WHERE id = $2', [nota.id, cv.id]);
      }

      await client.query('COMMIT');
      return res.status(201).json(bitacora);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una bitácora para este contrato' });
    if (err.code === '23503') return res.status(404).json({ error: 'Contrato no encontrado' });
    console.error('[abrirBitacora]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/bitacora/:aperturaId/firmar — el usuario del token firma SU parte.
// 403 si no es firmante; 409 si ya firmó; si no, transición pendiente -> firmado.
async function firmarApertura(req, res) {
  try {
    const aperturaId = Number(req.params.aperturaId);
    if (!Number.isInteger(aperturaId) || aperturaId <= 0) {
      return res.status(400).json({ error: 'aperturaId inválido' });
    }

    const f = await pool.query(
      'SELECT id, firmado FROM bitacora_firmantes WHERE bitacora_id = $1 AND usuario_id = $2',
      [aperturaId, req.user.id]
    );
    if (f.rowCount === 0) return res.status(403).json({ error: 'No eres firmante de esta apertura' });
    if (f.rows[0].firmado) return res.status(409).json({ error: 'Ya firmaste esta apertura' });

    const upd = await pool.query(
      `UPDATE bitacora_firmantes SET firmado = true, firmado_en = NOW()
        WHERE bitacora_id = $1 AND usuario_id = $2 AND firmado = false
        RETURNING id, firmado, firmado_en`,
      [aperturaId, req.user.id]
    );
    if (upd.rowCount === 0) return res.status(409).json({ error: 'Ya firmaste esta apertura' });

    const est = await pool.query(
      'SELECT count(*) FILTER (WHERE NOT firmado) AS pendientes FROM bitacora_firmantes WHERE bitacora_id = $1',
      [aperturaId]
    );
    const pendientes = Number(est.rows[0].pendientes);
    return res.status(200).json({ firmado: true, firmado_en: upd.rows[0].firmado_en, completa: pendientes === 0, pendientes });
  } catch (err) {
    console.error('[firmarApertura]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/bitacora/pendientes — bandeja "por firmar" del usuario del token.
async function pendientesPorFirmar(req, res) {
  try {
    const r = await pool.query(
      `SELECT a.id AS apertura_id, a.contrato_id, c.folio, c.objeto, f.rol_en_firma, a.apertura_en
         FROM bitacora_firmantes f
         JOIN bitacora_aperturas a ON a.id = f.bitacora_id
         JOIN contratos c ON c.id = a.contrato_id
        WHERE f.usuario_id = $1 AND f.firmado = false
        ORDER BY a.apertura_en DESC`,
      [req.user.id]
    );
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[pendientesPorFirmar]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/bitacora/contrato/:contratoId — bitácora + firmantes (con identidad) +
// estado derivado. Acotada por participación en el contrato.
async function bitacoraDeContrato(req, res) {
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

    const a = await pool.query(
      `SELECT id, contrato_id, fecha_apertura, apertura_en, acta, aperturada_por, created_at
         FROM bitacora_aperturas WHERE contrato_id = $1`,
      [contratoId]
    );
    if (a.rowCount === 0) return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' });
    const bitacora = a.rows[0];

    const f = await pool.query(
      `SELECT f.usuario_id, f.rol_en_firma, f.firmado, f.firmado_en, u.nombre, u.email
         FROM bitacora_firmantes f
         LEFT JOIN usuarios u ON u.id = f.usuario_id
        WHERE f.bitacora_id = $1
        ORDER BY f.id`,
      [bitacora.id]
    );
    const firmantes = f.rows;
    const completa = firmantes.length > 0 && firmantes.every((x) => x.firmado);
    return res.status(200).json({ ...bitacora, firmantes, completa });
  } catch (err) {
    console.error('[bitacoraDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ---------------------------------------------------------------------------
// HU-09: emisión y respuesta de notas tipificadas de bitácora.
// UN emisor por nota (art. 125): el rol del emisor se determina por su lugar en
// el equipo del contrato (residente_id/superintendente_id/supervision_id). El
// emisor SIEMPRE sale del JWT (req.user.id), nunca del body.
// ---------------------------------------------------------------------------

// Carga la apertura + el equipo del contrato y deduce el rol del usuario EN ESE
// contrato (null si no es parte firmante). { notFound:true } si no hay apertura.
async function cargarAperturaYRol(client, aperturaId, userId) {
  const a = await client.query(
    `SELECT a.id, a.contrato_id, a.plazo_firma_dias,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
       FROM bitacora_aperturas a
       JOIN contratos c ON c.id = a.contrato_id
      WHERE a.id = $1`,
    [aperturaId]
  );
  if (a.rowCount === 0) return { notFound: true };
  const row = a.rows[0];
  let rolEnContrato = null;
  if (row.residente_id === userId) rolEnContrato = 'residente';
  else if (row.superintendente_id === userId) rolEnContrato = 'superintendente';
  else if (row.supervision_id === userId) rolEnContrato = 'supervision';
  return { apertura: row, rolEnContrato };
}

// Matriz rol->tipo (art. 125) contra el catálogo bitacora_nota_tipos.
async function validarTipoParaRol(client, tipo, rolEnContrato) {
  const t = await client.query('SELECT rol_emisor FROM bitacora_nota_tipos WHERE clave = $1', [tipo]);
  if (t.rowCount === 0) return { ok: false, status: 400, error: 'Tipo de nota no reconocido' };
  const rolEmisor = t.rows[0].rol_emisor;
  if (rolEmisor !== null && rolEmisor !== rolEnContrato) {
    return { ok: false, status: 403, error: `Tu rol (${rolEnContrato}) no puede emitir notas de tipo "${tipo}"` };
  }
  return { ok: true };
}

// Inserta una nota con folio correlativo ATÓMICO por bitácora (advisory lock por
// bitácora + MAX+1; el UNIQUE(bitacora_id,numero) es la red). Debe ir dentro de una tx.
async function insertarNotaAtomica(client, { bitacoraId, tipo, asunto, contenido, emisorId, vinculadaA, tag }) {
  await client.query('SELECT pg_advisory_xact_lock($1)', [bitacoraId]);
  const ins = await client.query(
    `INSERT INTO bitacora_notas (bitacora_id, numero, tipo, asunto, contenido, emisor_id, estado, firmado_en, vinculada_a, tag)
     VALUES ($1, (SELECT COALESCE(MAX(numero),0)+1 FROM bitacora_notas WHERE bitacora_id = $1),
             $2, $3, $4, $5, 'emitida', NOW(), $6, $7)
     RETURNING id, bitacora_id, numero, tipo, asunto, contenido, emisor_id, estado, vinculada_a, fecha, firmado_en, tag`,
    [bitacoraId, tipo, asunto || null, contenido, emisorId, vinculadaA || null, tag || null]
  );
  return ins.rows[0];
}

// Pase 2.3 — Redacta el asunto/contenido de la nota AUTOMÁTICA de sustitución de personas
// (art. 125 fr. I g RLOPSRM). Compartida por roster.controller (al sustituir, en vivo) y por
// abrirBitacora (al asentar las sustituciones previas DIFERIDAS). `diferida` añade la aclaración
// temporal cuando la nota se asienta al abrir la bitácora (el hecho ocurrió antes que el folio).
const ROL_LABEL_SUST = { residente: 'residente de obra', superintendente: 'superintendente', supervision: 'supervisión' };
// O1-W3c (testing del equipo, 09-jun): la fecha del acto va en ESPAÑOL ("6 de junio de 2026").
// Antes: String(fecha).slice(0,10) sobre el Date que entrega pg para DATE → "Sat Jun 06" (los
// 10 primeros chars del toString en inglés). Acepta Date o string ISO; el día se interpreta en
// UTC (pg entrega DATE a medianoche UTC) para no correrse un día.
function fechaLargaES(fecha) {
  if (!fecha) return '—';
  const d = fecha instanceof Date ? fecha : new Date(`${String(fecha).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(fecha).slice(0, 10);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function textoNotaSustitucion({ rol, anteriorNombre, anteriorId, nuevoNombre, nuevoId, motivo, fecha, diferida }) {
  const rl = ROL_LABEL_SUST[rol] || rol;
  const ant = anteriorNombre || (anteriorId ? `Usuario #${anteriorId}` : '— sin titular previo —');
  const nue = nuevoNombre || (nuevoId ? `Usuario #${nuevoId}` : '—');
  const f = fechaLargaES(fecha);
  // O1-W3a: el TÍTULO dice QUIÉN se sustituyó (antes era genérico). Clamp al VARCHAR(200) de asunto.
  const asunto = `Sustitución de ${rl}: ${ant} → ${nue}`.slice(0, 200);
  const cola = diferida
    ? ` Sustitución ocurrida el ${f}; asentada al abrir la bitácora.`
    : '';
  // O1-W3b: redacción NARRATIVA; el motivo es del CAMBIO de la persona anterior (no un atributo
  // de la persona nueva, como leía antes).
  const contenido =
    `Se sustituye a ${ant} como ${rl} del contrato. Motivo del cambio: ${motivo || '—'}. ` +
    `Entra ${nue} a partir del ${f}.${cola} ` +
    `(art. 125 fr. I inciso g RLOPSRM; asiento automático del sistema.)`;
  return { asunto, contenido };
}

// O4 (HU-06 v2, 10-jun) — Redacta el asunto/contenido de la nota AUTOMÁTICA de AVANCE de trabajos
// (art. 125 fr. II RLOPSRM: la entrega de obra se avisa por nota de bitácora; el profe, P14: "el
// aviso es a través de una nota"). Compartida por trabajos.controller (al registrar, en vivo) y por
// abrirBitacora (al asentar los avances previos DIFERIDOS). `diferida` añade la aclaración temporal.
// Formato de cantidad es-MX hasta 3 decimales (escala de concepto_avance.cantidad NUMERIC(14,3)).
function textoNotaAvance({ concepto, unidad, cantidad, periodoNumero, diferida }) {
  const cant = Number(cantidad).toLocaleString('es-MX', { maximumFractionDigits: 3 });
  const p = periodoNumero != null ? periodoNumero : '—';
  const asunto = `Avance de trabajos — ${concepto}`.slice(0, 200);
  const cola = diferida ? ' Registrado antes de abrir la bitácora; asentado al abrirla.' : '';
  const contenido =
    `Avance de trabajos — ${concepto}: se ejecutaron ${cant} ${unidad || ''} en el periodo ${p}, ` +
    `conforme al programa de obra.${cola} (art. 125 fr. II RLOPSRM; asiento automático del sistema.)`;
  return { asunto, contenido };
}

// O5 (HU-07 v2, 10-jun) — Redacta el asunto/contenido de la nota de ATRASO de un concepto respecto
// del programa VIGENTE medido al periodo actual (P15 del profe: el atraso se reporta en UNIDADES del
// concepto, sin umbral ni %). La asienta alertas.controller (acción "Asentar en bitácora", solo si hay
// bitácora abierta). Va con tag='atraso' y tipo 'otro' para SEPARARLO de las notas de 'avance' (el profe
// insistió en no mezclar atraso con avance). Fundamento: el programa de obra es la base para medir el
// avance (LOPSRM art. 52; RLOPSRM art. 45 ap. A fr. X) y el residente lleva en la bitácora los hechos
// relevantes (art. 123 RLOPSRM). Formato de cantidad es-MX hasta 3 decimales (escala NUMERIC(14,3)).
function textoNotaAtraso({ concepto, unidad, cantidad, periodoNumero }) {
  const cant = Number(cantidad).toLocaleString('es-MX', { maximumFractionDigits: 3 });
  const u = unidad || '';
  const p = periodoNumero != null ? periodoNumero : '—';
  const asunto = `Atraso de obra — ${concepto}`.slice(0, 200);
  const contenido =
    `Atraso registrado — ${concepto}: déficit de ${cant} ${u} respecto del programa al periodo ${p}. ` +
    `El déficit es lo programado acumulado al periodo vigente menos lo ejecutado acumulado, en unidades ` +
    `del concepto (LOPSRM art. 52; RLOPSRM art. 45 ap. A fr. X). Asiento del sistema (art. 123 RLOPSRM).`;
  return { asunto, contenido };
}

// O6 (10-jun) — Redacta el asunto/contenido de la nota AUTOMÁTICA de un CONVENIO MODIFICATORIO
// (art. 59 LOPSRM; el convenio es un hecho relevante que se asienta en la bitácora, art. 123 fr. III /
// 125 fr. I RLOPSRM). Compartida por convenios.controller (al registrar, en vivo) y por abrirBitacora
// (al asentar los convenios previos DIFERIDOS). La variación se reporta según el `tipo`: monto/programa/
// mixto incluyen monto; plazo/mixto incluyen plazo. `diferida` añade la aclaración temporal.
function textoNotaConvenio({ folio, tipo, deltaMontoPct, deltaPlazoPct, motivo, diferida }) {
  const incMonto = ['monto', 'programa', 'mixto'].includes(tipo);
  const incPlazo = ['plazo', 'mixto'].includes(tipo);
  const fmtPct = (n) => (n == null ? '—' : String(n));   // delta_*_pct ya viene redondeado a 2 dec (NUMERIC)
  const partes = [];
  if (incMonto) partes.push(`${fmtPct(deltaMontoPct)}% sobre monto`);
  if (incPlazo) partes.push(`${fmtPct(deltaPlazoPct)}% sobre plazo`);
  const variacion = partes.length ? partes.join(' y ') : 'sin variación de monto ni plazo';
  const asunto = `Convenio modificatorio ${folio} (${tipo})`.slice(0, 200);
  const cola = diferida ? ' Registrado antes de abrir la bitácora; asentado al abrirla.' : '';
  const contenido =
    `Convenio modificatorio ${folio}: ${tipo}; variación ${variacion}. Motivo: ${motivo || '—'}.${cola} ` +
    `(art. 59 LOPSRM / art. 99, 123 fr. III RLOPSRM; asiento automático del sistema.)`;
  return { asunto, contenido };
}

function leerCamposNota(body) {
  return {
    tipo: typeof body.tipo === 'string' ? body.tipo.trim() : '',
    asunto: typeof body.asunto === 'string' ? body.asunto.trim() : '',
    contenido: typeof body.contenido === 'string' ? body.contenido.trim() : '',
    // PUNTO 4 (profe): tag de búsqueda por nota (los tipos van embebidos → un tag estructurado
    // hace la búsqueda eficiente). Opcional.
    tag: typeof body.tag === 'string' ? body.tag.trim() : ''
  };
}

// POST /api/bitacora/:aperturaId/notas — emite una nota nueva (firmada por el emisor al emitir).
async function emitirNota(req, res) {
  const aperturaId = Number(req.params.aperturaId);
  if (!Number.isInteger(aperturaId) || aperturaId <= 0) return res.status(400).json({ error: 'aperturaId inválido' });
  const { tipo, asunto, contenido, tag } = leerCamposNota(req.body || {});
  if (!tipo) return res.status(400).json({ error: 'Falta el tipo de nota' });
  // La nota de apertura (folio #1) la genera la apertura; no se emite a mano.
  if (tipo === 'apertura') return res.status(400).json({ error: 'La nota de apertura (folio #1) la genera la apertura de bitácora, no se emite a mano' });
  if (!contenido) return res.status(400).json({ error: 'Falta el contenido de la nota' });
  if (contenido.length > 5000) return res.status(400).json({ error: 'El contenido no puede exceder 5000 caracteres' });
  if (asunto.length > 200) return res.status(400).json({ error: 'El asunto no puede exceder 200 caracteres' });
  if (tag.length > 60) return res.status(400).json({ error: 'El tag no puede exceder 60 caracteres' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { notFound, apertura, rolEnContrato } = await cargarAperturaYRol(client, aperturaId, req.user.id);
      if (notFound) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' }); }
      if (!rolEnContrato) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No eres parte firmante de este contrato; no puedes emitir notas' }); }

      // PUNTO 3 (candado de emisión, SERVER-SIDE): NO se puede emitir una nota hasta que la
      // APERTURA esté firmada por TODOS los participantes requeridos. art. 123 fr. III: la
      // bitácora "se deberá iniciar con una nota especial" firmada por el personal autorizado;
      // hasta entonces no hay base para asentar notas. (Antes bastaba una sola firma → bug.)
      const ff = await client.query(
        'SELECT count(*) FILTER (WHERE NOT firmado) AS pendientes FROM bitacora_firmantes WHERE bitacora_id = $1',
        [apertura.id]
      );
      const pendientes = Number(ff.rows[0].pendientes);
      if (pendientes > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `No se pueden emitir notas hasta que la apertura esté firmada por TODOS los participantes (faltan ${pendientes} firma(s)).` });
      }

      const v = await validarTipoParaRol(client, tipo, rolEnContrato);
      if (!v.ok) { await client.query('ROLLBACK'); return res.status(v.status).json({ error: v.error }); }

      const nota = await insertarNotaAtomica(client, { bitacoraId: apertura.id, tipo, asunto, contenido, emisorId: req.user.id, tag });
      await client.query('COMMIT');
      return res.status(201).json(nota);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally { client.release(); }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Folio de nota duplicado; reintenta' });
    console.error('[emitirNota]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Construye el payload de notas (identidad del emisor, tipo, folio, estado, vínculo
// y estado de ACEPTACIÓN derivado: tácita si venció el plazo sin respuesta de
// contraparte) para una apertura YA resuelta y con acceso verificado. Lo comparten
// listarNotas (por aperturaId) y notasDeContrato (por contratoId, base de HU-10).
// `apertura` trae id, contrato_id, plazo_firma_dias y el equipo del contrato
// (residente_id/superintendente_id/supervision_id) para derivar mi_rol.
async function construirPayloadNotas(apertura, userId) {
  // Rol del usuario EN ESTE contrato (null si solo es ve-todo: dependencia/finanzas).
  // Permite al UI filtrar los tipos emitibles sin exponer el equipo completo.
  let miRol = null;
  if (apertura.residente_id === userId) miRol = 'residente';
  else if (apertura.superintendente_id === userId) miRol = 'superintendente';
  else if (apertura.supervision_id === userId) miRol = 'supervision';

  const r = await pool.query(
    `SELECT n.id, n.numero, n.tipo, tp.etiqueta AS tipo_etiqueta, tp.rol_emisor,
            n.asunto, n.contenido, n.tag, n.estado, n.vinculada_a, n.fecha, n.firmado_en,
            n.emisor_id, u.nombre AS emisor_nombre, u.email AS emisor_correo,
            (NOW() > n.fecha + make_interval(days => $2::int)) AS plazo_vencido,
            EXISTS (SELECT 1 FROM bitacora_notas m
                     WHERE m.vinculada_a = n.id AND m.emisor_id IS DISTINCT FROM n.emisor_id) AS respondida,
            COALESCE((SELECT json_agg(json_build_object(
                         'usuario_id', nf.usuario_id, 'rol_en_firma', nf.rol_en_firma,
                         'nombre', uf.nombre, 'firmado_en', nf.firmado_en) ORDER BY nf.firmado_en)
                        FROM bitacora_nota_firmas nf LEFT JOIN usuarios uf ON uf.id = nf.usuario_id
                       WHERE nf.nota_id = n.id), '[]'::json) AS firmas
       FROM bitacora_notas n
       LEFT JOIN bitacora_nota_tipos tp ON tp.clave = n.tipo
       LEFT JOIN usuarios u ON u.id = n.emisor_id
      WHERE n.bitacora_id = $1
      ORDER BY n.numero`,
    [apertura.id, apertura.plazo_firma_dias]
  );

  // Firmantes de la APERTURA (firma conjunta, art. 123 fr. III): los reusa la nota #1 para
  // mostrar quién firmó + fecha/hora y habilitar el botón de firma de la apertura.
  const fr = await pool.query(
    `SELECT f.usuario_id, f.rol_en_firma, f.firmado, f.firmado_en, u.nombre, u.email
       FROM bitacora_firmantes f LEFT JOIN usuarios u ON u.id = f.usuario_id
      WHERE f.bitacora_id = $1 ORDER BY f.id`,
    [apertura.id]
  );
  const aperturaFirmantes = fr.rows;
  const aperturaCompleta = aperturaFirmantes.length > 0 && aperturaFirmantes.every((x) => x.firmado);

  // BUG 2 (causa raíz): "firmada" se computa contra TODAS las firmas requeridas, NO solo por
  // vencimiento del plazo. Quiénes firman una nota = las PARTES del contrato (mismo roster que
  // firma la apertura): residente + superintendente + supervisión (si aplica). Fundamento:
  // art. 123 fr. III RLOPSRM ("plazo máximo para la firma de las notas… las partes… se tendrán
  // por aceptadas una vez vencido el plazo") y fr. XII ("el residente, el superintendente y, en
  // su caso, el supervisor deberán resolver y cerrar… todas las notas que les correspondan").
  // El emisor firma al emitir (n.firmado_en); las contrapartes vía bitacora_nota_firmas. En
  // cuanto el conjunto de firmantes cubre al roster → 'firmada' (sin esperar al plazo). La
  // aceptación TÁCITA por vencimiento aplica SOLO si NO se completaron las firmas.
  // [validar] alternativa: que baste la contraparte directa (no todo el roster).
  const rosterIds = [apertura.residente_id, apertura.superintendente_id, apertura.supervision_id].filter((x) => x != null);

  const notas = r.rows.map((n) => {
    const firmantesNota = new Set([n.emisor_id, ...(n.firmas || []).map((f) => f.usuario_id)].filter((x) => x != null));
    const todasFirmadas = rosterIds.length > 0 && rosterIds.every((id) => firmantesNota.has(id));
    let aceptacion;
    if (n.estado === 'anulada') aceptacion = 'anulada';
    else if (n.tipo === 'apertura') aceptacion = aperturaCompleta ? 'firmada' : 'en_plazo'; // su firma es la conjunta
    else if (todasFirmadas) aceptacion = 'firmada';            // todas las firmas requeridas (antes del plazo)
    else if (n.respondida) aceptacion = 'respondida';
    else if (n.plazo_vencido) aceptacion = 'aceptada_tacita';  // tácita SOLO si no firmaron a tiempo
    else aceptacion = 'en_plazo';
    return { ...n, aceptacion };
  });

  return {
    apertura_id: apertura.id,
    contrato_id: apertura.contrato_id,
    plazo_firma_dias: apertura.plazo_firma_dias,
    mi_rol: miRol,
    apertura_firmantes: aperturaFirmantes,
    apertura_completa: aperturaCompleta,
    notas
  };
}

// GET /api/bitacora/:aperturaId/notas — lista las notas de UNA apertura (por id).
// Acotada por participación.
async function listarNotas(req, res) {
  try {
    const aperturaId = Number(req.params.aperturaId);
    if (!Number.isInteger(aperturaId) || aperturaId <= 0) return res.status(400).json({ error: 'aperturaId inválido' });

    const a = await pool.query(
      `SELECT a.id, a.contrato_id, a.plazo_firma_dias,
              c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM bitacora_aperturas a
         JOIN contratos c ON c.id = a.contrato_id
        WHERE a.id = $1`,
      [aperturaId]
    );
    if (a.rowCount === 0) return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' });
    const apertura = a.rows[0];
    if (!esParteOSupervision(req.user, apertura)) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }
    return res.status(200).json(await construirPayloadNotas(apertura, req.user.id));
  } catch (err) {
    console.error('[listarNotas]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/bitacora/contrato/:contratoId/notas — resuelve la (única) apertura del
// contrato y devuelve sus notas. Azúcar de HU-10: el UI maneja contratos, no
// aperturaId. El acceso se verifica sobre el CONTRATO (participación) ANTES de
// revelar si tiene bitácora, igual que las demás lecturas por contrato.
async function notasDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contratoId inválido' });

    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }

    const a = await pool.query(
      'SELECT id, contrato_id, plazo_firma_dias FROM bitacora_aperturas WHERE contrato_id = $1',
      [contratoId]
    );
    if (a.rowCount === 0) return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' });

    // Mezcla explícita: id/plazo de la apertura + equipo del contrato. (No usar
    // spread de c.rows[0]: su `id` es el del contrato y pisaría el de la apertura.)
    const apertura = {
      id: a.rows[0].id,
      contrato_id: a.rows[0].contrato_id,
      plazo_firma_dias: a.rows[0].plazo_firma_dias,
      residente_id: c.rows[0].residente_id,
      superintendente_id: c.rows[0].superintendente_id,
      supervision_id: c.rows[0].supervision_id
    };
    return res.status(200).json(await construirPayloadNotas(apertura, req.user.id));
  } catch (err) {
    console.error('[notasDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/bitacora/notas/:notaId/anular — SOLO el emisor anula su nota (por error,
// art. 123 fr. VII) y genera una nota correctiva consecutiva "dice/debe decir" que
// referencia la original. La original pasa a 'anulada' (no se edita).
async function anularNota(req, res) {
  const notaId = Number(req.params.notaId);
  if (!Number.isInteger(notaId) || notaId <= 0) return res.status(400).json({ error: 'notaId inválido' });
  const contenido = typeof (req.body || {}).contenido === 'string' ? req.body.contenido.trim() : '';
  if (!contenido) return res.status(400).json({ error: 'Falta el texto de corrección (dice / debe decir)' });
  if (contenido.length > 5000) return res.status(400).json({ error: 'El contenido no puede exceder 5000 caracteres' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      const nres = await client.query(
        'SELECT id, bitacora_id, numero, tipo, emisor_id, estado FROM bitacora_notas WHERE id = $1 FOR UPDATE',
        [notaId]
      );
      if (nres.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Nota no encontrada' }); }
      const nota = nres.rows[0];
      // La nota de apertura (folio #1) es el acta de inicio: no se anula (art. 123 fr. III/V/VI).
      if (nota.tipo === 'apertura') { await client.query('ROLLBACK'); return res.status(403).json({ error: 'La nota de apertura (folio #1) no puede anularse' }); }
      if (nota.emisor_id !== req.user.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo el emisor puede anular su nota' }); }
      if (nota.estado !== 'emitida') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La nota ya está anulada' }); }

      const resp = await client.query(
        'SELECT 1 FROM bitacora_notas WHERE vinculada_a = $1 AND emisor_id IS DISTINCT FROM $2 LIMIT 1',
        [notaId, req.user.id]
      );
      if (resp.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La nota ya fue respondida por otra parte; no puede anularse' }); }

      await client.query("UPDATE bitacora_notas SET estado = 'anulada' WHERE id = $1", [notaId]);

      const correctiva = await insertarNotaAtomica(client, {
        bitacoraId: nota.bitacora_id,
        tipo: nota.tipo,
        asunto: `Corrección (dice/debe decir) de la nota #${nota.numero}`,
        contenido,
        emisorId: req.user.id,
        vinculadaA: notaId
      });

      await client.query('COMMIT');
      return res.status(201).json({ anulada_id: notaId, correctiva });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally { client.release(); }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Folio de nota duplicado; reintenta' });
    console.error('[anularNota]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/bitacora/notas/:notaId/vincular — una parte del roster crea una nota
// NUEVA (respuesta/adición/resolución, art. 123 fr. VIII y XII) que referencia la
// original; la original queda intacta. El tipo se valida contra el rol del que responde.
async function vincularNota(req, res) {
  const notaId = Number(req.params.notaId);
  if (!Number.isInteger(notaId) || notaId <= 0) return res.status(400).json({ error: 'notaId inválido' });
  const { tipo, asunto, contenido } = leerCamposNota(req.body || {});
  if (!tipo) return res.status(400).json({ error: 'Falta el tipo de nota' });
  if (!contenido) return res.status(400).json({ error: 'Falta el contenido de la respuesta' });
  if (contenido.length > 5000) return res.status(400).json({ error: 'El contenido no puede exceder 5000 caracteres' });
  if (asunto.length > 200) return res.status(400).json({ error: 'El asunto no puede exceder 200 caracteres' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orig = await client.query('SELECT id, bitacora_id FROM bitacora_notas WHERE id = $1', [notaId]);
      if (orig.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Nota a vincular no encontrada' }); }
      const bitacoraId = orig.rows[0].bitacora_id;

      const { notFound, apertura, rolEnContrato } = await cargarAperturaYRol(client, bitacoraId, req.user.id);
      if (notFound) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' }); }
      if (!rolEnContrato) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No eres parte firmante de este contrato; no puedes responder notas' }); }

      // B-2 (auditoría — art. 123 fr. VI RLOPSRM: trazabilidad/auditabilidad de las referencias de la
      // bitácora) [validar texto literal con el profe]: la nota-respuesta DEBE quedar en la MISMA
      // bitácora que la nota referenciada. Hoy se DERIVA (la respuesta se crea en apertura.id, que es la
      // bitácora de la nota original), pero se hace EXPLÍCITO para VERIFICAR la invariante y que sea
      // inmune a refactors futuros del flujo de vinculación (que la nota destino no quede ligada a una
      // bitácora/contrato distinto). El cruce por una persona ajena ya lo frena el 403 de participación.
      if (apertura.id !== bitacoraId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La nota referenciada no pertenece a esta bitácora; no se puede vincular una nota fuera de su propio contrato (art. 123 fr. VI RLOPSRM)' });
      }

      const v = await validarTipoParaRol(client, tipo, rolEnContrato);
      if (!v.ok) { await client.query('ROLLBACK'); return res.status(v.status).json({ error: v.error }); }

      const nota = await insertarNotaAtomica(client, {
        bitacoraId: apertura.id, tipo, asunto, contenido, emisorId: req.user.id, vinculadaA: notaId
      });
      await client.query('COMMIT');
      return res.status(201).json(nota);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally { client.release(); }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Folio de nota duplicado; reintenta' });
    console.error('[vincularNota]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/bitacora/nota-tipos — catálogo de tipos (art. 125) para que el UI filtre
// por rol. Único requisito: estar autenticado (el router ya lo exige).
async function listarNotaTipos(req, res) {
  try {
    // Se devuelven TODOS (con `activo`): el UI de emisión filtra activo=true (solo los tipos
    // vigentes del art. 125); la consulta puede resolver etiquetas de tipos viejos (inactivos).
    const r = await pool.query('SELECT clave, etiqueta, rol_emisor, orden, activo FROM bitacora_nota_tipos ORDER BY orden');
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[listarNotaTipos]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/bitacora/notas/:notaId/firmar — PUNTO 2: una PARTE del contrato que NO es el
// emisor firma (acepta) una nota dentro del plazo (art. 123 fr. III: "plazo máximo para la
// firma de las notas"). Append-only (bitacora_nota_firmas). Distinto de la firma CONJUNTA de
// la APERTURA (esa va por /:aperturaId/firmar, requiere a TODOS los participantes). El emisor
// ya firmó al emitir. La aceptación tácita al vencer el plazo se sigue derivando en la consulta.
async function firmarNota(req, res) {
  const notaId = Number(req.params.notaId);
  if (!Number.isInteger(notaId) || notaId <= 0) return res.status(400).json({ error: 'notaId inválido' });
  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      const nres = await client.query('SELECT id, bitacora_id, tipo, emisor_id, estado FROM bitacora_notas WHERE id = $1', [notaId]);
      if (nres.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Nota no encontrada' }); }
      const nota = nres.rows[0];
      if (nota.tipo === 'apertura') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La apertura (nota #1) se firma en "Por firmar" (firma conjunta de TODOS los participantes)' }); }
      if (nota.estado !== 'emitida') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La nota está anulada; no puede firmarse' }); }

      const { notFound, rolEnContrato } = await cargarAperturaYRol(client, nota.bitacora_id, req.user.id);
      if (notFound) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' }); }
      if (!rolEnContrato) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No eres parte de este contrato; no puedes firmar sus notas' }); }
      if (nota.emisor_id === req.user.id) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'El emisor ya firmó la nota al emitirla; la firma aquí es de la contraparte' }); }

      const ins = await client.query(
        `INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma)
         VALUES ($1, $2, $3) ON CONFLICT (nota_id, usuario_id) DO NOTHING
         RETURNING id, firmado_en`,
        [notaId, req.user.id, rolEnContrato]
      );
      if (ins.rowCount === 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Ya firmaste esta nota' }); }
      await client.query('COMMIT');
      return res.status(201).json({ nota_id: notaId, firmado: true, firmado_en: ins.rows[0].firmado_en, rol_en_firma: rolEnContrato });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('[firmarNota]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  abrirBitacora,
  firmarApertura,
  pendientesPorFirmar,
  bitacoraDeContrato,
  listarNotaTipos,
  emitirNota,
  listarNotas,
  notasDeContrato,
  anularNota,
  vincularNota,
  firmarNota,
  // Pase 2.3 — reutilizados por roster.controller para la nota automática de sustitución.
  insertarNotaAtomica,
  textoNotaSustitucion,
  // O4 — reutilizado por trabajos.controller para la nota automática de avance.
  textoNotaAvance,
  // O5 — reutilizado por alertas.controller para la nota de atraso (acción "Asentar en bitácora").
  textoNotaAtraso,
  // O6 — reutilizado por convenios.controller para la nota automática del convenio modificatorio.
  textoNotaConvenio
};
