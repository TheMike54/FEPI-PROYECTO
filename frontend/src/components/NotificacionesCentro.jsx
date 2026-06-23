import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';
import { useContratoActivo } from '../context/ContratoActivoContext.jsx';
import { api } from '../services/api.js';

// FRENTE 4 — CENTRO DE NOTIFICACIONES. Panel/overlay (NO es una ruta nueva → no toca App.jsx, zona congelada)
// que LISTA y AGRUPA las notificaciones por TIPO (firmas / atrasos / solicitudes), cada una ACCIONABLE: al hacer
// clic lleva DIRECTO a su destino exacto (la apertura/nota a firmar, el concepto en atraso, la solicitud). Por
// defecto ACOTADO al contrato activo (interruptor "todos mis contratos"). Solo lectura; reusa los endpoints
// existentes + GET /api/alertas/detalle. Para un /notificaciones con URL propia haría falta una ruta en App.jsx
// (congelado) → lo deja para Maiki; este overlay entrega la misma función sin tocar el router.
const ROLES_FIRMA = ['residente', 'contratista', 'supervision'];

function Grupo({ icono, titulo, n, children }) {
  return (
    <section className="mb-4">
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-tinta-ter mb-1.5">
        <span>{icono}</span> {titulo} <span className="text-tinta-ter/70">({n})</span>
      </h3>
      <div className="rounded-md border border-borde bg-white overflow-hidden divide-y divide-borde">{children}</div>
    </section>
  );
}

function Item({ to, onClick, principal, secundario }) {
  return (
    <Link to={to} onClick={onClick} className="block px-4 py-2.5 hover:bg-guinda-soft transition-colors" data-testid="notif-item">
      <div className="text-sm text-tinta font-medium">{principal}</div>
      {secundario && <div className="text-[11px] text-tinta-ter mt-0.5">{secundario}</div>}
      <div className="text-[11px] font-semibold text-guinda mt-0.5">Atender →</div>
    </Link>
  );
}

function Vacio({ texto }) {
  return <div className="px-4 py-3 text-[12px] text-tinta-ter text-center">{texto}</div>;
}

export default function NotificacionesCentro({ open, onClose }) {
  const { rol, token } = useSesion();
  const { contratoId, contrato } = useContratoActivo();
  const puedeFirmar = ROLES_FIRMA.includes(rol);
  const esDependencia = rol === 'dependencia';
  const veAtrasos = rol === 'residente' || rol === 'supervision'; // HU-07 (residente E, supervisión C)
  const esContratista = rol === 'contratista'; // G5: estimaciones autorizadas por cobrar

  const [soloActivo, setSoloActivo] = useState(true);
  const [aperturas, setAperturas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [atrasos, setAtrasos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [porCobrar, setPorCobrar] = useState([]);
  const [cargando, setCargando] = useState(false);

  const scope = (soloActivo && contratoId) ? String(contratoId) : null;

  useEffect(() => {
    if (!open || !token) return;
    let vivo = true;
    setCargando(true);
    Promise.all([
      puedeFirmar ? api.pendientesPorFirmar().catch(() => []) : Promise.resolve([]),
      puedeFirmar ? api.notasPendientes().catch(() => []) : Promise.resolve([]),
      veAtrasos ? api.alertasDetalle(scope || undefined).catch(() => []) : Promise.resolve([]),
      esDependencia ? api.listarUsuarios('pendiente').catch(() => []) : Promise.resolve([]),
      esContratista ? api.porCobrar().catch(() => []) : Promise.resolve([]),
    ]).then(([ap, nt, at, so, pc]) => {
      if (!vivo) return;
      const f = (arr) => (scope ? arr.filter((x) => String(x.contrato_id) === scope) : arr);
      setAperturas(f(Array.isArray(ap) ? ap : []));
      setNotas(f(Array.isArray(nt) ? nt : []));
      setAtrasos(Array.isArray(at) ? at : []); // ya viene acotado por `scope` server-side
      setSolicitudes(Array.isArray(so) ? so : []);
      setPorCobrar(f(Array.isArray(pc) ? pc : []));
    }).finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [open, token, scope, puedeFirmar, veAtrasos, esDependencia, esContratista]);

  if (!open) return null;
  const totalFirmas = aperturas.length + notas.length;
  const total = totalFirmas + atrasos.length + (esDependencia ? solicitudes.length : 0) + (esContratista ? porCobrar.length : 0);

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/40" onClick={onClose} aria-hidden="true" data-testid="centro-backdrop" />
      <aside
        className="fixed right-0 top-0 bottom-0 z-[56] w-full max-w-md bg-pagina shadow-2xl border-l border-borde flex flex-col"
        role="dialog" aria-modal="true" aria-label="Centro de notificaciones" data-testid="centro-notificaciones"
      >
        <header className="flex items-center gap-2 px-4 h-14 border-b border-borde bg-white flex-shrink-0">
          <span className="text-base">🔔</span>
          <h2 className="text-sm font-semibold text-tinta">Centro de notificaciones</h2>
          <span className="text-[11px] text-tinta-ter">({total})</span>
          <button type="button" onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-pagina text-tinta-ter" aria-label="Cerrar" data-testid="centro-cerrar">✕</button>
        </header>

        {/* Filtro por contrato activo (acota las consultas). */}
        {contratoId && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-borde bg-white text-xs flex-shrink-0">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={soloActivo} onChange={(e) => setSoloActivo(e.target.checked)} data-testid="centro-solo-activo" />
              <span className="text-tinta-sec">Solo el contrato activo{contrato?.folio ? `: ${contrato.folio}` : ''}</span>
            </label>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {cargando ? (
            <p className="text-sm text-tinta-ter text-center py-6">Cargando…</p>
          ) : total === 0 ? (
            <div className="text-center py-10" data-testid="centro-vacio">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm text-tinta-sec">No tienes notificaciones{scope ? ' en este contrato' : ''}.</p>
            </div>
          ) : (
            <>
              {puedeFirmar && (
                <Grupo icono="✍️" titulo="Por firmar" n={totalFirmas}>
                  {totalFirmas === 0 ? <Vacio texto="Sin pendientes por firmar." /> : (
                    <>
                      {aperturas.map((a) => (
                        <Item key={`ap-${a.apertura_id}`} to={`/bitacora/por-firmar?contrato=${a.contrato_id}`} onClick={onClose}
                          principal={`Apertura de bitácora — ${a.folio || 'contrato'}`}
                          secundario={a.objeto ? `${a.objeto}` : 'Firma de la apertura'} />
                      ))}
                      {notas.map((n) => (
                        <Item key={`nt-${n.id}`} to={`/bitacora/notas?contrato=${n.contrato_id}`} onClick={onClose}
                          principal={`Nota #${n.numero} — ${n.contrato_folio || 'contrato'}`}
                          secundario={n.asunto || n.tipo_etiqueta || 'Bitácora · nota'} />
                      ))}
                    </>
                  )}
                </Grupo>
              )}

              {veAtrasos && (
                <Grupo icono="⚠️" titulo="Conceptos en atraso" n={atrasos.length}>
                  {atrasos.length === 0 ? <Vacio texto="Sin conceptos en atraso." /> : atrasos.map((a) => (
                    <Item key={`at-${a.contrato_concepto_id}`} to={`/seguimiento/alertas?contrato=${a.contrato_id}&concepto=${a.contrato_concepto_id}`} onClick={onClose}
                      principal={a.concepto_label}
                      secundario={`${a.folio || ''} · déficit ${a.deficit} ${a.unidad || ''}`.trim()} />
                  ))}
                </Grupo>
              )}

              {esDependencia && (
                <Grupo icono="📝" titulo="Solicitudes de registro" n={solicitudes.length}>
                  {solicitudes.length === 0 ? <Vacio texto="Sin solicitudes de registro pendientes." /> : solicitudes.map((u) => (
                    <Item key={`so-${u.id}`} to="/usuarios/solicitudes" onClick={onClose}
                      principal={u.nombre || u.email || 'Solicitud de acceso'}
                      secundario={`${u.rol || ''}${u.email ? ` · ${u.email}` : ''}`.trim() || 'Alta de cuenta por aprobar'} />
                  ))}
                </Grupo>
              )}

              {esContratista && (
                <Grupo icono="💸" titulo="Estimaciones por cobrar" n={porCobrar.length}>
                  {porCobrar.length === 0 ? <Vacio texto="Sin estimaciones autorizadas por presentar a cobro." /> : porCobrar.map((e) => (
                    <Item key={`pc-${e.estimacion_id}`} to={`/pagos/ambiente?contrato=${e.contrato_id}`} onClick={onClose}
                      principal={`Estimación #${e.estimacion_numero} autorizada — presenta documentos a cobro`}
                      secundario={`${e.folio || 'contrato'} · neto $${e.neto}`} />
                  ))}
                </Grupo>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
