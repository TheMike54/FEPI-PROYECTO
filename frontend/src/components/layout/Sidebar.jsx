import { NavLink } from 'react-router-dom';
import { historiasUsuario } from '../../data/dummy.js';
import { ROLES, nivelDe } from '../../data/permisos.js';
import { useSesion } from '../../context/SesionContext.jsx';

export default function Sidebar() {
  const { modo, rol, salirRol } = useSesion();
  const enModoApp = modo === 'aplicacion';

  // En modo aplicación: filtrar por permisos y ocultar HU-00 (login transversal).
  // En modo proyecto: las 12 vistas tal cual.
  const entradas = enModoApp
    ? historiasUsuario
        .filter((hu) => hu.codigo !== 'HU-00' && nivelDe(hu.codigo, rol) !== null)
        .map((hu) => ({ ...hu, nivel: nivelDe(hu.codigo, rol) }))
    : historiasUsuario.map((hu) => ({ ...hu, nivel: null }));

  const rolActivo = ROLES.find((r) => r.id === rol);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto">
      <div className="px-4 py-4">
        {enModoApp && rolActivo && (
          <div className="mb-4 p-3 rounded-md bg-sigecop-blue-light border border-sigecop-accent/30">
            <div className="text-[10px] uppercase tracking-wider text-sigecop-blue font-semibold">
              Sesión actual
            </div>
            <div className="text-sm font-bold text-sigecop-blue leading-tight mt-0.5">
              {rolActivo.nombre}
            </div>
            <button
              type="button"
              onClick={salirRol}
              className="mt-2 text-xs text-sigecop-accent hover:underline"
            >
              ← Cambiar de rol
            </button>
          </div>
        )}

        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
          {enModoApp ? 'Pantallas disponibles' : 'Historias de usuario'}
        </div>

        <nav className="space-y-1">
          {entradas.map((hu) => (
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
                {!enModoApp && (
                  <div className="text-xs font-semibold opacity-70">{hu.codigo}</div>
                )}
                <div className="text-sm leading-tight flex items-center gap-2">
                  {hu.titulo}
                  {enModoApp && hu.nivel === 'C' && (
                    <span className="text-[9px] uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                      lectura
                    </span>
                  )}
                </div>
              </div>
            </NavLink>
          ))}
        </nav>

        {!enModoApp && (
          <div className="mt-6 pt-4 border-t border-slate-200 px-3">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Leyenda</div>
            <div className="text-xs space-y-1 text-slate-600">
              <div>• Botones azules = acción primaria</div>
              <div>• Cajas verdes = criterios de aceptación</div>
              <div>• Vistas huecas — sin backend</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
