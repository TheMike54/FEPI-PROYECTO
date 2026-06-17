import { NavLink } from 'react-router-dom';
import { historiasUsuario } from '../../data/dummy.js';
import { ROLES, nivelDe } from '../../data/permisos.js';
import { useSesion } from '../../context/SesionContext.jsx';

// UI-1 (10-jun): sidebar CLARO (#FAFAF8) con item activo guinda-soft + texto guinda +
// borde izquierdo guinda. La ESTRUCTURA no cambia (mismo <aside>, mismos NavLink con
// href, mismas secciones por rol): la suite navega con `aside a[href=...]`.
// El chip de rol vive ahora en la barra superior (AppShell); aquí queda solo el
// acceso "Cambiar de rol" (salirRol) al pie de la navegación.

const itemClass = ({ isActive }) =>
  `flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-[3px] ${
    isActive
      ? 'bg-guinda-soft text-guinda border-guinda font-medium'
      : 'border-transparent text-tinta-sec hover:bg-white hover:text-tinta'
  }`;

const seccionClass = 'text-[11px] font-medium uppercase tracking-wider text-tinta-ter px-3 mb-2';

export default function Sidebar() {
  const { rol, salirRol } = useSesion();

  // Control por rol: solo se listan las HU accesibles para el rol (nivel != null),
  // ocultando HU-00 (login transversal). Así el menú no muestra enlaces que la guarda
  // de ruta rebotaría al inicio.
  const entradas = historiasUsuario
    .filter((hu) => hu.codigo !== 'HU-00' && nivelDe(hu.codigo, rol) !== null)
    .map((hu) => ({ ...hu, nivel: nivelDe(hu.codigo, rol) }));

  return (
    <aside className="w-64 bg-pagina border-r border-borde flex-shrink-0 overflow-y-auto">
      <div className="px-3 py-4 flex flex-col min-h-full">
        <div className={seccionClass}>Pantallas disponibles</div>

        <nav className="space-y-0.5">
          {entradas.map((hu) => (
            <NavLink key={hu.codigo} to={hu.ruta} className={itemClass}>
              <span className="text-base leading-none flex-shrink-0 mt-0.5">{hu.icono}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-tight flex items-center gap-2">
                  {hu.titulo}
                  {hu.nivel === 'C' && (
                    <span className="text-[9px] uppercase tracking-wider bg-white border border-borde text-tinta-ter px-1.5 py-0.5 rounded">
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
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Bitácora</div>
            <nav className="space-y-0.5">
              <NavLink to="/bitacora/por-firmar" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">✍️</span>
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
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Administración</div>
            <nav className="space-y-0.5">
              <NavLink to="/usuarios/solicitudes" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">📝</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Solicitudes de registro</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* Roster del contrato: sustitución de personas (Pasada F, art. 125 fr. I g). La autoridad
            es la dependencia o el residente asignado. Fuera del catálogo de HU (no altera permisos). */}
        {['dependencia', 'residente'].includes(rol) && (
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Roster del contrato</div>
            <nav className="space-y-0.5">
              <NavLink to="/contratos/roster" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">👥</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Sustitución de personas</div>
                </div>
              </NavLink>
              {/* HU-24 (FASE 4): finiquito y cierre del contrato. Misma autoridad (dependencia/residente);
                  fuera del catálogo de HU (no altera permisos.js), como el roster. */}
              <NavLink to="/contratos/finiquito" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">🔒</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Finiquito y cierre</div>
                </div>
              </NavLink>
              {/* BLOQUE B: ambiente de cierre por bloques (cascarón que envuelve HU-24, misma autoridad). */}
              <NavLink to="/contratos/cierre" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">🧾</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Cierre del contrato (por bloques)</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* BLOQUE B: ambiente de bitácora por bloques (cascarón). Fuera del catálogo de HU (no altera
            permisos.js); roles de la bitácora (residente ejecuta; contratista/supervisión participan). */}
        {['residente', 'contratista', 'supervision'].includes(rol) && (
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Bitácora</div>
            <nav className="space-y-0.5">
              <NavLink to="/bitacora/ambiente" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">📒</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Recorrido de bitácora (por bloques)</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* BLOQUE B: ambiente de expediente y reportes (cierre documental). Fuera del catálogo de HU; roles
            que ven expediente Y reportes (finanzas fuera: solo reportes). */}
        {['residente', 'contratista', 'supervision', 'dependencia'].includes(rol) && (
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Expediente y reportes</div>
            <nav className="space-y-0.5">
              <NavLink to="/contratos/expediente-ambiente" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">📑</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Cierre documental (por bloques)</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* PLAN GRANDE BLOQUE 1: administración del padrón de empresas. Solo la Dependencia. */}
        {rol === 'dependencia' && (
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Administración</div>
            <nav className="space-y-0.5">
              <NavLink to="/admin/empresas" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">🏢</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Padrón de empresas</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* BLOQUE B: MACRO ciclo de vida del contrato (índice ordenado). Fuera del catálogo de HU; finanzas
            excluida. */}
        {['residente', 'contratista', 'supervision', 'dependencia'].includes(rol) && (
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Ciclo del contrato</div>
            <nav className="space-y-0.5">
              <NavLink to="/contratos/ciclo-vida" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">🗺️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Ciclo de vida (recorrido completo)</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* BLOQUE B: ambiente de avance físico y seguimiento. Fuera del catálogo de HU; ejecutores +
            supervisión (dependencia fuera por decisión). */}
        {['contratista', 'residente', 'supervision'].includes(rol) && (
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Seguimiento</div>
            <nav className="space-y-0.5">
              <NavLink to="/seguimiento/ambiente" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">📈</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Avance y seguimiento (por bloques)</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* BLOQUE B: ambiente de convenio modificatorio (episódico). Fuera del catálogo de HU. */}
        {['dependencia', 'residente', 'contratista', 'supervision'].includes(rol) && (
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Convenios</div>
            <nav className="space-y-0.5">
              <NavLink to="/contratos/convenio-ambiente" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">📐</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Convenio modificatorio (por bloques)</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* BLOQUE B: ambiente de pago (ciclo de cobro). Fuera del catálogo de HU; roles de HU-20/HU-21
            (supervisión excluida). */}
        {['finanzas', 'contratista', 'residente', 'dependencia'].includes(rol) && (
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Pago</div>
            <nav className="space-y-0.5">
              <NavLink to="/pagos/ambiente" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">💸</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Ciclo de pago (por bloques)</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* FASE 5: ambiente de estimación por bloques (cascarón). Fuera del catálogo de HU; roles del
            ciclo de estimación (contratista integra; residente/supervisión consultan el flujo). */}
        {['contratista', 'residente', 'supervision'].includes(rol) && (
          <div className="mt-6 pt-4 border-t border-borde">
            <div className={seccionClass}>Estimación</div>
            <nav className="space-y-0.5">
              <NavLink to="/estimaciones/ambiente" className={itemClass}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">🧱</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">Nueva estimación (por bloques)</div>
                </div>
              </NavLink>
            </nav>
          </div>
        )}

        {/* Cambiar de rol (salirRol: conserva el token, vuelve al selector). Antes vivía en la
            tarjeta "Rol activo"; el rol se muestra ahora como chip en la barra superior. */}
        <div className="mt-auto pt-6 pb-2 px-3">
          <button
            type="button"
            onClick={salirRol}
            className="text-xs text-tinta-sec hover:text-guinda transition-colors"
          >
            ← Cambiar de rol
          </button>
        </div>
      </div>
    </aside>
  );
}
