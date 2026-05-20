import { Link } from 'react-router-dom';

export default function Login() {
  return (
    <div className="min-h-screen bg-sigecop-blue-light flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="sg-card">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-sigecop-blue text-white flex items-center justify-center font-bold text-3xl shadow-md">
              S
            </div>
            <h1 className="mt-4 text-2xl font-bold text-sigecop-blue">SIGECOP</h1>
            <p className="text-sm text-slate-600 text-center mt-1">
              Sistema de Gestión de Contratos de Obra Pública
            </p>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="sg-label" htmlFor="usuario">Usuario</label>
              <input
                id="usuario"
                type="text"
                className="sg-input"
                placeholder="usuario@dependencia.gob.mx"
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
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="sg-btn-primary w-full">
              Iniciar sesión
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-sigecop-accent hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-sigecop-blue">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
