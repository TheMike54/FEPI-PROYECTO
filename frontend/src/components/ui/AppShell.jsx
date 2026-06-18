import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSesion, useVistaHU } from '../../context/SesionContext.jsx';
import { ROLES } from '../../data/permisos.js';
import { historiasUsuario } from '../../data/dummy.js';
import { api } from '../../services/api.js';
import Sidebar from '../layout/Sidebar.jsx';

// BLOQUE 4 (navegación modo-sistema): indicador discreto de HU abajo-derecha + chip de empresa arriba
// (mockup `docs/mockups/sigecop-modo-sistema.html`). Ambos son MARCO/navegación, no tocan contenido ni
// zona congelada. Mapa ruta→HU (de las HU reales) + rutas-marco (ambientes/admin) con su etiqueta.
const HU_POR_RUTA = Object.fromEntries(
  historiasUsuario.filter((h) => h.codigo !== 'HU-00').map((h) => [h.ruta, h])
);
const RUTAS_MARCO = {
  '/': { label: 'Inicio' },
  '/bitacora/por-firmar': { label: 'Por firmar' },
  '/usuarios/solicitudes': { label: 'Solicitudes de registro' },
  '/contratos/roster': { label: 'Roster / sustitución', hu: 'HU-22' },
  '/contratos/finiquito': { label: 'Cierre / finiquito', hu: 'HU-24' },
  '/contratos/cierre': { label: 'Cierre (recorrido por bloques)' },
  '/admin/empresas': { label: 'Padrón de empresas' },
  '/bitacora/ambiente': { label: 'Bitácora (recorrido por bloques)' },
  '/contratos/expediente-ambiente': { label: 'Expediente (recorrido por bloques)' },
  '/seguimiento/ambiente': { label: 'Avance (recorrido por bloques)' },
  '/pagos/ambiente': { label: 'Pago (recorrido por bloques)' },
  '/contratos/convenio-ambiente': { label: 'Convenio (recorrido por bloques)' },
  '/contratos/ciclo-vida': { label: 'Ciclo de vida del contrato' },
  '/estimaciones/ambiente': { label: 'Estimación (recorrido por bloques)' },
};

// Lee el empresa_id del payload del JWT (sin verificar firma: solo para mostrar el chip). El JWT lo firma
// auth.controller (BLOQUE 1); SesionContext (congelado) no lo expone, así que se decodifica aquí. Falla a null.
function empresaIdDeToken(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const payload = JSON.parse(json);
    return payload && payload.empresa_id != null ? payload.empresa_id : null;
  } catch {
    return null;
  }
}

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

  // BLOQUE 4 — chip de empresa: empresa_id del JWT (BLOQUE 1) → nombre vía el catálogo público. Falla en
  // silencio (sin empresa → sin chip). No toca auth ni SesionContext (congelados).
  const [empresaNombre, setEmpresaNombre] = useState(null);
  useEffect(() => {
    const empId = token ? empresaIdDeToken(token) : null;
    if (empId == null) { setEmpresaNombre(null); return; }
    let vivo = true;
    api.listarEmpresas()
      .then((l) => {
        if (!vivo) return;
        const e = (Array.isArray(l) ? l : []).find((x) => x.id === empId);
        setEmpresaNombre(e ? e.nombre : null);
      })
      .catch(() => { if (vivo) setEmpresaNombre(null); });
    return () => { vivo = false; };
  }, [token]);

  // BLOQUE 4 — indicador discreto de HU (abajo-derecha): resuelve la pantalla actual a su HU/etiqueta.
  const { pathname } = useLocation();
  const huEntry = HU_POR_RUTA[pathname];
  const marco = RUTAS_MARCO[pathname];
  const huCode = (huEntry && huEntry.codigo) || (marco && marco.hu) || null;
  const pantallaNombre = (huEntry && huEntry.titulo) || (marco && marco.label) || null;

  // BLOQUE 4 — pop-ups de "Por firmar" y campana (mockup modo-sistema): al hacer clic se abre un
  // dropdown (NO una pantalla nueva). `drop` = cuál está abierto. Los datos de "Por firmar" salen del
  // backend real (HU-08, GET /bitacora/pendientes) sin tocar zona congelada.
  const [drop, setDrop] = useState(null); // 'firmar' | 'campana' | null
  const puedeFirmar = ['residente', 'contratista', 'supervision'].includes(rol);
  const [pendientes, setPendientes] = useState([]);
  useEffect(() => {
    if (!token || !puedeFirmar) { setPendientes([]); return; }
    let vivo = true;
    api.pendientesPorFirmar()
      .then((l) => {
        if (!vivo) return;
        const arr = Array.isArray(l) ? l : (l && Array.isArray(l.items) ? l.items : []);
        setPendientes(arr);
      })
      .catch(() => { if (vivo) setPendientes([]); });
    return () => { vivo = false; };
  }, [token, puedeFirmar, pathname]);
  // Al cambiar de pantalla, cierra cualquier dropdown abierto.
  useEffect(() => { setDrop(null); }, [pathname]);
  const toggleDrop = (cual) => setDrop((d) => (d === cual ? null : cual));

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

          {/* P9 (pulido UX 14-jun): se retiró el buscador global presentacional (no funcional) para no
              mostrar un control muerto en la demo; se recableará cuando exista la búsqueda global real. */}

          <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-shrink-0">
            {/* BLOQUE 4 — "Por firmar": al hacer clic abre un POP-UP (no navega), con los pendientes reales
                (HU-08). Solo para los roles que firman (residente/contratista/supervisión). */}
            {puedeFirmar && (
              <button
                type="button"
                onClick={() => toggleDrop('firmar')}
                aria-label="Por firmar"
                aria-expanded={drop === 'firmar'}
                title="Pendientes por firmar"
                data-testid="link-por-firmar"
                className="relative w-9 h-9 rounded-md hover:bg-white/10 transition-colors text-base leading-none flex items-center justify-center"
              >
                ✍️
                {pendientes.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-dorado text-guinda-dark text-[10px] font-bold flex items-center justify-center" data-testid="por-firmar-count">
                    {pendientes.length > 99 ? '99+' : pendientes.length}
                  </span>
                )}
              </button>
            )}
            {/* BLOQUE 4 — campana: al hacer clic abre un POP-UP de notificaciones (no navega). El badge
                `campana-atrasos` (conteo de conceptos con déficit, HU-07) conserva EXACTAMENTE su condición. */}
            <button
              type="button"
              onClick={() => toggleDrop('campana')}
              aria-label={!sinAccesoAtraso && atrasos > 0 ? `Notificaciones: ${atrasos} conceptos con déficit` : 'Notificaciones'}
              aria-expanded={drop === 'campana'}
              title="Notificaciones"
              className="relative w-9 h-9 rounded-md hover:bg-white/10 transition-colors text-base leading-none flex items-center justify-center"
            >
              🔔
              {!sinAccesoAtraso && atrasos > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-dorado text-guinda-dark text-[10px] font-bold flex items-center justify-center"
                  data-testid="campana-atrasos"
                >
                  {atrasos > 99 ? '99+' : atrasos}
                </span>
              )}
            </button>
            {/* BLOQUE 4 — chip de empresa (contexto de empresa del usuario, conecta con BLOQUE 1). */}
            {empresaNombre && (
              <span
                data-testid="chip-empresa"
                title={`Empresa: ${empresaNombre}`}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/30 text-xs font-medium whitespace-nowrap"
              >
                🏢 <span className="max-w-[10rem] truncate">{empresaNombre}</span>
              </span>
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

      {/* BLOQUE 4 — POP-UPS de "Por firmar" y campana. Solo se montan al abrir (drop != null); FUERA de
          <main>. Backdrop transparente cierra al hacer clic afuera. */}
      {drop && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDrop(null)} aria-hidden="true" data-testid="drop-backdrop" />
          <div
            data-testid={`drop-${drop}`}
            className="fixed right-3 top-14 z-50 w-80 max-w-[92vw] bg-white text-tinta rounded-lg shadow-xl border border-borde overflow-hidden"
          >
            {drop === 'firmar' ? (
              <div>
                <div className="px-4 py-2.5 border-b border-borde font-semibold text-sm flex items-center gap-2">✍️ Pendientes por firmar</div>
                {pendientes.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-tinta-ter text-center" data-testid="drop-firmar-vacio">No tienes pendientes por firmar.</div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto divide-y divide-borde">
                    {pendientes.slice(0, 6).map((p, i) => (
                      <li key={p.id || i} className="px-4 py-2.5 text-sm">
                        <div className="font-medium text-tinta truncate">{p.asunto || p.titulo || 'Nota / apertura de bitácora'}</div>
                        <div className="text-xs text-tinta-ter truncate">{[p.contrato_folio || p.folio, p.numero != null ? `folio #${p.numero}` : null, 'falta tu firma'].filter(Boolean).join(' · ')}</div>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/bitacora/por-firmar" onClick={() => setDrop(null)} className="block px-4 py-2.5 border-t border-borde text-sm font-semibold text-guinda hover:bg-guinda-soft" data-testid="drop-firmar-ir">Ir a «Por firmar» →</Link>
              </div>
            ) : (
              <div>
                <div className="px-4 py-2.5 border-b border-borde font-semibold text-sm flex items-center gap-2">🔔 Notificaciones</div>
                <ul className="divide-y divide-borde text-sm">
                  {puedeFirmar && (
                    <li className="px-4 py-2.5">
                      <div className="font-medium">{pendientes.length > 0 ? `Tienes ${pendientes.length} ${pendientes.length === 1 ? 'pendiente' : 'pendientes'} por firmar` : 'Sin pendientes por firmar'}</div>
                      <div className="text-xs text-tinta-ter">Bitácora (HU-08)</div>
                    </li>
                  )}
                  {!sinAccesoAtraso && (
                    <li className="px-4 py-2.5">
                      <div className="font-medium">{atrasos > 0 ? `${atrasos} concepto${atrasos === 1 ? '' : 's'} en atraso` : 'Sin conceptos en atraso'}</div>
                      <div className="text-xs text-tinta-ter">Seguimiento de avance (HU-07)</div>
                    </li>
                  )}
                  {sinAccesoAtraso && !puedeFirmar && (
                    <li className="px-4 py-6 text-tinta-ter text-center" data-testid="drop-campana-vacio">No tienes notificaciones.</li>
                  )}
                </ul>
                {!sinAccesoAtraso && (
                  <Link to="/seguimiento/alertas" onClick={() => setDrop(null)} className="block px-4 py-2.5 border-t border-borde text-sm font-semibold text-guinda hover:bg-guinda-soft" data-testid="drop-campana-ir">Ver alertas de atraso →</Link>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* BLOQUE 4 — indicador discreto de HU (abajo-derecha). FUERA de <main> a propósito: es navegación,
          no metadata académica del contenido. Muestra en qué pantalla/HU está el usuario. */}
      {pantallaNombre && (
        <div
          data-testid="indicador-hu"
          className="fixed right-4 bottom-3 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-tinta/85 text-white text-[11px] shadow-lg backdrop-blur-sm pointer-events-none"
        >
          <span className="opacity-80">Estás en</span>
          {huCode && (
            <span className="bg-dorado text-guinda-dark font-bold rounded px-1.5 py-0.5 text-[10px] tracking-wide">{huCode}</span>
          )}
          <span className="font-medium max-w-[16rem] truncate">{pantallaNombre}</span>
        </div>
      )}
    </div>
  );
}
