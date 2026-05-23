import { NavLink } from 'react-router-dom';
import { historiasUsuario } from '../../data/dummy.js';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto">
      <div className="px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
          Historias de usuario
        </div>
        <nav className="space-y-1">
          {historiasUsuario.map((hu) => (
            <NavLink
              key={hu.codigo}
              to={hu.ruta}
              className={({ isActive }) =>
                `flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-4 ${
                  isActive
                    ? 'bg-sigecop-blue-light/60 text-sigecop-blue border-sigecop-accent font-semibold'
                    : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-sigecop-blue'
                }`
              }
            >
              <span className="text-lg leading-none flex-shrink-0">{hu.icono}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold opacity-70">{hu.codigo}</div>
                <div className="text-sm leading-tight">{hu.titulo}</div>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 pt-4 border-t border-slate-200 px-3">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Leyenda</div>
          <div className="text-xs space-y-1 text-slate-600">
            <div>• Botones azules = acción primaria</div>
            <div>• Cajas verdes = criterios de aceptación</div>
            <div>• Vistas huecas — sin backend</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
