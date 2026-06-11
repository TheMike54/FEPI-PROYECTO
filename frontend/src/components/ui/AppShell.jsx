import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion, useVistaHU } from '../../context/SesionContext.jsx';
import { ROLES } from '../../data/permisos.js';
import { api } from '../../services/api.js';
import Sidebar from '../layout/Sidebar.jsx';

// UI-1 (reskin "institucional moderno", 10-jun): shell de la app autenticada.
// Barra superior GUINDA con filo DORADO (3px): logo + buscador + campana + chip de rol +
// nombre + avatar + Salir. Sidebar CLARO (#FAFAF8, ver Sidebar.jsx) y contenido sobre pagina.
//
// CONTRATO CON LA SUITE (no romper):
//  · <aside> con los NavLink (lo aporta Sidebar) — enterAppMode espera 'aside' visible y
//    goToViaSidebar usa `aside a[href=...]`.
//  · <main> envuelve el contenido — cardInInicioFor usa `main a[href=...]`.
//  · Botón con texto exacto "Salir" (logout) y el NOMBRE del usuario VISIBLE (hu-registro).
//
// El buscador y la campana son PRESENTACIONALES en UI-1 (regla de oro: sin lógica nueva);
// se cablearán cuando exista la búsqueda global / el centro de notificaciones.

function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '·';
  return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase();
}

export default function AppShell({ children }) {
  const { rol, usuario, token, logout } = useSesion();
  const rolActivo = ROLES.find((r) => r.id === rol);

  // O5 (HU-07 v2): badge de la campana = conceptos con déficit (acotado por participación). Solo para
  // los roles con acceso a HU-07 (residente/supervisión); las demás cuentas no lo consultan ni lo ven.
  const { sinAcceso: sinAccesoAtraso } = useVistaHU('HU-07');
  const [atrasos, setAtrasos] = useState(0);
  useEffect(() => {
    if (!token || sinAccesoAtraso) { setAtrasos(0); return; }
    let vivo = true;
    api.resumenAtrasos()
      .then((r) => { if (vivo) setAtrasos(Number(r?.conceptos || 0)); })
      .catch(() => { if (vivo) setAtrasos(0); });
    return () => { vivo = false; };
  }, [token, sinAccesoAtraso]);

  return (
    <div className="h-screen flex flex-col bg-pagina">
      <header className="bg-guinda text-white h-14 flex-shrink-0 border-b-[3px] border-dorado">
        <div className="h-full px-4 sm:px-6 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-shrink-0">
            <div className="w-8 h-8 rounded-md bg-white text-guinda flex items-center justify-center font-extrabold text-base">
              S
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight tracking-wide">SIGECOP</div>
              <div className="text-[10px] text-white/70 leading-tight hidden lg:block">
                Gestión de contratos de obra pública
              </div>
            </div>
          </Link>

          {/* Buscador global (presentacional en UI-1). */}
          <div className="flex-1 max-w-xl hidden md:block">
            <input
              type="search"
              placeholder="Buscar contrato, nota, estimación…"
              aria-label="Buscar"
              className="w-full h-9 px-3 rounded-md bg-white/10 border border-white/20 text-sm text-white placeholder-white/50 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-shrink-0">
            {/* Campana de notificaciones. O5: para los roles con acceso a HU-07 enlaza al panel de
                atraso y muestra el conteo de conceptos con déficit; para el resto sigue presentacional. */}
            {sinAccesoAtraso ? (
              <button
                type="button"
                aria-label="Notificaciones"
                title="Notificaciones"
                className="w-9 h-9 rounded-md hover:bg-white/10 transition-colors text-base leading-none"
              >
                🔔
              </button>
            ) : (
              <Link
                to="/seguimiento/alertas"
                aria-label={atrasos > 0 ? `Notificaciones: ${atrasos} conceptos con déficit` : 'Notificaciones'}
                title={atrasos > 0 ? `${atrasos} conceptos con déficit` : 'Notificaciones'}
                className="relative w-9 h-9 rounded-md hover:bg-white/10 transition-colors text-base leading-none flex items-center justify-center"
              >
                🔔
                {atrasos > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-dorado text-guinda-dark text-[10px] font-bold flex items-center justify-center"
                    data-testid="campana-atrasos"
                  >
                    {atrasos > 99 ? '99+' : atrasos}
                  </span>
                )}
              </Link>
            )}
            {rolActivo && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/30 text-xs font-medium whitespace-nowrap">
                {rolActivo.nombre}
              </span>
            )}
            {usuario && (
              <span className="text-xs text-white/90 hidden sm:inline max-w-[12rem] truncate" title={usuario.nombre}>
                {usuario.nombre}
              </span>
            )}
            <div
              className="w-8 h-8 rounded-full bg-dorado text-guinda-dark flex items-center justify-center text-xs font-bold flex-shrink-0"
              title={usuario?.nombre || rolActivo?.nombre}
            >
              {iniciales(usuario?.nombre || rolActivo?.nombre)}
            </div>
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
