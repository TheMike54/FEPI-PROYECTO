// =====================================================================
// O3 (10-jun-2026) — CATÁLOGO DE EMPRESAS (P1 de la revisión del profe). Controller NUEVO
// (no zona congelada). Expone el catálogo para el autocomplete del registro y el helper
// resolver-o-crear que usa el registro (auth.controller) para vincular la persona a su empresa.
// empresa_id viaja en los SELECT, NUNCA en el JWT.
// =====================================================================
const { pool, query } = require('../db/pool');

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
// esta función. Las reglas exactas de normalización (qué sufijos, qué se funde) son criterio del
// equipo (default conservador): se unen solo variantes obvias (mayúsculas/acentos/puntuación/sufijos
// de razón social), evitando fusionar empresas realmente distintas.
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
// (PLAN GRANDE BLOQUE 1) `tipo` opcional ('contratista' por defecto): la empresa que se crea en el
// REGISTRO nace en estado 'por_validar' (la valida la dependencia, art. 43 RLOPSRM). Si la empresa
// YA existe, NO se cambia su estado (no se "des-valida" una existente).
async function resolverOCrearEmpresa(q, nombre, tipo) {
  const display = String(nombre || '').trim().replace(/\s+/g, ' ');
  if (!display) return null;
  const tipoFinal = ['dependencia', 'contratista', 'supervision'].includes(tipo) ? tipo : 'contratista';
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
  // Alta automática (nace 'por_validar' para que la dependencia la valide). Si dos registros corren a
  // la vez, el índice único normalizado protege: el segundo INSERT lanza 23505 → reintenta el SELECT.
  try {
    const ins = await q("INSERT INTO empresas (nombre, tipo, estado) VALUES ($1, $2, 'por_validar') RETURNING id", [display, tipoFinal]);
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

// =====================================================================
// (PLAN GRANDE BLOQUE 1) ADMINISTRACIÓN DEL PADRÓN — la DEPENDENCIA valida/administra (art. 43
// RLOPSRM). Endpoints de SOLO la dependencia (el router exige requireRole('dependencia')).
// =====================================================================

// GET /api/empresas/padron — padrón de empresas PRIVADAS (contratista/supervisión) + nº de personas
// y de contratos por empresa. Para la pantalla de administración.
async function listarPadron(req, res) {
  try {
    const r = await query(
      // FIX 22-jun (profe): cuenta los contratos por la EMPRESA DEL CONTRATO (contratista_empresa_id /
      // supervision_empresa_id) — la empresa con la que se firmó — en vez de derivarla del usuario.
      // COALESCE a la derivación por usuario para contratos legados sin la columna (retrocompat).
      `SELECT e.id, e.nombre, e.tipo, e.estado,
              (SELECT COUNT(*) FROM usuarios u WHERE u.empresa_id = e.id) AS personas,
              (SELECT COUNT(DISTINCT c.id) FROM contratos c
                 LEFT JOIN usuarios su ON su.id = c.superintendente_id
                 LEFT JOIN usuarios sv ON sv.id = c.supervision_id
                WHERE COALESCE(c.contratista_empresa_id, su.empresa_id) = e.id
                   OR COALESCE(c.supervision_empresa_id, sv.empresa_id) = e.id) AS contratos
         FROM empresas e
        WHERE e.tipo IN ('contratista','supervision')
        ORDER BY (e.estado = 'por_validar') DESC, e.nombre ASC`);
    return res.status(200).json(r.rows);
  } catch (err) { console.error('[listarPadron]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/empresas/por-validar — empresas auto-registradas pendientes de validación, con detección
// de posible duplicado (forma fuerte) contra una empresa ya VALIDADA.
async function listarPorValidar(req, res) {
  try {
    const pend = await query("SELECT id, nombre, tipo FROM empresas WHERE estado = 'por_validar' ORDER BY id ASC");
    const val = await query("SELECT id, nombre FROM empresas WHERE estado = 'validada'");
    const valForms = val.rows.map((e) => ({ id: e.id, nombre: e.nombre, f: normalizarNombreEmpresaFuerte(e.nombre) }));
    const out = pend.rows.map((e) => {
      const f = normalizarNombreEmpresaFuerte(e.nombre);
      const dup = f ? valForms.find((v) => v.f && v.f === f) : null;
      return { ...e, posible_duplicado: dup ? { id: dup.id, nombre: dup.nombre } : null };
    });
    return res.status(200).json(out);
  } catch (err) { console.error('[listarPorValidar]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/empresas/dependencias — el catálogo de DEPENDENCIAS (entidad pública), aparte del padrón.
async function listarDependencias(req, res) {
  try {
    const r = await query(
      `SELECT e.id, e.nombre, e.estado,
              (SELECT COUNT(DISTINCT c.id) FROM contratos c
                 JOIN usuarios du ON du.id = c.dependencia_id
                WHERE du.empresa_id = e.id) AS contratos
         FROM empresas e WHERE e.tipo = 'dependencia' ORDER BY e.nombre ASC`);
    return res.status(200).json(r.rows);
  } catch (err) { console.error('[listarDependencias]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/empresas/:id/validar — la dependencia valida (inscribe) la empresa al padrón (art. 43).
async function validarEmpresa(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    const r = await query("UPDATE empresas SET estado = 'validada' WHERE id = $1 RETURNING id, nombre, tipo, estado", [id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Empresa no encontrada' });
    return res.status(200).json(r.rows[0]);
  } catch (err) { console.error('[validarEmpresa]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/empresas/:id/fusionar  body { canonica_id } — funde una empresa duplicada en la canónica:
// reapunta personas Y las FK de contratos/roster a la canónica, y elimina la duplicada (transaccional).
// (#3, 25-jun: antes "no tocaba contratos"; el schema del 22-jun añadió contratos.contratista_empresa_id /
//  supervision_empresa_id / contrato_roster.empresa_id con ON DELETE NO ACTION → el DELETE daba 500 si el
//  duplicado tenía contratos. Ahora se reapuntan antes de borrar.)
async function fusionarEmpresa(req, res) {
  const id = Number(req.params.id);
  const canon = Number(req.body?.canonica_id);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(canon) || canon <= 0) return res.status(400).json({ error: 'id y canonica_id son requeridos' });
  if (id === canon) return res.status(400).json({ error: 'No se puede fusionar una empresa consigo misma' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const c = await client.query('SELECT id FROM empresas WHERE id = $1', [canon]);
    if (!c.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'La empresa canónica no existe' }); }
    await client.query('UPDATE usuarios SET empresa_id = $1 WHERE empresa_id = $2', [canon, id]);
    // #3 (25-jun) — reapuntar TAMBIÉN las FK de contratos/roster (NO ACTION) o el DELETE viola la FK (500).
    await client.query('UPDATE contratos SET contratista_empresa_id = $1 WHERE contratista_empresa_id = $2', [canon, id]);
    await client.query('UPDATE contratos SET supervision_empresa_id = $1 WHERE supervision_empresa_id = $2', [canon, id]);
    await client.query('UPDATE contrato_roster SET empresa_id = $1 WHERE empresa_id = $2', [canon, id]);
    const del = await client.query('DELETE FROM empresas WHERE id = $1 RETURNING id', [id]);
    await client.query('COMMIT');
    if (!del.rowCount) return res.status(404).json({ error: 'Empresa a fusionar no encontrada' });
    return res.status(200).json({ ok: true, fusionada: id, canonica: canon });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[fusionarEmpresa]', err);
    return res.status(500).json({ error: 'Error interno' });
  } finally { client.release(); }
}

// GET /api/empresas/:id/personas — cuentas asociadas a la empresa (modelo 1 empresa : N cuentas). SOLO
// LECTURA: lee usuarios.empresa_id, datos ya existentes. El router exige requireRole('dependencia'), así que
// hereda el gate. Para que el padrón muestre, al expandir una empresa, quiénes pertenecen a ella.
async function listarPersonas(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'empresa inválida' });
    const r = await query(
      'SELECT id, nombre, email, rol, estado FROM usuarios WHERE empresa_id = $1 ORDER BY rol ASC, nombre ASC',
      [id]
    );
    return res.status(200).json(r.rows);
  } catch (err) { console.error('[listarPersonas]', err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = {
  listarEmpresas, resolverOCrearEmpresa, normalizarNombreEmpresa, normalizarNombreEmpresaFuerte,
  listarPadron, listarPorValidar, listarDependencias, validarEmpresa, fusionarEmpresa, listarPersonas,
};
