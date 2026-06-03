import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import { ROLES } from '../../data/permisos.js';

function UsuarioBadge() {
  const { rol, usuario, logout } = useSesion();
  if (!rol) return null;
  const nombreRol = ROLES.find((r) => r.id === rol)?.nombre || rol;
  const etiqueta = usuario ? usuario.nombre : nombreRol;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/90 hidden sm:inline max-w-[14rem] truncate" title={etiqueta}>
        {etiqueta}
      </span>
      <button
        type="button"
        onClick={logout}
        className="px-3 py-1 text-xs font-semibold rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        Salir
      </button>
    </div>
  );
}

export default function Header() {
  return (
    <header className="bg-sigecop-blue text-white shadow-md h-14 flex-shrink-0">
      <div className="h-full px-6 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-lg bg-white text-sigecop-blue flex items-center justify-center font-extrabold text-lg">
            S
          </div>
          <div>
            <div className="text-base font-bold leading-tight">SIGECOP</div>
            <div className="text-[10px] opacity-80 leading-tight hidden sm:block">
              Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <UsuarioBadge />
        </div>
      </div>
    </header>
  );
}
