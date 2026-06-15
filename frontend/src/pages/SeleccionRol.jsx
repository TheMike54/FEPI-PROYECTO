import { useState, useEffect } from 'react';
import { ROLES } from '../data/permisos.js';
import { useSesion } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';

// Banner inline reutilizable para mensajes de error/éxito de autenticación.
function MensajeAuth({ mensaje }) {
  if (!mensaje) return null;
  const esError = mensaje.tipo === 'error';
  const clases = esError
    ? 'bg-red-50 border-red-300 text-red-800'
    : 'bg-green-50 border-green-300 text-green-800';
  return (
    <div
      data-testid="auth-mensaje"
      data-tipo={mensaje.tipo}
      className={`mb-4 rounded-md border px-4 py-3 text-sm ${clases}`}
    >
      {mensaje.texto}
    </div>
  );
}

function FormLogin({ onIrRegistro, mensaje, setMensaje }) {
  const { login } = useSesion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMensaje(null);
    try {
      // Normaliza el correo a minúsculas+trim ANTES de mandarlo: el registro lo guarda normalizado
      // (auth.controller, server-side), así que sin esto un usuario que tecleó "Maiki@x.com" no entraría
      // con "maiki@x.com". Solo frontend; no cambia el backend de auth.
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      // El backend devuelve un mensaje claro (403 pendiente/rechazada, 401 credenciales).
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo iniciar sesión' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-borde shadow-sm p-8 mb-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 text-center">
        Iniciar sesión
      </h2>
      <MensajeAuth mensaje={mensaje} />
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="sg-label" htmlFor="login-usuario">Correo</label>
          <input
            id="login-usuario"
            type="email"
            className="sg-input"
            placeholder="usuario@dependencia.gob.mx"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            disabled={loading}
          />
        </div>
        <div>
          <label className="sg-label" htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            className="sg-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
        <button type="submit" className="sg-btn-primary w-full" disabled={loading}>
          {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        ¿Eres nuevo?{' '}
        <button
          type="button"
          data-testid="link-registro"
          onClick={onIrRegistro}
          className="font-semibold text-sigecop-accent hover:underline"
        >
          Regístrate
        </button>
      </p>
    </div>
  );
}

// Corrección profe (04-jun): el nombre completo (nombre + apellido[s]) aparece en la bitácora
// (art. 123 RLOPSRM); se exige ≥2 palabras. Espejo de la validación del backend (auth.controller).
const esNombreCompleto = (n) => (String(n || '').trim().match(/\p{L}{2,}/gu) || []).length >= 2;

// O3: normalización de nombre de empresa, ESPEJO del backend (lower + trim + colapsa espacios).
// Sirve para saber si lo tecleado YA está en el catálogo (y decidir si confirmar alta nueva).
const normEmpresa = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

function FormRegistro({ onIrLogin, setMensaje }) {
  // Plan2 Pase3: el nombre se captura en DOS campos OBLIGATORIOS (nombre[s] + apellido[s]) y se
  // CONCATENAN al enviar; la columna `nombre` (fuente única) y todos los lugares que la muestran
  // siguen igual (el backend recibe el mismo campo `nombre`).
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [rolSolicitado, setRolSolicitado] = useState(ROLES[0].id);
  // O3: empresa de la persona (catálogo del profe). `empresas` = catálogo para el autocomplete.
  const [empresa, setEmpresa] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorLocal, setErrorLocal] = useState(null);

  // Carga el catálogo de empresas (público) para el datalist. Falla en silencio (sin catálogo
  // se puede teclear igual: el backend la da de alta).
  useEffect(() => {
    api.listarEmpresas().then((l) => setEmpresas(Array.isArray(l) ? l : [])).catch(() => setEmpresas([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorLocal(null);

    if (!nombres.trim()) {
      setErrorLocal('Captura tu(s) nombre(s).');
      return;
    }
    if (!apellidos.trim()) {
      setErrorLocal('Captura tu(s) apellido(s).');
      return;
    }
    if (!email.trim() || !password) {
      setErrorLocal('Completa todos los campos.');
      return;
    }
    // Concatena nombre(s) + apellido(s) en el campo `nombre` (fuente única; espejo del backend).
    const nombre = `${nombres.trim()} ${apellidos.trim()}`.replace(/\s+/g, ' ').trim();
    if (!esNombreCompleto(nombre)) {
      setErrorLocal('Captura tu nombre y apellido(s): el nombre completo aparece en la bitácora.');
      return;
    }
    if (password.length < 8) {
      setErrorLocal('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== password2) {
      setErrorLocal('Las contraseñas no coinciden.');
      return;
    }
    // O3: si tecleó una empresa que NO está en el catálogo, confirmar el alta automática
    // (principio del profe: "el primero la registra, el siguiente la elige"). Vacío = sin empresa.
    const empresaTrim = empresa.trim().replace(/\s+/g, ' ');
    if (empresaTrim) {
      const existe = empresas.some((e) => normEmpresa(e.nombre) === normEmpresa(empresaTrim));
      if (!existe && !window.confirm(`"${empresaTrim}" no está en el catálogo. ¿Registrarla como nueva empresa?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      // Email normalizado a minúsculas+trim, simétrico con el login (el backend ya normaliza igual).
      await api.register({ nombre, email: email.trim().toLowerCase(), password, rolSolicitado, empresa: empresaTrim });
      // Vuelve al login mostrando el mensaje de cuenta pendiente.
      setMensaje({
        tipo: 'exito',
        texto: 'Tu cuenta quedó pendiente de aprobación por la dependencia. Te avisaremos cuando puedas iniciar sesión.'
      });
      onIrLogin();
    } catch (err) {
      setErrorLocal(err.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-borde shadow-sm p-8 mb-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-1 text-center">
        Crear cuenta
      </h2>
      <p className="text-center text-xs text-slate-500 mb-4">
        Tu acceso queda pendiente hasta que la dependencia lo apruebe.
      </p>
      {errorLocal && (
        <div data-testid="registro-error" className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorLocal}
        </div>
      )}
      <form className="space-y-4" data-testid="form-registro" onSubmit={handleSubmit}>
        <div>
          <label className="sg-label" htmlFor="reg-nombres">Nombre(s)</label>
          <input
            id="reg-nombres"
            data-testid="reg-nombres"
            type="text"
            className="sg-input"
            placeholder="Ej. María"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label className="sg-label" htmlFor="reg-apellidos">Apellido(s)</label>
          <input
            id="reg-apellidos"
            data-testid="reg-apellidos"
            type="text"
            className="sg-input"
            placeholder="Ej. López Hernández"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label className="sg-label" htmlFor="reg-email">Correo</label>
          <input
            id="reg-email"
            data-testid="reg-email"
            type="email"
            className="sg-input"
            placeholder="nombre@dependencia.gob.mx"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />
        </div>
        <div>
          <label className="sg-label" htmlFor="reg-rol">Rol que solicita</label>
          <select
            id="reg-rol"
            data-testid="reg-rol"
            className="sg-input"
            value={rolSolicitado}
            onChange={(e) => setRolSolicitado(e.target.value)}
            disabled={loading}
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Informativo: la dependencia confirma el rol definitivo al aprobar.
          </p>
        </div>
        {/* O3: empresa de la persona (catálogo del profe). Autocomplete con <datalist>: si la
            empresa ya existe se ELIGE; si es nueva, el backend la da de alta (se confirma al enviar). */}
        <div>
          <label className="sg-label" htmlFor="reg-empresa">Empresa (opcional)</label>
          <input
            id="reg-empresa"
            data-testid="reg-empresa"
            type="text"
            list="reg-empresas-lista"
            className="sg-input"
            placeholder="Escribe o elige tu empresa"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            disabled={loading}
          />
          <datalist id="reg-empresas-lista">
            {empresas.map((e) => <option key={e.id} value={e.nombre} />)}
          </datalist>
          <p className="text-xs text-slate-500 mt-1">
            Si no está en la lista, se registra como empresa nueva (catálogo: la primera vez se da de alta).
          </p>
        </div>
        <div>
          <label className="sg-label" htmlFor="reg-password">Contraseña (mín. 8 caracteres)</label>
          <input
            id="reg-password"
            data-testid="reg-password"
            type="password"
            className="sg-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
        <div>
          <label className="sg-label" htmlFor="reg-password2">Confirmar contraseña</label>
          <input
            id="reg-password2"
            data-testid="reg-password2"
            type="password"
            className="sg-input"
            placeholder="••••••••"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
        <button type="submit" data-testid="reg-submit" className="sg-btn-primary w-full" disabled={loading}>
          {loading ? 'Enviando…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <button
          type="button"
          data-testid="link-login"
          onClick={onIrLogin}
          className="font-semibold text-sigecop-accent hover:underline"
        >
          Inicia sesión
        </button>
      </p>
    </div>
  );
}

// UI-1 (10-jun): pantalla PREVIA al shell — limpia, sin barra de navegación, identidad
// guinda institucional (franja superior guinda con filo dorado). Los formularios (ids,
// data-testid y textos asercionados por la suite) quedan INTACTOS.
export default function SeleccionRol() {
  const [vista, setVista] = useState('login'); // 'login' | 'registro'
  const [mensaje, setMensaje] = useState(null);

  return (
    <div className="min-h-screen flex flex-col bg-pagina">
      {/* Franja de identidad: guinda con filo dorado (mismo sello que la barra del shell). */}
      <div className="h-2 bg-guinda border-b-[3px] border-dorado flex-shrink-0" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-6 py-12">
          {/* Logo + nombre del sistema */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-lg bg-guinda text-white flex items-center justify-center font-extrabold text-2xl mx-auto mb-4">
              S
            </div>
            <h1 className="text-2xl font-semibold text-guinda tracking-wide">SIGECOP</h1>
            <p className="text-xs text-tinta-sec mt-1 leading-tight">
              Sistema de Gestión Técnico-Administrativa<br />de Contratos de Obra Pública
            </p>
          </div>

          {vista === 'login' ? (
            <FormLogin
              onIrRegistro={() => { setMensaje(null); setVista('registro'); }}
              mensaje={mensaje}
              setMensaje={setMensaje}
            />
          ) : (
            <FormRegistro
              onIrLogin={() => setVista('login')}
              setMensaje={setMensaje}
            />
          )}

        </div>
      </main>
    </div>
  );
}
