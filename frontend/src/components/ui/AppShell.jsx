import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSesion, useVistaHU } from '../../context/SesionContext.jsx';
import { ROLES } from '../../data/permisos.js';
import { historiasUsuario } from '../../data/dummy.js';
import { api } from '../../services/api.js';
import Sidebar from '../layout/Sidebar.jsx';
import { useContratoActivo } from '../../context/ContratoActivoContext.jsx';
import ModalContratoActivo from '../ModalContratoActivo.jsx';
import NotificacionesCentro from '../NotificacionesCentro.jsx';

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
  '/contratos/cierre': { label: 'Cierre' },
  '/admin/empresas': { label: 'Padrón de empresas' },
  '/bitacora/ambiente': { label: 'Bitácora' },
  '/contratos/expediente-ambiente': { label: 'Expediente' },
  '/seguimiento/ambiente': { label: 'Avance' },
  '/pagos/ambiente': { label: 'Pago' },
  '/contratos/convenio-ambiente': { label: 'Convenio' },
  '/contratos/ciclo-vida': { label: 'Ciclo de vida del contrato' },
  '/estimaciones/ambiente': { label: 'Estimación' },
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

// FIX 2.4 — etiquetas legibles del tipo/estado de empresa (crudos del catálogo) para el dropdown "mi info".
const EMPRESA_TIPO = { dependencia: 'Dependencia', contratista: 'Contratista', supervision: 'Supervisión' };
const EMPRESA_ESTADO = { validada: 'Validada', por_validar: 'Por validar' };

export default function AppShell({ children }) {
  const { rol, usuario, token, logout } = useSesion();
  const { contrato, contratoId, pedirCambio, olvidarContrato } = useContratoActivo();
  const rolActivo = ROLES.find((r) => r.id === rol);

  // O5 (HU-07 v2): badge de la campana = conceptos con déficit (acotado por participación). Solo para
  // los roles con acceso a HU-07 (residente/supervisión); las demás cuentas no lo consultan ni lo ven.
  const { sinAcceso: sinAccesoAtraso } = useVistaHU('HU-07');
  const [atrasos, setAtrasos] = useState(0);
  const [atrasoItems, setAtrasoItems] = useState([]); // FRENTE 4 — filas accionables de atraso (acotadas al contrato activo)
  useEffect(() => {
    if (!token || sinAccesoAtraso) { setAtrasos(0); return; }
    let vivo = true;
    api.resumenAtrasos()
      .then((r) => { if (vivo) setAtrasos(Number(r?.conceptos || 0)); })
      .catch(() => { if (vivo) setAtrasos(0); });
    return () => { vivo = false; };
  }, [token, sinAccesoAtraso]);
  // FRENTE 4 — detalle accionable de atrasos para los accesos directos de la campana (acotado al CONTRATO ACTIVO).
  useEffect(() => {
    if (!token || sinAccesoAtraso) { setAtrasoItems([]); return; }
    let vivo = true;
    api.alertasDetalle(contratoId || undefined)
      .then((l) => { if (vivo) setAtrasoItems(Array.isArray(l) ? l : []); })
      .catch(() => { if (vivo) setAtrasoItems([]); });
    return () => { vivo = false; };
  }, [token, sinAccesoAtraso, contratoId]);

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
  const [drop, setDrop] = useState(null); // 'firmar' | 'campana' | 'miinfo' | null
  const [centro, setCentro] = useState(false); // FRENTE 4 — overlay del centro de notificaciones
  const puedeFirmar = ['residente', 'contratista', 'supervision'].includes(rol);

  // FRENTE 5 — sidebar colapsable. Default ABIERTO (la suite e2e exige el <aside> visible: enterAppMode espera
  // 'aside' visible y goToViaSidebar clica 'aside a[href]'). El toggle solo cambia el ANCHO; el <aside> NUNCA se
  // desmonta. Persistencia en localStorage. Solo presentación de marco; no toca rutas ni gating.
  const [sbAbierto, setSbAbierto] = useState(() => {
    try { return localStorage.getItem('sigecop:sidebar') !== 'cerrado'; } catch { return true; }
  });
  const toggleSidebar = () => setSbAbierto((v) => {
    const n = !v;
    try { localStorage.setItem('sigecop:sidebar', n ? 'abierto' : 'cerrado'); } catch { /* noop */ }
    return n;
  });

  // FIX 2.4 — perfil propio (nombre/rol/empresa nombre+tipo+estado/correo) para el dropdown "mi info". El
  // email y el tipo/estado de empresa no viajan en el JWT → se piden a GET /api/yo. Falla en silencio.
  const [perfil, setPerfil] = useState(null);
  useEffect(() => {
    if (!token) { setPerfil(null); return; }
    let vivo = true;
    api.miPerfil().then((p) => { if (vivo) setPerfil(p); }).catch(() => { if (vivo) setPerfil(null); });
    return () => { vivo = false; };
  }, [token]);
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

  // FIX 2.5 — campana UNIFICADA: además de las aperturas por firmar (`pendientes`), las NOTAS por firmar
  // (GET /api/notas-pendientes) y —solo dependencia— las solicitudes de registro pendientes. Falla en silencio.
  const esDependencia = rol === 'dependencia';
  const [notasFirma, setNotasFirma] = useState([]);
  const [solicitudes, setSolicitudes] = useState(0);
  useEffect(() => {
    if (!token || !puedeFirmar) { setNotasFirma([]); return; }
    let vivo = true;
    api.notasPendientes().then((l) => { if (vivo) setNotasFirma(Array.isArray(l) ? l : []); }).catch(() => { if (vivo) setNotasFirma([]); });
    return () => { vivo = false; };
  }, [token, puedeFirmar, pathname]);
  useEffect(() => {
    if (!token || !esDependencia) { setSolicitudes(0); return; }
    let vivo = true;
    api.listarUsuarios('pendiente').then((l) => { if (vivo) setSolicitudes(Array.isArray(l) ? l.length : 0); }).catch(() => { if (vivo) setSolicitudes(0); });
    return () => { vivo = false; };
  }, [token, esDependencia, pathname]);
  // G5 (23-jun, profe): estimaciones AUTORIZADAS sin instrucción de pago → notificación al CONTRATISTA
  // "ve a presentar documentos a cobro" (la orden la promueve él; art. 54 LOPSRM). Falla en silencio.
  const esContratista = rol === 'contratista';
  const [porCobrar, setPorCobrar] = useState([]);
  useEffect(() => {
    if (!token || !esContratista) { setPorCobrar([]); return; }
    let vivo = true;
    api.porCobrar().then((l) => { if (vivo) setPorCobrar(Array.isArray(l) ? l : []); }).catch(() => { if (vivo) setPorCobrar([]); });
    return () => { vivo = false; };
  }, [token, esContratista, pathname]);
  const totalFirmas = pendientes.length + notasFirma.length;                       // aperturas + notas
  const totalNotif = (sinAccesoAtraso ? 0 : atrasos) + totalFirmas + solicitudes + porCobrar.length;  // badge unificado de la campana

  // FRENTE 4 — accesos DIRECTOS por ítem (acotados al contrato activo): cada uno lleva a su destino EXACTO.
  const scopeId = contratoId ? String(contratoId) : null;
  const enContrato = (cid) => !scopeId || String(cid) === scopeId;
  const itemsRapidos = [
    ...pendientes.filter((p) => enContrato(p.contrato_id)).map((p) => ({
      key: `ap-${p.apertura_id}`, icono: '✍️', texto: `Firmar apertura — ${p.folio || 'contrato'}`,
      sub: p.objeto || 'Bitácora · apertura', to: `/bitacora/por-firmar?contrato=${p.contrato_id}`,
    })),
    ...notasFirma.filter((n) => enContrato(n.contrato_id)).map((n) => ({
      key: `nt-${n.id}`, icono: '✍️', texto: `Firmar nota #${n.numero} — ${n.contrato_folio || 'contrato'}`,
      sub: n.asunto || 'Bitácora · nota', to: `/bitacora/consulta?contrato=${n.contrato_id}`,
    })),
    ...(sinAccesoAtraso ? [] : atrasoItems.filter((a) => enContrato(a.contrato_id)).map((a) => ({
      key: `at-${a.contrato_concepto_id}`, icono: '⚠️', texto: `Atraso: ${a.concepto_label}`,
      sub: `${a.folio || ''} · déficit ${a.deficit} ${a.unidad || ''}`.trim(),
      to: `/seguimiento/alertas?contrato=${a.contrato_id}&concepto=${a.contrato_concepto_id}`,
    }))),
    // G5: estimaciones autorizadas listas para que el contratista presente documentos a cobro.
    ...porCobrar.filter((e) => enContrato(e.contrato_id)).map((e) => ({
      key: `pc-${e.estimacion_id}`, icono: '💸', texto: `Estimación #${e.estimacion_numero} autorizada — presenta documentos a cobro`,
      sub: `${e.folio || 'contrato'} · neto $${e.neto}`, to: `/pagos/ambiente?contrato=${e.contrato_id}`,
    })),
  ].slice(0, 6);

  // Al cambiar de pantalla, cierra cualquier dropdown abierto.
  useEffect(() => { setDrop(null); }, [pathname]);
  const toggleDrop = (cual) => setDrop((d) => (d === cual ? null : cual));

  return (
    <div className="h-screen flex flex-col bg-pagina">
      <header className="bg-guinda text-white h-14 flex-shrink-0 border-b-[3px] border-dorado">
        <div className="h-full px-4 sm:px-6 flex items-center gap-4">
          {/* FRENTE 5 — botón de colapsar/mostrar el sidebar (default abierto; no desmonta el aside). */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sbAbierto ? 'Ocultar el menú' : 'Mostrar el menú'}
            aria-expanded={sbAbierto}
            title={sbAbierto ? 'Ocultar el menú' : 'Mostrar el menú'}
            data-testid="btn-toggle-sidebar"
            className="w-9 h-9 rounded-md hover:bg-white/10 transition-colors flex items-center justify-center text-lg leading-none flex-shrink-0"
          >
            ☰
          </button>
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

          {/* INDICADOR DE HISTORIA (HU) — visible en TODA pantalla (la barra superior siempre está). Chip
              dorado prominente a la derecha del logo: muestra la HU + el nombre de la pantalla actual. Cubre
              también las pantallas que NO son de un ciclo (donde no hay barra de pestañas con su propio chip). */}
          {(huCode || pantallaNombre) && (
            <span
              data-testid="indicador-hu-top"
              title={`Estás en: ${pantallaNombre || ''}${huCode ? ` (${huCode})` : ''}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-dorado text-guinda-dark text-xs font-semibold whitespace-nowrap max-w-[18rem] truncate flex-shrink-0"
            >
              📍 {huCode && <span>{huCode}</span>}
              {huCode && pantallaNombre ? <span className="font-normal opacity-80"> · {pantallaNombre}</span> : (!huCode && <span>{pantallaNombre}</span>)}
            </span>
          )}

          {/* P9 (pulido UX 14-jun): se retiró el buscador global presentacional (no funcional) para no
              mostrar un control muerto en la demo; se recableará cuando exista la búsqueda global real. */}

          <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-shrink-0">
            {/* FIX 8 (3B) — notificaciones UNIFICADAS en la campana: se retiró el botón ✍️ "Por firmar"
                separado (su badge duplicaba el conteo de la campana y confundía). El acceso a "Por firmar"
                vive ahora dentro del pop-up de la campana (footer "Ir a «Por firmar» →"). */}
            {/* BLOQUE 4 — campana: al hacer clic abre un POP-UP de notificaciones (no navega). El badge
                `campana-atrasos` (conteo de conceptos con déficit, HU-07) conserva EXACTAMENTE su condición. */}
            <button
              type="button"
              onClick={() => toggleDrop('campana')}
              aria-label={totalNotif > 0 ? `Notificaciones: ${totalNotif}` : 'Notificaciones'}
              aria-expanded={drop === 'campana'}
              title="Notificaciones"
              className="relative w-9 h-9 rounded-md hover:bg-white/10 transition-colors text-base leading-none flex items-center justify-center"
            >
              🔔
              {/* FIX 2.5 — badge UNIFICADO (firmas + atrasos + solicitudes). data-testid conservado. */}
              {totalNotif > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-dorado text-guinda-dark text-[10px] font-bold flex items-center justify-center"
                  data-testid="campana-atrasos"
                >
                  {totalNotif > 99 ? '99+' : totalNotif}
                </span>
              )}
            </button>
            {/* 3A · P2 — chip del CONTRATO ACTIVO (clic = "Cambiar de contrato" → reabre el modal). */}
            {contratoId && (
              <button
                type="button"
                onClick={pedirCambio}
                data-testid="chip-contrato-activo"
                title={`Contrato activo: ${contrato?.folio || ''} · clic para cambiar`}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 border border-white/30 text-xs font-medium whitespace-nowrap hover:bg-white/25 transition"
              >
                📄 <span className="max-w-[10rem] truncate">{contrato?.folio || 'Contrato'}</span> <span className="opacity-70">▾</span>
              </button>
            )}
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
            {/* FIX 2.4 — el avatar abre el pop-up "mi info / mi empresa" (reusa el mismo mecanismo de drop). */}
            <button
              type="button"
              onClick={() => toggleDrop('miinfo')}
              aria-label="Mi información"
              aria-expanded={drop === 'miinfo'}
              data-testid="btn-mi-info"
              className="w-8 h-8 rounded-full bg-dorado text-guinda-dark flex items-center justify-center text-xs font-bold flex-shrink-0 hover:ring-2 hover:ring-white/40 transition"
              title={usuario?.nombre || rolActivo?.nombre}
            >
              {iniciales(usuario?.nombre || rolActivo?.nombre)}
            </button>
            <button
              type="button"
              onClick={() => { olvidarContrato(); logout(); }}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar abierto={sbAbierto} />
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
            {drop === 'miinfo' ? (
              <div>
                {/* FIX 2.4 — mi info / mi empresa. */}
                <div className="px-4 py-2.5 border-b border-borde font-semibold text-sm flex items-center gap-2">👤 Mi información</div>
                <dl className="px-4 py-3 text-sm space-y-2.5">
                  <div><dt className="text-[11px] text-tinta-ter uppercase tracking-wide">Nombre</dt><dd className="font-medium text-tinta">{perfil?.nombre || usuario?.nombre || '—'}</dd></div>
                  <div><dt className="text-[11px] text-tinta-ter uppercase tracking-wide">Rol</dt><dd className="text-tinta">{rolActivo?.nombre || perfil?.rol || '—'}</dd></div>
                  <div><dt className="text-[11px] text-tinta-ter uppercase tracking-wide">Correo</dt><dd className="text-tinta truncate" data-testid="mi-info-correo">{perfil?.email || '—'}</dd></div>
                  <div>
                    <dt className="text-[11px] text-tinta-ter uppercase tracking-wide">Empresa</dt>
                    <dd className="text-tinta" data-testid="mi-info-empresa">
                      {perfil?.empresa ? (
                        <span>{perfil.empresa.nombre} <span className="text-xs text-tinta-ter">· {EMPRESA_TIPO[perfil.empresa.tipo] || perfil.empresa.tipo} · {EMPRESA_ESTADO[perfil.empresa.estado] || perfil.empresa.estado}</span></span>
                      ) : (
                        <span className="text-tinta-ter">Sin empresa asignada</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div>
                <div className="px-4 py-2.5 border-b border-borde font-semibold text-sm flex items-center gap-2">🔔 Notificaciones</div>
                {/* FIX 2.5 — centro unificado agrupado por tipo: Firmas / Atrasos / Solicitudes. */}
                <ul className="divide-y divide-borde text-sm">
                  {puedeFirmar && (
                    <li className="px-4 py-2.5" data-testid="drop-campana-firmas">
                      <div className="font-medium">{totalFirmas > 0 ? `Tienes ${totalFirmas} ${totalFirmas === 1 ? 'pendiente' : 'pendientes'} por firmar` : 'Sin pendientes por firmar'}</div>
                      <div className="text-xs text-tinta-ter">Bitácora — firmas (art. 123 fr. III RLOPSRM)</div>
                    </li>
                  )}
                  {!sinAccesoAtraso && (
                    <li className="px-4 py-2.5">
                      <div className="font-medium">{atrasos > 0 ? `${atrasos} concepto${atrasos === 1 ? '' : 's'} en atraso` : 'Sin conceptos en atraso'}</div>
                      <div className="text-xs text-tinta-ter">Seguimiento de avance (HU-07)</div>
                    </li>
                  )}
                  {esDependencia && (
                    <li className="px-4 py-2.5" data-testid="drop-campana-solicitudes">
                      <div className="font-medium">{solicitudes > 0 ? `${solicitudes} solicitud${solicitudes === 1 ? '' : 'es'} de registro pendiente${solicitudes === 1 ? '' : 's'}` : 'Sin solicitudes de registro pendientes'}</div>
                      <div className="text-xs text-tinta-ter">Altas de cuenta por aprobar</div>
                    </li>
                  )}
                  {!puedeFirmar && sinAccesoAtraso && !esDependencia && (
                    <li className="px-4 py-6 text-tinta-ter text-center" data-testid="drop-campana-vacio">No tienes notificaciones.</li>
                  )}
                </ul>
                {/* FRENTE 4 — accesos DIRECTOS por ítem (vista rápida; el detalle completo va en el Centro). Cada
                    enlace lleva al punto exacto: la apertura/nota a firmar o el concepto en atraso. */}
                {itemsRapidos.length > 0 && (
                  <ul className="divide-y divide-borde text-sm border-t border-borde max-h-64 overflow-y-auto" data-testid="drop-campana-items">
                    {itemsRapidos.map((it) => (
                      <li key={it.key}>
                        <Link to={it.to} onClick={() => setDrop(null)} className="block px-4 py-2 hover:bg-guinda-soft">
                          <span className="mr-1.5">{it.icono}</span><span className="font-medium text-tinta">{it.texto}</span>
                          {it.sub && <span className="block text-[11px] text-tinta-ter truncate">{it.sub}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => { setDrop(null); setCentro(true); }} className="block w-full text-left px-4 py-2.5 border-t border-borde text-sm font-semibold text-guinda hover:bg-guinda-soft" data-testid="drop-ver-todas">Ver todas las notificaciones →</button>
                {puedeFirmar && (
                  <Link to="/bitacora/por-firmar" onClick={() => setDrop(null)} className="block px-4 py-2.5 border-t border-borde text-sm font-semibold text-guinda hover:bg-guinda-soft" data-testid="drop-firmar-ir">Ir a «Por firmar» →</Link>
                )}
                {!sinAccesoAtraso && (
                  <Link to="/seguimiento/alertas" onClick={() => setDrop(null)} className="block px-4 py-2.5 border-t border-borde text-sm font-semibold text-guinda hover:bg-guinda-soft" data-testid="drop-campana-ir">Ver alertas de atraso →</Link>
                )}
                {esDependencia && (
                  <Link to="/usuarios/solicitudes" onClick={() => setDrop(null)} className="block px-4 py-2.5 border-t border-borde text-sm font-semibold text-guinda hover:bg-guinda-soft" data-testid="drop-solicitudes-ir">Ver solicitudes de registro →</Link>
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
          <span className="font-medium max-w-[16rem] truncate">{pantallaNombre}{huCode ? ` · ${huCode}` : ''}</span>
        </div>
      )}
      {/* 3A · P1 — modal bloqueante "Elige tu contrato" (con salidas a Portafolio y Cerrar sesión). */}
      <ModalContratoActivo />
      {/* FRENTE 4 — centro de notificaciones (overlay; sin ruta nueva para no tocar App.jsx congelado). */}
      <NotificacionesCentro open={centro} onClose={() => setCentro(false)} />
    </div>
  );
}
