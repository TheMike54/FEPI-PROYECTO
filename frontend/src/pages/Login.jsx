import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ui/Toast.jsx';

export default function Login() {
  const { showToast } = useToast();
  const [usuario, setUsuario] = useState('residente.demo');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    showToast('Pendiente para Sprint siguiente. El sistema deducirá el rol internamente.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sigecop-blue-light via-blue-100 to-sigecop-blue/10 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-xl bg-sigecop-blue text-white flex items-center justify-center font-extrabold text-3xl mx-auto mb-3 shadow-md">
              S
            </div>
            <h1 className="font-serif text-3xl font-bold text-sigecop-blue">SIGECOP</h1>
            <p className="text-xs text-slate-500 mt-1 leading-tight">
              Sistema de Gestión Técnico-Administrativa<br />de Contratos de Obra Pública
            </p>
          </div>

          <h2 className="text-lg font-semibold text-slate-800 mb-4 text-center">Iniciar sesión</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="sg-label" htmlFor="usuario">Usuario</label>
              <input
                id="usuario"
                type="text"
                className="sg-input"
                placeholder="nombre.apellido"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="sg-label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="sg-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="sg-btn-primary w-full">
              Iniciar sesión
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            Si no recuerdas tu usuario, contacta a tu administrador.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-slate-600 hover:text-sigecop-blue">
            ← Volver a inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
