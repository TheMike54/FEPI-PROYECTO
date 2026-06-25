// =====================================================================
// A2 — Programa de obra (matriz concepto × periodo): lectura y edición.
// Controller NUEVO (NO zona congelada). El alta (contratos.controller.js, congelado)
// crea la matriz; aquí se LEE (cualquier parte del contrato) y se REEMPLAZA
// (solo el residente asignado), reutilizando lib/programa.js (guardarMatriz con C1–C7).
// =====================================================================
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { guardarMatriz, reconciliacion } = require('../lib/programa');

// GET /api/contratos/:id/programa — devuelve ciclo, periodos (columnas), conceptos
// (filas), celdas (matriz) y la reconciliación por concepto (contratado/planeado/restante).
async function leerPrograma(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Contrato no encontrado' });

    const cres = await pool.query(
      `SELECT id, ciclo_estimacion, created_by, residente_id, superintendente_id, supervision_id
         FROM contratos WHERE id = $1`,
      [id]
    );
    if (cres.rowCount === 0) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, cres.rows[0])) return res.status(403).json({ error: 'No tienes acceso a este contrato' });

    const [periodos, conceptos, celdas, recon] = await Promise.all([
      pool.query('SELECT id, numero, inicio, fin FROM contrato_periodos WHERE contrato_id = $1 ORDER BY numero', [id]),
      pool.query('SELECT id, clave, concepto, unidad, cantidad, es_adicional FROM contrato_conceptos WHERE contrato_id = $1 ORDER BY orden', [id]),
      pool.query(
        `SELECT po.contrato_concepto_id, po.contrato_periodo_id, po.cantidad
           FROM programa_obra po
           JOIN contrato_conceptos cc ON cc.id = po.contrato_concepto_id
          WHERE cc.contrato_id = $1`,
        [id]
      ),
      reconciliacion(pool, id)
    ]);

    return res.status(200).json({
      contrato_id: id,
      ciclo: cres.rows[0].ciclo_estimacion,
      periodos: periodos.rows,
      conceptos: conceptos.rows,
      celdas: celdas.rows,
      reconciliacion: recon
    });
  } catch (err) {
    console.error('[leerPrograma]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// PUT /api/contratos/:id/programa — REEMPLAZA la matriz. Solo el residente asignado.
// Body: { celdas: [{ clave | contrato_concepto_id, periodoNumero | contrato_periodo_id, cantidad }],
//         convenioId? }. Con convenioId => enmienda por convenio (art. 59 LOPSRM), exenta del freeze.
async function reemplazarPrograma(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Contrato no encontrado' });

  const body = req.body || {};
  const celdasRaw = Array.isArray(body.celdas) ? body.celdas : [];
  if (celdasRaw.length > 20000) return res.status(400).json({ error: 'El programa de obra tiene demasiadas celdas' });
  // convenioId: por ahora la HU-03 (convenios) no existe; se acepta el hook pero NO se
  // confía ciegamente: debe ser un entero positivo para tratarse como enmienda (art. 59 LOPSRM).
  const convenioId = Number.isInteger(Number(body.convenioId)) && Number(body.convenioId) > 0 ? Number(body.convenioId) : null;

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cres = await client.query('SELECT id, residente_id FROM contratos WHERE id = $1', [id]);
      if (cres.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Contrato no encontrado' }); }
      // Solo el residente ASIGNADO edita el programa (espejo de subirDocumento; identidad del JWT).
      if (cres.rows[0].residente_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Solo el residente asignado al contrato puede editar el programa de obra' });
      }

      // Resuelve clave→id y numero→id contra los periodos/conceptos YA existentes (creados
      // en el alta). Si el contrato no tiene periodos, no hay matriz que editar.
      const [conceptos, periodos] = await Promise.all([
        client.query('SELECT id, clave FROM contrato_conceptos WHERE contrato_id = $1', [id]),
        client.query('SELECT id, numero FROM contrato_periodos WHERE contrato_id = $1', [id])
      ]);
      if (periodos.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'El contrato no tiene periodos configurados; define el ciclo de estimación al dar de alta el contrato' });
      }
      const claveToId = new Map(conceptos.rows.map((r) => [String(r.clave).trim(), r.id]));
      const idsConcepto = new Set(conceptos.rows.map((r) => r.id));
      const numeroToId = new Map(periodos.rows.map((r) => [r.numero, r.id]));
      const idsPeriodo = new Set(periodos.rows.map((r) => r.id));

      const celdas = [];
      for (const [i, cell] of celdasRaw.entries()) {
        const cant = Number(cell.cantidad);
        if (!Number.isFinite(cant) || cant < 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Celda #${i + 1}: la cantidad no puede ser negativa` }); }
        if (cant === 0) continue;
        // Acepta id directo o clave/numero.
        let ccId = Number.isInteger(Number(cell.contrato_concepto_id)) ? Number(cell.contrato_concepto_id) : claveToId.get(String(cell.clave || '').trim());
        let pId = Number.isInteger(Number(cell.contrato_periodo_id)) ? Number(cell.contrato_periodo_id) : numeroToId.get(Number(cell.periodoNumero));
        if (!ccId || !idsConcepto.has(ccId)) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Celda #${i + 1}: concepto/clave inexistente en el contrato` }); }
        if (!pId || !idsPeriodo.has(pId)) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Celda #${i + 1}: periodo inexistente en el contrato` }); }
        celdas.push({ contrato_concepto_id: ccId, contrato_periodo_id: pId, cantidad: cell.cantidad });
      }

      // guardarMatriz: lock (C2), freeze manual/enmienda (C1/C3), DELETE+INSERT (C5),
      // regla del 100% en SQL (C7): Σ planeado = contratado por concepto (RLOPSRM 45-A-X +
      // LOPSRM 52; exceso art. 118). Reemplazar la matriz también debe cuadrar al 100%.
      const r = await guardarMatriz(client, id, celdas, { convenioId });
      await client.query('COMMIT');
      return res.status(200).json({ ok: true, contrato_id: id, ...r });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === 'PROGRAMA_CONGELADO') return res.status(409).json({ error: err.message });
    if (err.code === 'PROGRAMA_DESCUADRE' || err.code === 'PROGRAMA_EXCEDE' || err.code === 'PROGRAMA_AJENO') return res.status(400).json({ error: err.message, detalles: err.detalles });
    console.error('[reemplazarPrograma]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// =====================================================================
// O2 (10-jun) — PLAN DE AMORTIZACIÓN del anticipo (Fase A, solo lectura).
// GET /api/contratos/:id/plan-amortizacion — filas {periodo_numero, monto} capturadas en el
// alta (o derivadas proporcionales por el backend). Acotado por participación, igual que el
// programa. La carátula (G2) NO usa este plan: [Fase B pendiente de validar con el profe]
// (art. 143 fr. I RLOPSRM dice "proporcional al porcentaje de anticipo otorgado"; el profe decide si la
// carátula obedece al plan capturado). [El plan de aplicación capturado en el alta es art. 138 párr. 3.]
// =====================================================================
async function leerPlanAmortizacion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Contrato no encontrado' });

    const cres = await pool.query(
      `SELECT id, anticipo_pct, monto, created_by, residente_id, superintendente_id, supervision_id
         FROM contratos WHERE id = $1`,
      [id]
    );
    if (cres.rowCount === 0) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, cres.rows[0])) return res.status(403).json({ error: 'No tienes acceso a este contrato' });

    const filas = await pool.query(
      `SELECT pa.periodo_numero, pa.monto, cp.inicio, cp.fin
         FROM plan_amortizacion pa
         LEFT JOIN contrato_periodos cp ON cp.contrato_id = pa.contrato_id AND cp.numero = pa.periodo_numero
        WHERE pa.contrato_id = $1
        ORDER BY pa.periodo_numero`,
      [id]
    );

    return res.status(200).json({
      contrato_id: id,
      anticipo_pct: cres.rows[0].anticipo_pct,
      monto_contrato: cres.rows[0].monto,
      plan: filas.rows
    });
  } catch (err) {
    console.error('[leerPlanAmortizacion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { leerPrograma, reemplazarPrograma, leerPlanAmortizacion };
