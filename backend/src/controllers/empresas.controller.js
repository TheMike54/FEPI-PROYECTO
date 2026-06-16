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

// FASE 3 (revisión profe 15-jun) — normalización FUERTE para deduplicar variantes que la débil NO
// captura: funde ACENTOS, quita PUNTUACIÓN y recorta SUFIJOS de razón social ("SA de CV",
// "S.A. de C.V.", "S.A.B.", "S de RL", "SC", "SAS", ...). Así "Talare", "Talaré",
// "TALARE S.A. de C.V." y "Talare, S.A." colapsan a la MISMA forma → al registrar se TOMA la
// empresa existente en vez de crear un duplicado ("si ya existe, toma los datos que ya están" —
// el meollo que pidió el profe). Se usa como SEGUNDO nivel de match en resolverOCrearEmpresa; el
// índice único débil de la BD queda como respaldo. El front (SolicitudRegistro) usa un espejo de
// esta función. [validar profe]: las reglas exactas de normalización (qué sufijos, qué se funde).
const SUFIJOS_RAZON_SOCIAL = [
  's a p i de c v', 'sapi de cv', 's a b de c v', 'sab de cv', 's de r l de c v', 's de rl de cv',
  'sa de cv', 's a de c v', 's a s', 'sas', 's de r l', 's de rl', 's a b', 'sab', 's c', 'sc',
  's a', 'sa', 's en c', 's en nc'
].sort((a, b) => b.length - a.length); // más largos primero
function normalizarNombreEmpresaFuerte(nombre) {
  let s = String(nombre || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita acentos/diacríticos
    .toLowerCase()
    .replace(/[.,;:()/"'`’]/g, ' ')               // puntuación → espacio (incl. apóstrofo tipográfico)
    .replace(/&/g, ' y ')
    .replace(/\s+/g, ' ')
    .trim();
  // Recorta sufijos de razón social del final, de forma iterativa (cubre compuestos).
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const suf of SUFIJOS_RAZON_SOCIAL) {
      if (s === suf) { s = ''; cambio = true; break; }
      if (s.endsWith(' ' + suf)) { s = s.slice(0, -(suf.length + 1)).trim(); cambio = true; break; }
    }
  }
  return s;
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
  // FASE 3 (revisión profe 15-jun) — NIVEL 2: match FUERTE (acentos/puntuación/sufijos de razón
  // social). Evita crear "Talaré S.A. de C.V." cuando ya existe "Talare": si la forma fuerte
  // coincide con alguna empresa, se TOMA la existente ("si ya existe, toma los datos que ya están").
  // O(n) sobre el catálogo (pequeño); para escala, un índice funcional fuerte sería DDL de Maiki.
  // ORDER BY id ASC: ante duplicados fuerte-equivalentes pre-existentes (que el indice debil no
  // fundio), apunta SIEMPRE al menor id = la misma canonica que usa consolidar_empresas.js. NOTA:
  // el nivel 2 es best-effort (no hay indice unico sobre la forma fuerte, solo sobre la debil); una
  // carrera de dos variantes fuerte-equivalentes pero debil-distintas podria crear un duplicado que
  // luego funde consolidar_empresas. Para enforcement duro a nivel BD haria falta DDL de Maiki.
  const fuerte = normalizarNombreEmpresaFuerte(display);
  if (fuerte) {
    const todas = await q('SELECT id, nombre FROM empresas ORDER BY id ASC');
    const m = todas.rows.find((e) => normalizarNombreEmpresaFuerte(e.nombre) === fuerte);
    if (m) return m.id;
  }
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

module.exports = { listarEmpresas, resolverOCrearEmpresa, normalizarNombreEmpresa, normalizarNombreEmpresaFuerte };
