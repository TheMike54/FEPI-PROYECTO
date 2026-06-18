// HU-24 (FASE 4, revisión profe 16-jun) — FINIQUITO Y CIERRE DEL CONTRATO. Archivo NUEVO.
// Fundamento (verificado en los PDF): LOPSRM art. 64 — "...elaborar el finiquito... en el que se hará
// constar los créditos a favor y en contra que resulten para cada uno... y el saldo resultante...
// Determinado el saldo total, la dependencia pondrá a disposición el pago... o solicitará el reintegro...
// levantando el acta administrativa que dé por extinguidos los derechos y obligaciones". RLOPSRM
// Sección IX arts. 168-172 (168 finiquito; 170 contenido mínimo del documento; 171 saldos a favor de
// cada parte —art. 54/55—; 172 acta de extinción).
//
// El finiquito el profe lo definió como "una nota de bitácora y el cálculo de lo que te debo / lo que
// me debes". Por eso: (1) DERIVA el saldo server-side de las estimaciones autorizadas/pagadas + pagos +
// anticipo no amortizado (fuente única; NO recalcula la carátula, la reusa); (2) asienta una NOTA de
// bitácora de finiquito; (3) marca el contrato 'cerrado'. Append-only, 1 por contrato.
//
// FÓRMULA (base verificada; conceptos no confirmados por el profe = PARAMETRIZABLES en `ajustes_finales`):
//   saldo = Σ neto(estimaciones autorizada|pagada) − Σ pagos − anticipo_no_amortizado − ajustes_finales
//   anticipo_no_amortizado = max(0, anticipo_contrato − Σ amortización aplicada)   (art. 143)
//   saldo > 0 → a favor del CONTRATISTA (se le paga, art. 171 párr. 1)
//   saldo < 0 → a favor de la DEPENDENCIA (reintegra, art. 171 párr. 2)
// `ajustes_finales` (default 0) cubre deductivas finales / sobrecosto / 5-al-millar pendiente, que el
// profe AÚN NO confirmó: criterio del equipo (default conservador) — parametrizables, default 0, NO hardcodeados.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { insertarNotaAtomica } = require('./bitacora.controller');

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const mxn = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0);

// Desglose del finiquito (server-side, fuente única). `ajustes` = ajustes_finales (criterio del equipo, default 0).
async function calcularFiniquito(client, contrato, ajustes = 0) {
  const cid = contrato.id;
  // (A) Σ neto de estimaciones AUTORIZADAS/PAGADAS (art. 54). El neto ya descuenta amortización,
  //     5-al-millar, deductivas y penas por estimación (no se recalcula). También Σ amortización aplicada.
  const apr = (await client.query(
    `SELECT COALESCE(SUM(neto),0)::numeric(16,2)         AS neto,
            COALESCE(SUM(amortizacion),0)::numeric(16,2) AS amort
       FROM estimaciones WHERE contrato_id = $1 AND estado IN ('autorizada','pagada')`, [cid])).rows[0];
  const importe_neto_aprobado = r2(apr.neto);
  const amortizacion_aplicada = r2(apr.amort);
  // (B) Total efectivamente pagado.
  const pag = (await client.query(
    `SELECT COALESCE(SUM(importe),0)::numeric(16,2) AS pagado FROM pagos WHERE contrato_id = $1`, [cid])).rows[0];
  const total_pagado = r2(pag.pagado);
  // (C) Anticipo del contrato y la parte NO amortizada (art. 143): el contratista la reintegra al cierre.
  const anticipo = r2(Number(contrato.monto) * (Number(contrato.anticipo_pct) || 0) / 100);
  const anticipo_no_amortizado = Math.max(0, r2(anticipo - amortizacion_aplicada));
  // (D) Importe real ejecutado (Σ ejecutado×pu) — art. 170 fr. IV (informativo, no entra al saldo base).
  const eje = (await client.query(
    `SELECT COALESCE(SUM(ca.cantidad * cc.pu),0)::numeric(16,2) AS ejec
       FROM concepto_avance ca JOIN contrato_conceptos cc ON cc.id = ca.contrato_concepto_id
      WHERE cc.contrato_id = $1`, [cid])).rows[0];
  const importe_real_ejecutado = r2(eje.ejec);
  // Saldo y a favor de quién.
  const ajustes_finales = r2(ajustes || 0);
  const saldo = r2(importe_neto_aprobado - total_pagado - anticipo_no_amortizado - ajustes_finales);
  const a_favor_de = saldo > 0.005 ? 'contratista' : (saldo < -0.005 ? 'dependencia' : 'ninguno');
  return {
    anticipo, importe_neto_aprobado, amortizacion_aplicada, total_pagado,
    anticipo_no_amortizado, importe_real_ejecutado, ajustes_finales, saldo, a_favor_de,
  };
}

// Lee el contrato con los campos de equipo (acceso) + estado/monto/anticipo.
async function getContrato(client, id) {
  const c = await client.query(
    `SELECT id, folio, objeto, monto, anticipo_pct, estado, cerrado_en,
            created_by, residente_id, superintendente_id, supervision_id, dependencia_id
       FROM contratos WHERE id = $1`, [id]);
  return c.rowCount ? c.rows[0] : null;
}

// GET /api/finiquito/contrato/:id — PREP (read-only): desglose del saldo + estado del cierre.
// ?ajustes= simula ajustes_finales en el preview (no persiste). Acotado por participación.
async function prepararFiniquito(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const contrato = await getContrato(pool, id);
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, contrato)) return res.status(403).json({ error: 'No tienes acceso a este contrato' });

    const ajustes = Number(req.query.ajustes);
    const desglose = await calcularFiniquito(pool, contrato, Number.isFinite(ajustes) ? ajustes : 0);
    // ¿Ya existe finiquito? (cerrado)
    const fin = await pool.query('SELECT * FROM finiquitos WHERE contrato_id = $1', [id]);
    const tieneBitacora = (await pool.query('SELECT 1 FROM bitacora_aperturas WHERE contrato_id = $1', [id])).rowCount > 0;
    return res.status(200).json({
      contrato: { id: contrato.id, folio: contrato.folio, objeto: contrato.objeto, estado: contrato.estado, cerrado_en: contrato.cerrado_en },
      desglose,
      tiene_bitacora: tieneBitacora,
      finiquito: fin.rowCount ? fin.rows[0] : null,
      nota_legal: 'saldo = Σ neto(autorizada|pagada) − pagos − anticipo no amortizado − ajustes_finales (art. 64 LOPSRM / 170 RLOPSRM). ajustes_finales: criterio del equipo (default conservador), parametrizable con default 0.',
    });
  } catch (err) { console.error('[prepararFiniquito]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/finiquito/contrato/:id — ELABORA el finiquito, asienta su nota de bitácora y CIERRA el
// contrato (transaccional). 1 por contrato (append-only). Body: { ajustes_finales?, observaciones? }.
async function cerrarFiniquito(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'contrato inválido' });
  const ajustes = Number(req.body?.ajustes_finales);
  const observaciones = req.body?.observaciones != null ? String(req.body.observaciones).trim() : null;
  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Lock del contrato (serializa el cierre).
      const cres = await client.query('SELECT * FROM contratos WHERE id = $1 FOR UPDATE', [id]);
      if (cres.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Contrato no encontrado' }); }
      const contrato = cres.rows[0];
      // Autoridad (= convenios, art. 99/53): la dependencia o el residente/creador elabora el finiquito.
      const puede = req.user.rol === 'dependencia' || contrato.residente_id === req.user.id || contrato.created_by === req.user.id;
      if (!puede) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo la dependencia o el residente asignado puede elaborar el finiquito' }); }
      // Una sola vez: si ya está cerrado o ya hay finiquito, no se rehace (inmutable).
      if (contrato.estado === 'cerrado') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'El contrato ya está cerrado (finiquito elaborado)' }); }
      const yaFin = await client.query('SELECT 1 FROM finiquitos WHERE contrato_id = $1', [id]);
      if (yaFin.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Este contrato ya tiene finiquito' }); }
      // El finiquito ES una nota de bitácora (profe): exige bitácora abierta.
      const bit = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [id]);
      if (bit.rowCount === 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Abre la bitácora del contrato antes de elaborar el finiquito (el finiquito se asienta como nota de bitácora)' }); }

      const d = await calcularFiniquito(client, contrato, Number.isFinite(ajustes) ? ajustes : 0);

      // Nota de bitácora del finiquito (emisor = residente, art. 53; tipo 'finiquito'). Redacción art. 170.
      const aFavorTxt = d.a_favor_de === 'contratista'
        ? `saldo a FAVOR DEL CONTRATISTA por ${mxn(Math.abs(d.saldo))} (se pone a su disposición el pago, art. 171)`
        : d.a_favor_de === 'dependencia'
          ? `saldo a FAVOR DE LA DEPENDENCIA por ${mxn(Math.abs(d.saldo))} (el contratista reintegra, art. 171)`
          : 'saldo en CERO (no hay créditos pendientes entre las partes)';
      const contenido =
        `Se elabora el finiquito del contrato ${contrato.folio} (art. 64 LOPSRM / arts. 168-172 RLOPSRM). ` +
        `Importe real ejecutado: ${mxn(d.importe_real_ejecutado)}. Importe neto estimado y autorizado: ` +
        `${mxn(d.importe_neto_aprobado)}. Total pagado: ${mxn(d.total_pagado)}. Anticipo no amortizado: ` +
        `${mxn(d.anticipo_no_amortizado)}.` + (d.ajustes_finales ? ` Ajustes finales: ${mxn(d.ajustes_finales)}.` : '') +
        ` Saldo resultante: ${mxn(d.saldo)} — ${aFavorTxt}.` + (observaciones ? ` Observaciones: ${observaciones}.` : '') +
        ` Con la firma del finiquito se da por terminado el contrato y se extinguen los derechos y ` +
        `obligaciones de las partes (art. 172 RLOPSRM).`;
      const nota = await insertarNotaAtomica(client, {
        bitacoraId: bit.rows[0].id, tipo: 'finiquito',
        asunto: `Finiquito y cierre del contrato ${contrato.folio}`,
        contenido, emisorId: contrato.residente_id || req.user.id, tag: 'finiquito',
      });

      const ins = await client.query(
        `INSERT INTO finiquitos
           (contrato_id, importe_neto_aprobado, total_pagado, anticipo_no_amortizado, ajustes_finales,
            saldo, a_favor_de, importe_real_ejecutado, observaciones, nota_id, elaborado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [id, d.importe_neto_aprobado, d.total_pagado, d.anticipo_no_amortizado, d.ajustes_finales,
         d.saldo, d.a_favor_de, d.importe_real_ejecutado, observaciones, nota.id, req.user.id]);

      // Cierra el contrato.
      await client.query("UPDATE contratos SET estado = 'cerrado', cerrado_en = NOW() WHERE id = $1", [id]);

      await client.query('COMMIT');
      return res.status(201).json({
        ok: true, finiquito: ins.rows[0], desglose: d,
        nota: { id: nota.id, numero: nota.numero, tipo: nota.tipo },
        contrato: { id, folio: contrato.folio, estado: 'cerrado' },
      });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('[cerrarFiniquito]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { prepararFiniquito, cerrarFiniquito, calcularFiniquito };
