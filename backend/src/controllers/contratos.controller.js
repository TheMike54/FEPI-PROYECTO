// Importa SOLO { pool }: dentro de la transaccion se usa client.query (nunca la
// query() global, que tomaria OTRA conexion del pool y se auto-commitearia,
// rompiendo la atomicidad).
const { pool } = require('../db/pool');

const REQUIRED_FIELDS = [
  'folio', 'tipo', 'objeto', 'contratista', 'dependencia',
  'monto', 'plazoDias', 'fechaInicio', 'fechaTermino'
];

// '' / undefined -> NULL para cualquier campo opcional (evita castear '' a DATE
// o NUMERIC, que aborta la transaccion con 22P02/22007).
const emptyToNull = (v) => (v === '' || v === undefined ? null : v);
const numOrNull = (v) => {
  const n = emptyToNull(v);
  if (n === null) return null;
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
};

async function crearContrato(req, res) {
  const body = req.body || {};

  // --- 1) Validar TODO antes de pedir un client del pool ---------------------
  const faltantes = REQUIRED_FIELDS.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === ''
  );
  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Faltan campos requeridos', faltantes });
  }

  const monto = Number(body.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    return res.status(400).json({ error: 'monto debe ser un número mayor a 0' });
  }

  const plazoDias = Number(body.plazoDias);
  if (!Number.isInteger(plazoDias) || plazoDias <= 0) {
    return res.status(400).json({ error: 'plazoDias debe ser un entero mayor a 0' });
  }

  // T1: coherencia de fechas del contrato (ambas ya son requeridas arriba).
  if (String(body.fechaTermino) < String(body.fechaInicio)) {
    return res.status(400).json({ error: 'La fecha de término no puede ser anterior a la fecha de inicio' });
  }

  // T3: longitud de los campos de texto (evita 22001 desde la BD).
  const LIMITES_TEXTO = { folio: 50, tipo: 80, contratista: 200, dependencia: 200 };
  for (const [campo, max] of Object.entries(LIMITES_TEXTO)) {
    if (body[campo] != null && String(body[campo]).length > max) {
      return res.status(400).json({ error: `El campo "${campo}" excede el máximo de ${max} caracteres` });
    }
  }

  const anticipoPct = numOrNull(body.anticipoPct);
  if (anticipoPct !== null && (anticipoPct < 0 || anticipoPct > 100)) {
    return res.status(400).json({ error: 'anticipoPct debe estar entre 0 y 100' });
  }

  // Sub-bloques opcionales (no bloquean el guardado si vienen vacios).
  const conceptos = Array.isArray(body.conceptos) ? body.conceptos : [];
  const actividades = Array.isArray(body.actividades) ? body.actividades : [];
  const garantias = Array.isArray(body.garantias) ? body.garantias : [];
  const juridicos =
    body.juridicos && typeof body.juridicos === 'object' && !Array.isArray(body.juridicos)
      ? body.juridicos
      : null;

  // Tope generoso por bloque: evita un alta gigante que alargue la transaccion.
  const MAX_FILAS = 500;
  if (conceptos.length > MAX_FILAS || actividades.length > MAX_FILAS || garantias.length > MAX_FILAS) {
    return res.status(400).json({ error: `Cada bloque admite un máximo de ${MAX_FILAS} filas` });
  }

  // Validacion por fila: si la fila existe, se exige lo minimo de esa fila.
  for (const [i, c] of conceptos.entries()) {
    if (!c.concepto || !c.unidad) {
      return res.status(400).json({ error: `Concepto #${i + 1}: concepto y unidad son obligatorios` });
    }
    if (String(c.unidad).length > 20) {
      return res.status(400).json({ error: `Concepto #${i + 1}: la unidad excede el máximo de 20 caracteres` });
    }
    const cant = numOrNull(c.cantidad);
    const pu = numOrNull(c.pu);
    if (cant === null || cant < 0) return res.status(400).json({ error: `Concepto #${i + 1}: cantidad inválida` });
    if (pu === null || pu < 0) return res.status(400).json({ error: `Concepto #${i + 1}: precio unitario inválido` });
  }
  for (const [i, a] of actividades.entries()) {
    if (!a.actividad || !a.inicio || !a.termino) {
      return res.status(400).json({ error: `Actividad #${i + 1}: actividad, inicio y término son obligatorios` });
    }
    const peso = numOrNull(a.peso);
    if (peso === null || peso < 0 || peso > 100) {
      return res.status(400).json({ error: `Actividad #${i + 1}: peso debe estar entre 0 y 100` });
    }
    if (a.termino < a.inicio) {
      return res.status(400).json({ error: `Actividad #${i + 1}: el término no puede ser anterior al inicio` });
    }
  }
  // El programa de obra no puede EXCEDER 100% (suma parcial <100% si permitida).
  const sumaPeso = Math.round(actividades.reduce((s, a) => s + (numOrNull(a.peso) || 0), 0) * 100) / 100;
  if (sumaPeso > 100) {
    return res.status(400).json({ error: `La suma de %peso del programa no puede exceder 100% (actual: ${sumaPeso}%)` });
  }
  for (const [i, g] of garantias.entries()) {
    if (!g.tipo) return res.status(400).json({ error: `Garantía #${i + 1}: el tipo es obligatorio` });
  }

  const { folio, tipo, objeto, contratista, dependencia, fechaInicio, fechaTermino } = body;

  // --- 2) Transaccion: cabecera + bloques = una sola entidad (todo o nada) ----
  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cab = await client.query(
        `INSERT INTO contratos
           (folio, tipo, objeto, contratista, dependencia, monto, plazo_dias,
            fecha_inicio, fecha_termino, created_by, datos_juridicos, anticipo_pct)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          folio, tipo, objeto, contratista, dependencia, monto, plazoDias,
          fechaInicio, fechaTermino, req.user.id,
          juridicos ? JSON.stringify(juridicos) : null,
          anticipoPct
        ]
      );
      const contratoId = cab.rows[0].id;

      for (const [i, c] of conceptos.entries()) {
        await client.query(
          `INSERT INTO contrato_conceptos (contrato_id, orden, concepto, unidad, cantidad, pu)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [contratoId, i + 1, c.concepto, c.unidad, numOrNull(c.cantidad), numOrNull(c.pu)]
        );
      }
      for (const [i, a] of actividades.entries()) {
        await client.query(
          `INSERT INTO contrato_actividades (contrato_id, orden, actividad, inicio, termino, peso)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [contratoId, i + 1, a.actividad, emptyToNull(a.inicio), emptyToNull(a.termino), numOrNull(a.peso)]
        );
      }
      for (const g of garantias) {
        await client.query(
          `INSERT INTO contrato_garantias (contrato_id, tipo, afianzadora, poliza, monto, vigencia)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [contratoId, g.tipo, emptyToNull(g.afianzadora), emptyToNull(g.poliza), numOrNull(g.monto), emptyToNull(g.vigencia)]
        );
      }

      await client.query('COMMIT');
      return res.status(201).json({ id: contratoId, folio });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el ROLLBACK puede fallar si el client murio */ }
      throw e;
    } finally {
      client.release(); // SIEMPRE devolver el client al pool (max: 10)
    }
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint && err.constraint.includes('folio')) {
        return res.status(409).json({ error: 'El folio ya existe' });
      }
      return res.status(400).json({ error: 'Hay un renglón duplicado en un sub-bloque (concepto, actividad o garantía).' });
    }
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Hay valores fuera de rango (revisa cantidades ≥ 0, peso 0–100 o que el término sea ≥ al inicio).' });
    }
    if (err.code === '22007' || err.code === '22P02') {
      return res.status(400).json({ error: 'Hay un valor con formato inválido (fecha o número).' });
    }
    if (err.code === '22001') {
      return res.status(400).json({ error: 'Un campo de texto excede el límite de caracteres permitido.' });
    }
    if (err.code === '22003') {
      return res.status(400).json({ error: 'Un valor numérico está fuera de rango (demasiado grande).' });
    }
    console.error('[crearContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

async function listarContratos(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.*,
              EXISTS (SELECT 1 FROM contrato_documentos d WHERE d.contrato_id = c.id) AS tiene_documento
         FROM contratos c
        ORDER BY c.created_at DESC`
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('[listarContratos]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

async function detalleContrato(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }

    const result = await pool.query('SELECT * FROM contratos WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }

    // Trae los bloques hijos para que el contrato se lea como una sola entidad.
    const [conceptos, actividades, garantias] = await Promise.all([
      pool.query('SELECT * FROM contrato_conceptos WHERE contrato_id = $1 ORDER BY orden', [id]),
      pool.query('SELECT * FROM contrato_actividades WHERE contrato_id = $1 ORDER BY orden', [id]),
      pool.query('SELECT * FROM contrato_garantias WHERE contrato_id = $1 ORDER BY id', [id])
    ]);

    return res.status(200).json({
      ...result.rows[0],
      conceptos: conceptos.rows,
      actividades: actividades.rows,
      garantias: garantias.rows
    });
  } catch (err) {
    console.error('[detalleContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Roles con acceso de LECTURA al PDF segun el modelo de permisos de HU-01
// (frontend/src/data/permisos.js: residente 'E', contratista/supervision/dependencia 'C',
// finanzas sin acceso). La subida queda restringida a residente.
const ROLES_DOC_LECTURA = ['residente', 'contratista', 'supervision', 'dependencia'];

// POST /api/contratos/:id/documento  (multipart, campo "documento") — liga el PDF
// firmado DESPUES de crear el contrato. Se guarda como BYTEA. Reemplaza el anterior.
async function subirDocumento(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Falta el archivo PDF (campo "documento")' });
    }
    const { buffer, originalname, mimetype, size } = req.file;
    // Backstop: revalidar magic bytes %PDF (no confiar solo en el mimetype declarado).
    if (!buffer || buffer.length < 4 || buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
      return res.status(400).json({ error: 'El archivo no es un PDF válido' });
    }

    const existe = await pool.query('SELECT id FROM contratos WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }

    // Un PDF por contrato: reemplaza el anterior (DELETE + INSERT) atomicamente.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM contrato_documentos WHERE contrato_id = $1', [id]);
      const r = await client.query(
        `INSERT INTO contrato_documentos (contrato_id, nombre, mime, tamano, contenido)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nombre, mime, tamano, subido_en`,
        [id, originalname, mimetype, size, buffer]
      );
      await client.query('COMMIT');
      return res.status(201).json(r.rows[0]);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[subirDocumento]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/contratos/:id/documento/meta — metadata del PDF (sin los bytes) o 404.
async function documentoMeta(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    const r = await pool.query(
      `SELECT id, nombre, mime, tamano, subido_en
         FROM contrato_documentos WHERE contrato_id = $1
        ORDER BY subido_en DESC LIMIT 1`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'El contrato no tiene PDF ligado' });
    }
    return res.status(200).json(r.rows[0]);
  } catch (err) {
    console.error('[documentoMeta]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/contratos/:id/documento — devuelve el binario del PDF.
async function descargarDocumento(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    const r = await pool.query(
      `SELECT nombre, mime, tamano, contenido
         FROM contrato_documentos WHERE contrato_id = $1
        ORDER BY subido_en DESC LIMIT 1`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'El contrato no tiene PDF ligado' });
    }
    const doc = r.rows[0];
    res.setHeader('Content-Type', doc.mime || 'application/pdf');
    res.setHeader('Content-Length', doc.tamano);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.nombre)}"`);
    return res.status(200).send(doc.contenido);
  } catch (err) {
    console.error('[descargarDocumento]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearContrato, listarContratos, detalleContrato,
  subirDocumento, documentoMeta, descargarDocumento,
  ROLES_DOC_LECTURA
};
