// PASADA HU-03 (Fundación) — Convenios modificatorios + versionado del programa.
// Fundamento Nivel 1 (LOPSRM art. 59, reforma DOF 14-11-2025): modificar contratos mediante
// convenios "dentro de su presupuesto autorizado… siempre y cuando no impliquen variaciones
// sustanciales al objeto". El texto VIGENTE NO impone tope numérico (25%): el 25% es RLOPSRM art.
// 102 (disparador de revisión/SFP) y el 50% es art. 59 Bis (ajuste de costos) — se CLASIFICAN
// (flags), no son topes. El guardrail de variación es PARAMETRIZABLE (CONVENIO_LIMITE_VARIACION_PCT),
// NO un tope legal. El convenio SIEMPRE se funda en art. 59 (+ art. 99 RLOPSRM, dictamen técnico).
// Archivo NUEVO (la UI la hace E3).
//
// DISEÑO: el programa VIGENTE vive en programa_obra (A2, intacto). Cada convenio que toca el
// programa: (1) snapshotea v1 perezosamente si no existe, (2) muta el catálogo (contrato_conceptos),
// (3) re-cuadra el programa con guardarMatriz({convenioId}) a Σ = monto nuevo, (4) crea una versión
// nueva (snapshot inmutable) y supersede la anterior. Las estimaciones previas son INMUNES por
// diseño (snapshots en estimacion_generadores + carátula congelada) — no cambian por un convenio.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { guardarMatriz } = require('../lib/programa');
// O6: el convenio asienta su nota en la bitácora (art. 123 fr. III RLOPSRM). Reutiliza el folio atómico
// + la redacción del controller de bitácora (no se duplica la lógica de inmutabilidad de notas).
const { insertarNotaAtomica, textoNotaConvenio } = require('./bitacora.controller');

// Guardrail de variación PARAMETRIZABLE (NO es tope legal; el art. 59 vigente no tiene tope numérico).
// Default 25 (= umbral de revisión del art. 102 RLOPSRM, reutilizado como guardrail). <=0 = sin tope.
const LIMITE_PCT = Number(process.env.CONVENIO_LIMITE_VARIACION_PCT ?? 25);
const UMBRAL_SFP = 25;    // RLOPSRM art. 102 (revisión indirectos/SFP)
const UMBRAL_AJUSTE = 50; // LOPSRM art. 59 Bis (ajuste de costos)

// Σ ROUND(cant×pu,2) con la MISMA fórmula/escala que crearContrato (cuadre al centavo, art. 45 fr. IX).
async function montoDesdeConceptos(client, conceptos) {
  if (!conceptos.length) return '0.00';
  const vals = conceptos.map((_, i) => `($${i * 2 + 1}::numeric(14,3), $${i * 2 + 2}::numeric(16,4))`).join(', ');
  const params = [];
  for (const c of conceptos) { params.push(c.cantidad, c.pu); }
  const r = await client.query(
    `SELECT COALESCE(SUM(ROUND(t.cant * t.pu, 2)), 0)::numeric(18,2) AS monto FROM (VALUES ${vals}) AS t(cant, pu)`,
    params
  );
  return r.rows[0].monto;
}

// Snapshot del estado VIVO (catálogo + celdas + monto/plazo) como una programa_version.
async function snapshotVersion(client, contratoId, numero, convenioId, vigente) {
  const ct = (await client.query('SELECT monto, plazo_dias FROM contratos WHERE id = $1', [contratoId])).rows[0];
  const ver = await client.query(
    'INSERT INTO programa_version (contrato_id, numero, convenio_id, monto, plazo_dias, vigente) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [contratoId, numero, convenioId, ct.monto, ct.plazo_dias, vigente]
  );
  const verId = ver.rows[0].id;
  await client.query(
    `INSERT INTO programa_version_concepto (programa_version_id, clave, concepto, unidad, cantidad, pu, orden)
     SELECT $1, clave, concepto, unidad, cantidad, pu, orden FROM contrato_conceptos WHERE contrato_id = $2`,
    [verId, contratoId]
  );
  await client.query(
    `INSERT INTO programa_version_celda (programa_version_id, concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad)
     SELECT $1, cc.clave, cp.numero, cp.inicio, cp.fin, po.cantidad
       FROM programa_obra po
       JOIN contrato_conceptos cc ON cc.id = po.contrato_concepto_id
       JOIN contrato_periodos  cp ON cp.id = po.contrato_periodo_id
      WHERE cc.contrato_id = $2`,
    [verId, contratoId]
  );
  return verId;
}

// GET /api/convenios/contrato/:id — convenios + versiones del programa. Acotado por participación.
async function listarConvenios(req, res) {
  try {
    const contratoId = Number(req.params.id);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const c = await pool.query('SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1', [contratoId]);
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) return res.status(403).json({ error: 'No tienes acceso a los convenios de este contrato' });

    const convenios = await pool.query(
      `SELECT cm.*, u.nombre AS autorizado_por_nombre
         FROM convenios_modificatorios cm
         LEFT JOIN usuarios u ON u.id = cm.autorizado_por
        WHERE cm.contrato_id = $1 ORDER BY cm.numero`, [contratoId]);
    const versiones = await pool.query(
      'SELECT id, numero, convenio_id, monto, plazo_dias, vigente, created_at, supersedido_en FROM programa_version WHERE contrato_id = $1 ORDER BY numero', [contratoId]);
    return res.status(200).json({ contrato_id: contratoId, convenios: convenios.rows, versiones: versiones.rows });
  } catch (err) { console.error('[listarConvenios]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/convenios/version/:versionId — snapshot (catálogo + celdas) de una versión del programa.
async function detalleVersion(req, res) {
  try {
    const versionId = Number(req.params.versionId);
    if (!Number.isInteger(versionId) || versionId <= 0) return res.status(400).json({ error: 'versión inválida' });
    const v = await pool.query(
      `SELECT pv.*, c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM programa_version pv JOIN contratos c ON c.id = pv.contrato_id WHERE pv.id = $1`, [versionId]);
    if (v.rowCount === 0) return res.status(404).json({ error: 'La versión indicada no existe' });
    if (!esParteOSupervision(req.user, v.rows[0])) return res.status(403).json({ error: 'No tienes acceso a esta versión' });
    const conceptos = await pool.query('SELECT clave, concepto, unidad, cantidad, pu, orden FROM programa_version_concepto WHERE programa_version_id = $1 ORDER BY orden', [versionId]);
    const celdas = await pool.query('SELECT concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad FROM programa_version_celda WHERE programa_version_id = $1 ORDER BY concepto_clave, periodo_numero', [versionId]);
    const { created_by, residente_id, superintendente_id, supervision_id, ...version } = v.rows[0];
    return res.status(200).json({ version, conceptos: conceptos.rows, celdas: celdas.rows });
  } catch (err) { console.error('[detalleVersion]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/convenios/contrato/:id — crear un convenio modificatorio (transaccional).
// Body: { tipo, motivo, folio?, conceptos?:[{clave,concepto,unidad,cantidad,pu}], celdas?:[{clave,periodoNumero,cantidad}], plazo_nuevo_dias? }
async function crearConvenio(req, res) {
  const contratoId = Number(req.params.id);
  if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(404).json({ error: 'Contrato no encontrado' });
  const body = req.body || {};
  const tipo = String(body.tipo || '').trim();
  const motivo = (body.motivo != null ? String(body.motivo).trim() : '') || null;
  const folio = body.folio != null ? String(body.folio).trim() : null;
  const conceptos = Array.isArray(body.conceptos) ? body.conceptos : [];
  const celdas = Array.isArray(body.celdas) ? body.celdas : [];
  const plazoNuevo = Number.isInteger(Number(body.plazo_nuevo_dias)) && Number(body.plazo_nuevo_dias) > 0 ? Number(body.plazo_nuevo_dias) : null;

  if (!['monto', 'plazo', 'programa', 'mixto'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido (monto|plazo|programa|mixto)' });
  if (!motivo) return res.status(400).json({ error: 'El motivo (razones fundadas y explícitas / dictamen técnico, art. 99 RLOPSRM) es obligatorio' });
  const tocaPrograma = ['monto', 'programa', 'mixto'].includes(tipo);
  const tocaPlazo = ['plazo', 'mixto'].includes(tipo);
  if (tocaPrograma && (conceptos.length === 0 || celdas.length === 0)) return res.status(400).json({ error: 'Para un convenio de monto/programa, envía el catálogo (conceptos) y el programa (celdas) NUEVOS completos' });
  if (tocaPlazo && plazoNuevo == null) return res.status(400).json({ error: 'Para un convenio de plazo, envía plazo_nuevo_dias (> 0)' });
  for (const c of conceptos) {
    if (!c.clave || !(Number(c.cantidad) >= 0) || !(Number(c.pu) >= 0)) return res.status(400).json({ error: 'Cada concepto requiere clave, cantidad >= 0 y pu >= 0' });
  }
  // Rechazar claves DUPLICADAS en el body: inflarían el monto y la clasificación del registro inmutable.
  const clavesBody = conceptos.map((c) => String(c.clave));
  if (new Set(clavesBody).size !== clavesBody.length) return res.status(400).json({ error: 'El catálogo nuevo tiene claves repetidas' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Lock al INICIO (mismo classid 2 que guardarMatriz/HU-12) → catálogo + re-cuadre atómicos.
      await client.query('SELECT pg_advisory_xact_lock(2, $1::int)', [contratoId]);

      const cres = await client.query('SELECT id, created_by, residente_id, superintendente_id, supervision_id, monto, plazo_dias, fecha_inicio FROM contratos WHERE id = $1 FOR UPDATE', [contratoId]);
      if (cres.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Contrato no encontrado' }); }
      const contrato = cres.rows[0];
      // Autoridad [validar con el profe]: dependencia o residente asignado/creador (art. 99: el
      // residente sustenta el dictamen técnico; el servidor que firmó el contrato lo suscribe).
      const puede = req.user.rol === 'dependencia' || contrato.residente_id === req.user.id || contrato.created_by === req.user.id;
      if (!puede) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo la dependencia o el residente asignado puede registrar convenios' }); }

      const montoAnterior = contrato.monto;   // string NUMERIC
      const plazoAnterior = contrato.plazo_dias;

      // (A) Pre-validación del programa ANTES de mutar (rechazo temprano sin tocar datos).
      if (tocaPrograma) {
        const conNull = await client.query('SELECT 1 FROM contrato_conceptos WHERE contrato_id=$1 AND clave IS NULL LIMIT 1', [contratoId]);
        if (conNull.rowCount > 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Este contrato tiene conceptos sin clave; no es modificable por convenio hasta clasificarlos' }); }
        // art. 118 RLOPSRM: una cantidad contratada NUEVA no puede quedar por debajo de lo YA estimado.
        const acum = await client.query(
          `SELECT cc.clave, COALESCE(SUM(eg.cantidad_periodo),0) AS estimado
             FROM contrato_conceptos cc
             JOIN estimacion_generadores eg ON eg.contrato_concepto_id = cc.id
             JOIN estimaciones e ON e.id = eg.estimacion_id AND e.estado <> 'rechazada'
            WHERE cc.contrato_id = $1 GROUP BY cc.clave`, [contratoId]);
        const estimadoPorClave = new Map(acum.rows.map((r) => [r.clave, Number(r.estimado)]));
        for (const c of conceptos) {
          const ya = estimadoPorClave.get(String(c.clave)) || 0;
          if (Number(c.cantidad) + 1e-9 < ya) { await client.query('ROLLBACK'); return res.status(400).json({ error: `El concepto "${c.clave}" no puede reducirse a ${c.cantidad}: ya hay ${ya} estimado (art. 118 RLOPSRM)` }); }
        }
        // El catálogo nuevo debe incluir TODOS los conceptos existentes (catálogo completo).
        const existentes = await client.query('SELECT clave FROM contrato_conceptos WHERE contrato_id = $1', [contratoId]);
        const clavesNuevas = new Set(clavesBody);
        const faltan = existentes.rows.filter((r) => !clavesNuevas.has(String(r.clave))).map((r) => r.clave);
        if (faltan.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: `El catálogo nuevo debe incluir TODOS los conceptos existentes; faltan: ${faltan.join(', ')}` }); }
        // Pre-check del guardrail con el monto del payload (== monto canónico tras mutar).
        const montoPre = await montoDesdeConceptos(client, conceptos);
        const dPre = (await client.query('SELECT CASE WHEN $2::numeric>0 THEN ABS(ROUND((($1::numeric-$2::numeric)/$2::numeric)*100,2)) ELSE NULL END AS d', [montoPre, montoAnterior])).rows[0].d;
        if (LIMITE_PCT > 0 && dPre != null && Number(dPre) > LIMITE_PCT) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `La variación de monto (${dPre}%) excede el límite configurado (${LIMITE_PCT}%). (Guardrail parametrizable, NO tope legal; ajusta CONVENIO_LIMITE_VARIACION_PCT.)` });
        }
      }
      if (tocaPlazo && LIMITE_PCT > 0 && plazoAnterior > 0) {
        const dp = Math.abs(((plazoNuevo - plazoAnterior) / plazoAnterior) * 100);
        if (dp > LIMITE_PCT) { await client.query('ROLLBACK'); return res.status(400).json({ error: `La variación de plazo (${dp.toFixed(2)}%) excede el límite configurado (${LIMITE_PCT}%).` }); }
      }

      // (B) Snapshot perezoso de v1 (estado VIVO ORIGINAL) ANTES de mutar — solo si toca el programa.
      let numeroVer = Number((await client.query('SELECT COALESCE(MAX(numero),0) AS m FROM programa_version WHERE contrato_id = $1', [contratoId])).rows[0].m);
      if (tocaPrograma && numeroVer === 0) { await snapshotVersion(client, contratoId, 1, null, true); numeroVer = 1; }

      // (C) Aplicar la modificación al estado VIVO.
      let montoNuevo = montoAnterior;
      let plazoNuevoFinal = plazoAnterior;
      const idPorClave = new Map();
      if (tocaPlazo) {
        plazoNuevoFinal = plazoNuevo;
        const ft = contrato.fecha_inicio ? new Date(new Date(contrato.fecha_inicio).getTime() + (plazoNuevoFinal - 1) * 86400000).toISOString().slice(0, 10) : null;
        await client.query('UPDATE contratos SET plazo_dias=$1, fecha_termino=COALESCE($2,fecha_termino) WHERE id=$3', [plazoNuevoFinal, ft, contratoId]);
        // NOTA: la regeneración de periodos por cambio de plazo queda como follow-on (E3 coordina el
        // re-mapeo de celdas a periodos nuevos); el programa conserva los periodos vigentes.
      }
      if (tocaPrograma) {
        const existing = await client.query('SELECT id, clave FROM contrato_conceptos WHERE contrato_id = $1', [contratoId]);
        for (const r of existing.rows) idPorClave.set(String(r.clave), r.id);
        let maxOrden = (await client.query('SELECT COALESCE(MAX(orden),0) AS m FROM contrato_conceptos WHERE contrato_id = $1', [contratoId])).rows[0].m;
        for (const c of conceptos) {
          if (idPorClave.has(String(c.clave))) {
            await client.query('UPDATE contrato_conceptos SET concepto=$1, unidad=$2, cantidad=$3::numeric(14,3), pu=$4::numeric(16,4) WHERE id=$5',
              [c.concepto ?? '', c.unidad ?? '', c.cantidad, c.pu, idPorClave.get(String(c.clave))]);
          } else {
            maxOrden += 1;
            const ins = await client.query('INSERT INTO contrato_conceptos (contrato_id, orden, concepto, unidad, cantidad, pu, clave) VALUES ($1,$2,$3,$4,$5::numeric(14,3),$6::numeric(16,4),$7) RETURNING id',
              [contratoId, maxOrden, c.concepto ?? '', c.unidad ?? '', c.cantidad, c.pu, c.clave]);
            idPorClave.set(String(c.clave), ins.rows[0].id);
          }
        }
        // Monto CANÓNICO desde el catálogo VIVO (fuente única, al centavo) y sincroniza la cabecera.
        montoNuevo = (await client.query('SELECT COALESCE(SUM(ROUND(cantidad*pu,2)),0)::numeric(18,2) AS m FROM contrato_conceptos WHERE contrato_id=$1', [contratoId])).rows[0].m;
        await client.query('UPDATE contratos SET monto=$1 WHERE id=$2', [montoNuevo, contratoId]);
      }

      // (D) Deltas y clasificación CANÓNICOS (NUMERIC en SQL la división de monto) desde el estado YA
      //     modificado. El convenio SIEMPRE se funda en art. 59 (el 59 Bis es un derecho adicional).
      const deltaMontoPct = (await client.query('SELECT CASE WHEN $2::numeric>0 THEN ROUND((($1::numeric-$2::numeric)/$2::numeric)*100,2) ELSE NULL END AS d', [montoNuevo, montoAnterior])).rows[0].d;
      const deltaPlazoPct = (tocaPlazo && plazoAnterior > 0) ? (((plazoNuevoFinal - plazoAnterior) / plazoAnterior) * 100).toFixed(2) : null;
      const absM = deltaMontoPct != null ? Math.abs(Number(deltaMontoPct)) : null;
      const absP = deltaPlazoPct != null ? Math.abs(Number(deltaPlazoPct)) : null;
      const reqSfp = (absM != null && absM > UMBRAL_SFP) || (absP != null && absP > UMBRAL_SFP);
      const reqAjuste = (absM != null && absM > UMBRAL_AJUSTE) || (absP != null && absP > UMBRAL_AJUSTE);
      const fundamento = 'art59';

      // (E) Registrar el convenio (INMUTABLE) con el monto/delta CANÓNICOS.
      const numeroConv = Number((await client.query('SELECT COALESCE(MAX(numero),0)+1 AS n FROM convenios_modificatorios WHERE contrato_id = $1', [contratoId])).rows[0].n);
      const folioFinal = folio || `CM-${String(numeroConv).padStart(3, '0')}`;

      // O6 — NOTA AUTOMÁTICA de bitácora del convenio (art. 123 fr. III / 125 fr. I RLOPSRM). Si HAY
      // bitácora abierta se asienta EN VIVO (folio atómico) y se LIGA en el INSERT (nota_id) — se crea
      // ANTES del INSERT para NO necesitar un UPDATE (el trigger de inmutabilidad solo permite ligar la
      // nota una vez). Si NO hay bitácora, se DIFIERE (nota_id NULL) y se asentará al abrir la bitácora
      // (abrirBitacora). Emisor = quien registra el convenio (del JWT) [validar profe]. Todo en la MISMA
      // transacción: si el re-cuadre (F) falla, también revierte la nota.
      const bit = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [contratoId]);
      let notaConv = null;
      if (bit.rowCount > 0) {
        const { asunto, contenido } = textoNotaConvenio({
          folio: folioFinal, tipo, deltaMontoPct, deltaPlazoPct, motivo, diferida: false
        });
        notaConv = await insertarNotaAtomica(client, {
          bitacoraId: bit.rows[0].id, tipo: 'res_convenios', asunto, contenido,
          emisorId: req.user.id, tag: 'convenio'
        });
      }

      const conv = await client.query(
        `INSERT INTO convenios_modificatorios
           (contrato_id, numero, folio, tipo, fundamento, motivo, monto_anterior, monto_nuevo,
            plazo_anterior_dias, plazo_nuevo_dias, delta_monto_pct, delta_plazo_pct,
            requiere_revision_sfp, requiere_ajuste_costos, autorizado_por, nota_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [contratoId, numeroConv, folioFinal, tipo, fundamento, motivo,
         montoAnterior, montoNuevo, plazoAnterior, plazoNuevoFinal, deltaMontoPct, deltaPlazoPct, reqSfp, reqAjuste, req.user.id,
         notaConv ? notaConv.id : null]
      );
      const convenioId = conv.rows[0].id;

      // (F) Re-cuadre del programa + nueva versión (solo si toca el programa).
      let nuevaVerId = null;
      if (tocaPrograma) {
        const periodos = await client.query('SELECT id, numero FROM contrato_periodos WHERE contrato_id = $1', [contratoId]);
        const idPorPeriodo = new Map(periodos.rows.map((r) => [Number(r.numero), r.id]));
        const celdasResueltas = [];
        for (const cel of celdas) {
          const ccId = idPorClave.get(String(cel.clave));
          const pId = idPorPeriodo.get(Number(cel.periodoNumero));
          if (!ccId) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Celda de clave inexistente "${cel.clave}"` }); }
          if (!pId) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Celda de periodo inexistente #${cel.periodoNumero}` }); }
          celdasResueltas.push({ contrato_concepto_id: ccId, contrato_periodo_id: pId, cantidad: cel.cantidad });
        }
        await guardarMatriz(client, contratoId, celdasResueltas, { convenioId });  // re-cuadre, exento del freeze
        await client.query('UPDATE programa_version SET vigente=false, supersedido_en=NOW() WHERE contrato_id=$1 AND vigente', [contratoId]);
        nuevaVerId = await snapshotVersion(client, contratoId, numeroVer + 1, convenioId, true);
      }

      await client.query('COMMIT');
      // nota_diferida: el convenio quedó registrado pero aún no hay bitácora → su nota se asienta al abrir.
      const notaDiferida = bit.rowCount === 0;
      return res.status(201).json({
        ok: true, contrato_id: contratoId, convenio_id: convenioId, numero: numeroConv, tipo, fundamento, folio: folioFinal,
        monto_anterior: montoAnterior, monto_nuevo: montoNuevo, plazo_anterior_dias: plazoAnterior, plazo_nuevo_dias: plazoNuevoFinal,
        delta_monto_pct: deltaMontoPct != null ? Number(deltaMontoPct) : null, delta_plazo_pct: deltaPlazoPct != null ? Number(deltaPlazoPct) : null,
        requiere_revision_sfp: reqSfp, requiere_ajuste_costos: reqAjuste, programa_version_id: nuevaVerId,
        nota: notaConv ? { id: notaConv.id, numero: notaConv.numero, tipo: notaConv.tipo, tag: notaConv.tag } : null,
        nota_diferida: notaDiferida,
        aviso: notaDiferida ? 'El convenio quedó registrado; su nota de bitácora se asentará automáticamente al abrir la bitácora.' : null
      });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      if (e && e.code === 'PROGRAMA_DESCUADRE') return res.status(400).json({ error: e.message, detalles: e.detalles });
      if (e && (e.code === 'PROGRAMA_AJENO' || e.code === 'PROGRAMA_CONGELADO')) return res.status(409).json({ error: e.message });
      if (e && e.code === '22003') return res.status(400).json({ error: 'El monto del convenio desborda el rango permitido' });
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('[crearConvenio]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { listarConvenios, detalleVersion, crearConvenio };
