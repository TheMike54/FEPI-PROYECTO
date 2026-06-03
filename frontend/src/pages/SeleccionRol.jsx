import { useState } from 'react';
import Header from '../components/layout/Header.jsx';
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
      await login(email, password);
    } catch (err) {
      // El backend devuelve un mensaje claro (403 pendiente/rechazada, 401 credenciales).
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo iniciar sesión' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-8 mb-8">
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

function FormRegistro({ onIrLogin, setMensaje }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [rolSolicitado, setRolSolicitado] = useState(ROLES[0].id);
  const [loading, setLoading] = useState(false);
  const [errorLocal, setErrorLocal] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorLocal(null);

    if (!nombre.trim() || !email.trim() || !password) {
      setErrorLocal('Completa todos los campos.');
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

    setLoading(true);
    try {
      await api.register({ nombre: nombre.trim(), email: email.trim(), password, rolSolicitado });
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
    <div className="bg-white rounded-xl shadow-md p-8 mb-8">
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
          <label className="sg-label" htmlFor="reg-nombre">Nombre completo</label>
          <input
            id="reg-nombre"
            data-testid="reg-nombre"
            type="text"
            className="sg-input"
            placeholder="Ej. Ing. María López Hernández"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
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

export default function SeleccionRol() {
  const [vista, setVista] = useState('login'); // 'login' | 'registro'
  const [mensaje, setMensaje] = useState(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Logo + nombre del sistema */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-sigecop-blue text-white flex items-center justify-center font-extrabold text-3xl mx-auto mb-3 shadow-md">
              S
            </div>
            <h1 className="font-serif text-3xl font-bold text-sigecop-blue">SIGECOP</h1>
            <p className="text-xs text-slate-500 mt-1 leading-tight">
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
