import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';

function ToggleModo() {
  const { modo, setModo } = useSesion();
  const baseBtn = 'px-3 py-1 text-xs font-semibold rounded-md transition-colors';
  return (
    <div
      className="inline-flex items-center bg-white/10 rounded-lg p-0.5"
      role="group"
      aria-label="Modo de visualización"
    >
      <button
        type="button"
        onClick={() => setModo('proyecto')}
        className={`${baseBtn} ${modo === 'proyecto' ? 'bg-white text-sigecop-blue' : 'text-white/80 hover:text-white'}`}
      >
        Modo proyecto
      </button>
      <button
        type="button"
        onClick={() => setModo('aplicacion')}
        className={`${baseBtn} ${modo === 'aplicacion' ? 'bg-white text-sigecop-blue' : 'text-white/80 hover:text-white'}`}
      >
        Modo aplicación
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
        <ToggleModo />
      </div>
    </header>
  );
}
