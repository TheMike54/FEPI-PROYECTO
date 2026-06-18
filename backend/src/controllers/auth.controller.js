const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
// O3: resolver-o-crear empresa para vincular la persona en el registro (catálogo del profe).
const { resolverOCrearEmpresa } = require('./empresas.controller');

const ROLES_VALIDOS = ['residente', 'contratista', 'supervision', 'dependencia', 'finanzas'];

// Corrección del profe (revisión 04-jun): el nombre que aparece en la bitácora debe ser COMPLETO
// (nombre + apellido[s]); hoy se podía registrar con un solo token ("Iván"). Regla operativa para
// que la bitácora identifique sin ambigüedad a quienes intervienen (art. 123 RLOPSRM exige asentar
// a las personas que participan). NO es un requisito con artículo propio; el umbral exacto (≥2
// palabras) lo fija la Fundación (criterio del equipo, default conservador; el nombre completo
// aparece en la bitácora, art. 123 fr. III RLOPSRM). El frontend valida lo mismo
// (espejo en SeleccionRol.jsx / SolicitudRegistro.jsx); este es el candado del servidor.
// /\p{L}{2,}/gu cuenta solo palabras de ≥2 letras seguidas: una INICIAL ('J.') no cuenta, así que
// "Iván"→1 (rechaza), "José García"→2 (acepta). Es deliberado (nombre y apellido visibles, no
// iniciales). Soporta acentos/ñ/guion (todas son letras Unicode \p{L}).
const esNombreCompleto = (n) => (String(n || '').trim().match(/\p{L}{2,}/gu) || []).length >= 2;

const MSG_PENDIENTE = 'Tu cuenta está pendiente de aprobación por la dependencia';
const MSG_RECHAZADA = 'Tu solicitud de acceso fue rechazada. Contacta a la dependencia';

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son requeridos' });
  }

  const result = await query(
    // (Acotamiento por empresa) + empresa_id para firmarlo en el JWT (aditivo; no cambia el flujo).
    'SELECT id, nombre, email, password_hash, rol, estado, empresa_id FROM usuarios WHERE email = $1 LIMIT 1',
    [email]
  );
  const usuario = result.rows[0];

  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // La cuenta debe estar activa para entrar. Los usuarios existentes son 'activo'
  // por el DEFAULT de la columna, así que este chequeo no los afecta. Solo frena a
  // las altas nuevas que aún no aprueba la dependencia (pendiente / rechazada).
  if (usuario.estado !== 'activo') {
    const error = usuario.estado === 'rechazado' ? MSG_RECHAZADA : MSG_PENDIENTE;
    return res.status(403).json({ error, estado: usuario.estado });
  }

  const token = jwt.sign(
    // ADITIVO: conserva {id, rol, nombre} idénticos; SOLO añade empresa_id (null si la cuenta no tiene).
    // Token viejo sin empresa_id → req.user.empresa_id = undefined → comportamiento legado (acotamiento
    // dormido), retrocompatible. Alimenta el acotamiento por empresa de lib/acceso.js.
    { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre, empresa_id: usuario.empresa_id ?? null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return res.status(200).json({
    token,
    user: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }
  });
}

// Auto-registro público. Crea la cuenta en estado 'pendiente': NO devuelve token
// y el usuario no puede entrar hasta que la dependencia lo apruebe. El rol enviado
// es solo el "rol solicitado" (informativo); la dependencia fija el definitivo al aprobar.
async function register(req, res) {
  try {
    // O3: `empresa` (nombre de texto) es OPCIONAL y aditivo — el resto del flujo (login/JWT) no
    // cambia. Si viene, se resuelve-o-crea en el catálogo y se vincula (empresa_id en el SELECT,
    // nunca en el token). Si no viene, empresa_id queda NULL (retrocompatible).
    const { nombre, email, password, rolSolicitado, empresa } = req.body || {};

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son requeridos' });
    }
    // Corrección profe (04-jun): exigir nombre + apellido(s) (≥2 palabras). El nombre completo
    // aparece en la bitácora (art. 123 RLOPSRM); no se admite un solo nombre.
    if (!esNombreCompleto(nombre)) {
      return res.status(400).json({ error: 'Captura tu nombre y apellido(s): el nombre completo aparece en la bitácora (art. 123 RLOPSRM).' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    // El usuario solo SOLICITA un rol (referencia). El rol efectivo (columna rol)
    // queda NULL hasta que la dependencia lo asigna al aprobar.
    const rolSol = ROLES_VALIDOS.includes(rolSolicitado) ? rolSolicitado : null;
    const emailNorm = String(email).trim().toLowerCase();

    const hash = await bcrypt.hash(password, 10);

    // O3: empresa de la persona (catálogo). Resolver-o-crear ANTES del INSERT del usuario; una
    // empresa sin usuarios aún es válida, así que no hace falta transacción (si el INSERT del
    // usuario fallara por email duplicado, la empresa queda disponible para el siguiente registro).
    let empresaId = null;
    if (typeof empresa === 'string' && empresa.trim()) {
      empresaId = await resolverOCrearEmpresa(query, empresa);
    }

    // (REGLA 1 — empresa obligatoria) Refuerzo server-side: contratista/supervisión NO pueden
    // registrarse sin empresa (el frontend ya lo valida; esto es defensa en profundidad).
    const ROLES_EMPRESA_OBLIGATORIA = ['contratista', 'supervision'];
    if (ROLES_EMPRESA_OBLIGATORIA.includes(rolSol) && empresaId == null) {
      return res.status(400).json({ error: 'La empresa es obligatoria para contratista y supervisión.' });
    }

    const result = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, rol_solicitado, estado, empresa_id)
       VALUES ($1, $2, $3, NULL, $4, 'pendiente', $5)
       RETURNING id, nombre, email, rol, rol_solicitado, estado, empresa_id, created_at`,
      [String(nombre).trim(), emailNorm, hash, rolSol, empresaId]
    );

    return res.status(201).json({
      mensaje: 'Tu cuenta quedó pendiente de aprobación por la dependencia',
      usuario: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }
    console.error('[register]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { login, register };