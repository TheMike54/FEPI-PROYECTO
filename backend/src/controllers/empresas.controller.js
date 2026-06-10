// =====================================================================
// O3 (10-jun-2026) — CATÁLOGO DE EMPRESAS (P1 de la revisión del profe). Controller NUEVO
// (no zona congelada). Expone el catálogo para el autocomplete del registro y el helper
// resolver-o-crear que usa el registro (auth.controller) para vincular la persona a su empresa.
// empresa_id viaja en los SELECT, NUNCA en el JWT.
// =====================================================================
const { query } = require('../db/pool');

// Normaliza el nombre para comparar/deduplicar: trim, colapsa espacios internos, minúsculas.
// DEBE coincidir EXACTAMENTE con la expresión del índice único funcional uq_empresas_nombre_norm
// del schema (lower(btrim(regexp_replace(nombre,'\s+',' ','g')))). Así "Patito", "PATITO " y
// "patito  sa" resuelven a la MISMA empresa (mata los duplicados que mencionó el profe).
function normalizarNombreEmpresa(nombre) {
  return String(nombre || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Resuelve la empresa por nombre (case-insensitive); si no existe, la DA DE ALTA y devuelve su id.
// Recibe `q` (la función query del pool, o un client en una transacción). Devuelve el id (int) o
// null si el nombre viene vacío. Idempotente: el primero la registra, el siguiente la reusa.
async function resolverOCrearEmpresa(q, nombre) {
  const display = String(nombre || '').trim().replace(/\s+/g, ' ');
  if (!display) return null;
  const norm = normalizarNombreEmpresa(display);
  // ¿Ya existe (forma normalizada)?
  const hit = await q(
    "SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\\s+',' ','g'))) = $1 LIMIT 1",
    [norm]
  );
  if (hit.rows[0]) return hit.rows[0].id;
  // Alta automática. Si dos registros corren a la vez, el índice único normalizado protege:
  // el segundo INSERT lanza 23505 → reintenta el SELECT (la empresa ya existe).
  try {
    const ins = await q('INSERT INTO empresas (nombre) VALUES ($1) RETURNING id', [display]);
    return ins.rows[0].id;
  } catch (err) {
    if (err.code === '23505') {
      const again = await q(
        "SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\\s+',' ','g'))) = $1 LIMIT 1",
        [norm]
      );
      if (again.rows[0]) return again.rows[0].id;
    }
    throw err;
  }
}

// GET /api/auth/empresas — catálogo PÚBLICO (el registro es público; el autocomplete lo necesita
// sin token). Solo id + nombre (datos no sensibles); nombres de razón social, no PII.
async function listarEmpresas(req, res) {
  try {
    const r = await query('SELECT id, nombre FROM empresas ORDER BY nombre ASC');
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[listarEmpresas]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { listarEmpresas, resolverOCrearEmpresa, normalizarNombreEmpresa };
