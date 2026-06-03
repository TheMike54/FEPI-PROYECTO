import { NavLink } from 'react-router-dom';
import { historiasUsuario } from '../../data/dummy.js';
import { ROLES, nivelDe } from '../../data/permisos.js';
import { useSesion } from '../../context/SesionContext.jsx';

export default function Sidebar() {
  const { rol, salirRol } = useSesion();

  // Control por rol: solo se listan las HU accesibles para el rol (nivel != null),
  // ocultando HU-00 (login transversal). Así el menú no muestra enlaces que la guarda
  // de ruta rebotaría al inicio.
  const entradas = historiasUsuario
    .filter((hu) => hu.codigo !== 'HU-00' && nivelDe(hu.codigo, rol) !== null)
    .map((hu) => ({ ...hu, nivel: nivelDe(hu.codigo, rol) }));

  const rolActivo = ROLES.find((r) => r.id === rol);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto">
      <div className="px-4 py-4">
        {rolActivo && (
          <div className="mb-4 p-3 rounded-md bg-sigecop-blue-light border border-sigecop-accent/30">
            <div className="text-[10px] uppercase tracking-wider text-sigecop-blue font-semibold">
              Rol activo
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
          Pantallas disponibles
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
                <div className="text-sm leading-tight flex items-center gap-2">
                  {hu.titulo}
                  {hu.nivel === 'C' && (
                    <span className="text-[9px] uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                      lectura
                    </span>
                  )}
                </div>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Bandeja de firmas pendientes: cualquier miembro de equipo (residente,
            contratista/superintendente, supervisión). Fuera del catálogo de HU. */}
        {['residente', 'contratista', 'supervision'].includes(rol) && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
              Bitácora
            </div>
            <nav className="space-y-1">
              <NavLink
                to="/bitacora/por-firmar"
                className={({ isActive }) =>
                  `flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-4 ${
                    isActive
                      ? 'bg-sigecop-blue-light/60 text-sigecop-blue border-sigecop-accent font-semibold'
                      : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-sigecop-blue'
                  }`
                }
              >
                <span className="text-lg leading-none flex-shrink-0">✍️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Por firmar</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* Administración de la dependencia: gestión de solicitudes de registro.
            Fuera del catálogo de HU para no alterar conteos ni permisos por HU. */}
        {rol === 'dependencia' && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
              Administración
            </div>
            <nav className="space-y-1">
              <NavLink
                to="/usuarios/solicitudes"
                className={({ isActive }) =>
                  `flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-4 ${
                    isActive
                      ? 'bg-sigecop-blue-light/60 text-sigecop-blue border-sigecop-accent font-semibold'
                      : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-sigecop-blue'
                  }`
                }
              >
                <span className="text-lg leading-none flex-shrink-0">📝</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Solicitudes de registro</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

      </div>
    </aside>
  );
}
