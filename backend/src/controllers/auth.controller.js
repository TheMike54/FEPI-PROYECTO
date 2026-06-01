const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');

const ROLES_VALIDOS = ['residente', 'contratista', 'supervision', 'dependencia', 'finanzas'];

const MSG_PENDIENTE = 'Tu cuenta está pendiente de aprobación por la dependencia';
const MSG_RECHAZADA = 'Tu solicitud de acceso fue rechazada. Contacta a la dependencia';

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son requeridos' });
  }

  const result = await query(
    'SELECT id, nombre, email, password_hash, rol, estado FROM usuarios WHERE email = $1 LIMIT 1',
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
    { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
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
    const { nombre, email, password, rolSolicitado } = req.body || {};

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son requeridos' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    // El usuario solo SOLICITA un rol (referencia). El rol efectivo (columna rol)
    // queda NULL hasta que la dependencia lo asigna al aprobar.
    const rolSol = ROLES_VALIDOS.includes(rolSolicitado) ? rolSolicitado : null;
    const emailNorm = String(email).trim().toLowerCase();

    const hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, rol_solicitado, estado)
       VALUES ($1, $2, $3, NULL, $4, 'pendiente')
       RETURNING id, nombre, email, rol, rol_solicitado, estado, created_at`,
      [String(nombre).trim(), emailNorm, hash, rolSol]
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
