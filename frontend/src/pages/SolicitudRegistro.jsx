import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROLES } from '../data/permisos.js';
import { empresaExistentePorNombre } from '../data/empresa.js';
import { api } from '../services/api.js';

// alta-v2 (4.3): página de SOLICITUD DE ACCESO ahora PÚBLICA (ruta /solicitud-acceso sin
// login) y con BACKEND REAL: registra al usuario con POST /auth/register (api.register), que
// crea la cuenta en estado 'pendiente' hasta que la dependencia la aprueba. Antes era una
// maqueta "Propuesta · a validar" del modo proyecto (showToast, sin backend, con contratoDummy);
// se eliminó ese andamiaje. Es autosuficiente (no usa Layout): trae su propia cabecera.
// Corrección profe (04-jun): el nombre completo (nombre + apellido[s]) aparece en la bitácora
// (art. 123 RLOPSRM); se exige ≥2 palabras. Espejo de la validación del backend (auth.controller).
const esNombreCompleto = (n) => (String(n || '').trim().match(/\p{L}{2,}/gu) || []).length >= 2;

export default function SolicitudRegistro() {
  // Plan2 Pase3: nombre dividido en dos campos OBLIGATORIOS (nombre[s] + apellido[s]); se CONCATENAN
  // al enviar para no cambiar la columna `nombre` (fuente única) ni los lugares que la muestran.
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [rolSolicitado, setRolSolicitado] = useState(ROLES[0].id);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [empresa, setEmpresa] = useState('');       // O3
  const [empresas, setEmpresas] = useState([]);     // O3: catálogo para el autocomplete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);

  // O3: catálogo de empresas (público) para el datalist. Falla en silencio.
  useEffect(() => {
    api.listarEmpresas().then((l) => setEmpresas(Array.isArray(l) ? l : [])).catch(() => setEmpresas([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!nombres.trim()) {
      setError('Captura tu(s) nombre(s).');
      return;
    }
    if (!apellidos.trim()) {
      setError('Captura tu(s) apellido(s).');
      return;
    }
    if (!email.trim() || !password) {
      setError('Completa nombre, correo y contraseña.');
      return;
    }
    // Concatena nombre(s) + apellido(s) en el campo `nombre` (fuente única; espejo del backend).
    const nombre = `${nombres.trim()} ${apellidos.trim()}`.replace(/\s+/g, ' ').trim();
    if (!esNombreCompleto(nombre)) {
      setError('Captura tu nombre y apellido(s): el nombre completo aparece en la bitácora.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    // O3/FASE 3: si lo tecleado YA está en el catálogo (match FUERTE: ignora acentos/puntuación/
    // sufijos de razón social), se REUTILIZA sin preguntar; solo si NO existe se confirma el alta.
    const empresaTrim = empresa.trim().replace(/\s+/g, ' ');
    if (empresaTrim) {
      const yaExiste = empresaExistentePorNombre(empresas, empresaTrim);
      if (!yaExiste && !window.confirm(`"${empresaTrim}" no está en el catálogo. ¿Registrarla como nueva empresa?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      await api.register({ nombre, email: email.trim(), password, rolSolicitado, empresa: empresaTrim });
      setExito(true);
    } catch (err) {
      setError(err.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-sigecop-blue text-white shadow-md h-14 flex-shrink-0">
        <div className="h-full px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-lg bg-white text-sigecop-blue flex items-center justify-center font-extrabold text-lg">S</div>
            <div>
              <div className="text-base font-bold leading-tight">SIGECOP</div>
              <div className="text-[10px] opacity-80 leading-tight hidden sm:block">
                Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública
              </div>
            </div>
          </Link>
          <Link to="/" className="px-3 py-1 text-xs font-semibold rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-10">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold text-sigecop-blue">Solicitud de acceso</h1>
            <p className="text-xs text-slate-500 mt-1 leading-tight">
              Regístrate para solicitar tu inscripción al sistema. Tu acceso queda
              <strong> pendiente</strong> hasta que la dependencia lo apruebe.
            </p>
          </div>

          {exito ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-4xl mb-3">📨</div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Solicitud enviada</h2>
              <p className="text-sm text-slate-600 mb-6" data-testid="solicitud-exito">
                Tu cuenta quedó <strong>pendiente de aprobación</strong> por la dependencia.
                Te avisaremos cuando puedas iniciar sesión.
              </p>
              <Link to="/" className="sg-btn-primary inline-block">Ir a iniciar sesión</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8" data-testid="form-solicitud">
              {error && (
                <div data-testid="solicitud-error" className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="sg-label" htmlFor="sol-nombres">Nombre(s) *</label>
                  <input id="sol-nombres" data-testid="sol-nombres" className="sg-input" placeholder="Ej. María"
                    value={nombres} onChange={(e) => setNombres(e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="sg-label" htmlFor="sol-apellidos">Apellido(s) *</label>
                  <input id="sol-apellidos" data-testid="sol-apellidos" className="sg-input" placeholder="Ej. López Hernández"
                    value={apellidos} onChange={(e) => setApellidos(e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="sg-label" htmlFor="sol-email">Correo electrónico *</label>
                  <input id="sol-email" data-testid="sol-email" type="email" className="sg-input" placeholder="nombre@dependencia.gob.mx"
                    value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" disabled={loading} />
                </div>
                <div>
                  <label className="sg-label" htmlFor="sol-rol">Rol que solicita *</label>
                  <select id="sol-rol" data-testid="sol-rol" className="sg-input" value={rolSolicitado}
                    onChange={(e) => setRolSolicitado(e.target.value)} disabled={loading}>
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Informativo: la dependencia confirma el rol definitivo al aprobar.</p>
                </div>
                {/* O3: empresa de la persona (catálogo del profe), con autocomplete. */}
                <div>
                  <label className="sg-label" htmlFor="sol-empresa">Empresa (opcional)</label>
                  <input id="sol-empresa" data-testid="sol-empresa" className="sg-input" list="sol-empresas-lista"
                    placeholder="Escribe o elige tu empresa"
                    value={empresa} onChange={(e) => setEmpresa(e.target.value)} disabled={loading} />
                  <datalist id="sol-empresas-lista">
                    {empresas.map((e) => <option key={e.id} value={e.nombre} />)}
                  </datalist>
                  {(() => {
                    const ya = empresa.trim() ? empresaExistentePorNombre(empresas, empresa) : null;
                    return ya
                      ? <p className="text-xs text-exito mt-1" data-testid="sol-empresa-existente">✓ Se usará la empresa ya registrada: «{ya.nombre}» (no se duplica).</p>
                      : <p className="text-xs text-slate-500 mt-1">Si no está en la lista, se registra como empresa nueva.</p>;
                  })()}
                </div>
                <div>
                  <label className="sg-label" htmlFor="sol-password">Contraseña (mín. 8 caracteres) *</label>
                  <input id="sol-password" data-testid="sol-password" type="password" className="sg-input" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" disabled={loading} />
                </div>
                <div>
                  <label className="sg-label" htmlFor="sol-password2">Confirmar contraseña *</label>
                  <input id="sol-password2" data-testid="sol-password2" type="password" className="sg-input" placeholder="••••••••"
                    value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" disabled={loading} />
                </div>
                <button type="submit" data-testid="sol-submit" className="sg-btn-primary w-full" disabled={loading}>
                  {loading ? 'Enviando…' : 'Enviar solicitud'}
                </button>
              </div>
              <p className="mt-4 text-center text-sm text-slate-600">
                ¿Ya tienes cuenta?{' '}
                <Link to="/" className="font-semibold text-sigecop-accent hover:underline">Inicia sesión</Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
