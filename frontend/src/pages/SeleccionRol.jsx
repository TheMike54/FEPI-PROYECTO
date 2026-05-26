import { useState } from 'react';
import Header from '../components/layout/Header.jsx';
import { ROLES } from '../data/permisos.js';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';

const ICONOS = {
  residente:   '👷',
  contratista: '🏗️',
  supervision: '🔎',
  dependencia: '🏛️',
  finanzas:    '💰'
};

const DESCRIPCIONES = {
  residente:   'Supervisa la obra por la dependencia, autoriza estimaciones y abre bitácora.',
  contratista: 'Integra estimaciones, captura generadores y emite notas técnicas.',
  supervision: 'Revisa técnicamente las estimaciones y emite observaciones.',
  dependencia: 'Carga fianzas, da seguimiento al expediente y valida tránsito a pago.',
  finanzas:    'Verifica suficiencia presupuestal y registra los pagos efectuados.'
};

export default function SeleccionRol() {
  const { setRol, login } = useSesion();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      showToast('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

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

          {/* Card login real */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 text-center">
              Iniciar sesión
            </h2>
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
            <p className="mt-4 text-center text-xs text-slate-500">
              ¿No tienes acceso al sistema? Solicítalo a tu dependencia o al
              administrador del contrato.
            </p>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-slate-300" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              — o entra en modo demostración —
            </span>
            <div className="flex-1 h-px bg-slate-300" />
          </div>

          {/* Bloque demo */}
          <div className="bg-blue-50 border border-sigecop-accent/30 rounded-xl p-6">
            <p className="text-sm text-slate-700 mb-5">
              Atajo para explorar el sistema sin credenciales reales. Elige el rol
              con el que quieres entrar; este selector existe solo en modo
              demostración (<strong>HU-00</strong>) — en producción el rol se
              deduce del usuario autenticado.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRol(r.id)}
                  className="bg-white rounded-lg border border-slate-200 hover:border-sigecop-accent hover:shadow-md transition-all text-left p-4 group"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="text-2xl flex-shrink-0">{ICONOS[r.id]}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sigecop-blue group-hover:underline text-sm leading-tight">
                        {r.nombre}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    {DESCRIPCIONES[r.id]}
                  </p>
                  <div className="mt-3 text-xs font-semibold text-sigecop-accent">
                    Entrar como este rol →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
