import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { fechaHora } from '../utils/formato.js';

const ROL_LABEL = { residente: 'Residente de obra', superintendente: 'Superintendente (contratista)', supervision: 'Supervisión' };
// fechaHora: utilidad compartida (utils/formato.js)

export default function PorFirmar() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;
  // BLOQUE D — deep-link desde la campana/centro: resalta las filas del contrato indicado en ?contrato.
  const [sp] = useSearchParams();
  const contratoQuery = sp.get('contrato');
  const [pendientes, setPendientes] = useState([]);
  const [notas, setNotas] = useState([]); // H1 (25-jun): notas de bitácora pendientes de firma (antes solo aperturas)
  const [cargando, setCargando] = useState(false);
  const [firmando, setFirmando] = useState(null);
  const [firmandoNota, setFirmandoNota] = useState(null); // H1

  const cargar = useCallback(async () => {
    if (sinSesion) return;
    setCargando(true);
    try {
      // H1 (25-jun): la bandeja "Por firmar" ahora también lista las NOTAS pendientes de firma (no solo aperturas).
      const [l, ns] = await Promise.all([api.pendientesPorFirmar(), api.notasPendientes()]);
      setPendientes(Array.isArray(l) ? l : []);
      setNotas(Array.isArray(ns) ? ns : []);
    } catch (e) { showToast('No se pudieron cargar tus pendientes'); }
    finally { setCargando(false); }
  }, [sinSesion, showToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const firmar = async (aperturaId) => {
    setFirmando(aperturaId);
    try {
      const r = await api.firmarApertura(aperturaId);
      showToast(r.completa ? 'Firmaste. La apertura quedó COMPLETA.' : 'Firmaste tu parte. Faltan otras firmas.');
      setPendientes((prev) => prev.filter((x) => x.apertura_id !== aperturaId));
    } catch (err) {
      if (err.status === 409) showToast('Ya habías firmado esta apertura');
      else if (err.status === 403) showToast('No eres firmante de esta apertura');
      else showToast(err.message || 'No se pudo firmar');
      cargar();
    } finally { setFirmando(null); }
  };

  // H1 (25-jun): firmar (aceptar) una NOTA pendiente desde la misma bandeja.
  const firmarNotaFn = async (notaId) => {
    setFirmandoNota(notaId);
    try {
      await api.firmarNota(notaId);
      showToast('Firmaste la nota.');
      setNotas((prev) => prev.filter((x) => x.id !== notaId));
    } catch (err) {
      if (err.status === 409) showToast(err.message || 'La nota ya está firmada o su plazo venció');
      else if (err.status === 403) showToast('No eres firmante de esta nota');
      else showToast(err.message || 'No se pudo firmar la nota');
      cargar();
    } finally { setFirmandoNota(null); }
  };

  // P1-8 (26-jun): si la cola llega ACOTADA a un contrato (?contrato=), se muestran SOLO los pendientes de
  // ese contrato (el profe: "ya solo trabajas con ese contrato"). Sin parámetro = vista global (legado).
  const pendientesVis = contratoQuery ? pendientes.filter((p) => String(p.contrato_id) === contratoQuery) : pendientes;
  const notasVis = contratoQuery ? notas.filter((n) => String(n.contrato_id) === contratoQuery) : notas;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Bitácora' }, { label: 'Por firmar' }]} />
      <h1 className="text-2xl font-bold text-sigecop-blue mb-2">Por firmar — aperturas y notas de bitácora</h1>
      {contratoQuery && (
        <p className="text-xs text-slate-500 mb-2" data-testid="por-firmar-acotado">
          Mostrando solo el contrato activo. <a href="/bitacora/por-firmar" className="text-sigecop-accent hover:underline">Ver todos</a>
        </p>
      )}

      {sinSesion ? (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-6 text-center text-sm text-slate-600">
          Inicia sesión en modo aplicación para ver tus firmas pendientes.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <p className="text-sm text-slate-600 max-w-2xl">
              Aperturas de bitácora donde eres firmante y aún no firmas. Firmas <strong>tu propia parte</strong> desde tu cuenta; nadie firma por otro.
            </p>
            <button type="button" onClick={cargar} className="text-sm text-sigecop-accent hover:underline" disabled={cargando}>↻ Recargar</button>
          </div>

          {cargando && <p className="text-sm text-slate-500">Cargando…</p>}

          {!cargando && pendientesVis.length === 0 && notasVis.length === 0 && (
            <div data-testid="por-firmar-vacio" className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No tienes firmas pendientes.
            </div>
          )}

          {!cargando && pendientesVis.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden" data-testid="por-firmar-panel">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Folio</th>
                    <th className="text-left px-4 py-3">Objeto</th>
                    <th className="text-left px-4 py-3">Tu parte</th>
                    <th className="text-left px-4 py-3">Aperturada</th>
                    <th className="text-right px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendientesVis.map((p) => (
                    <tr key={p.apertura_id} data-testid="fila-por-firmar" data-folio={p.folio} data-contrato={p.contrato_id}
                      className={String(p.contrato_id) === contratoQuery ? 'bg-sigecop-blue-light' : undefined}>
                      <td className="px-4 py-3 font-mono text-xs">{p.folio}</td>
                      <td className="px-4 py-3">{p.objeto}</td>
                      <td className="px-4 py-3">{ROL_LABEL[p.rol_en_firma] || p.rol_en_firma}</td>
                      <td className="px-4 py-3 text-slate-600">{fechaHora(p.apertura_en)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" data-testid="btn-firmar" onClick={() => firmar(p.apertura_id)} disabled={firmando === p.apertura_id}
                          className="px-3 py-1.5 rounded-md bg-sigecop-blue text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                          {firmando === p.apertura_id ? 'Firmando…' : 'Firmar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* H1 (25-jun) — NOTAS de bitácora pendientes de firma (no solo aperturas). */}
          {!cargando && notasVis.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden mt-6" data-testid="por-firmar-notas-panel">
              <div className="px-4 py-2 bg-slate-50 text-xs uppercase tracking-wider text-slate-600 font-semibold">Notas de bitácora pendientes de firma</div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Contrato</th>
                    <th className="text-left px-4 py-3">Nota</th>
                    <th className="text-left px-4 py-3">Asunto</th>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-right px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notasVis.map((n) => (
                    <tr key={`nt-${n.id}`} data-testid="fila-nota-por-firmar" data-folio={n.contrato_folio} data-contrato={n.contrato_id}
                      className={String(n.contrato_id) === contratoQuery ? 'bg-sigecop-blue-light' : undefined}>
                      <td className="px-4 py-3 font-mono text-xs">{n.contrato_folio}</td>
                      <td className="px-4 py-3">#{n.numero} · {n.tipo_etiqueta || n.tipo}</td>
                      <td className="px-4 py-3 text-slate-700">{n.asunto || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{fechaHora(n.fecha)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" data-testid="btn-firmar-nota" onClick={() => firmarNotaFn(n.id)} disabled={firmandoNota === n.id}
                          className="px-3 py-1.5 rounded-md bg-sigecop-blue text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                          {firmandoNota === n.id ? 'Firmando…' : 'Firmar nota'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
