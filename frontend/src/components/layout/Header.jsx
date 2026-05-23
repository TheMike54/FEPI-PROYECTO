import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-sigecop-blue text-white shadow-md h-14 flex-shrink-0">
      <div className="h-full px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-lg bg-white text-sigecop-blue flex items-center justify-center font-extrabold text-lg">
            S
          </div>
          <div>
            <div className="text-base font-bold leading-tight">SIGECOP</div>
            <div className="text-[10px] opacity-80 leading-tight">
              Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública
            </div>
          </div>
        </Link>
        <div className="text-xs opacity-90 hidden md:block">
          Sprint 1 · Mayo 2026
        </div>
      </div>
    </header>
  );
}
