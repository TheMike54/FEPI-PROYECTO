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
  const [cargando, setCargando] = useState(false);
  const [firmando, setFirmando] = useState(null);

  const cargar = useCallback(async () => {
    if (sinSesion) return;
    setCargando(true);
    try { const l = await api.pendientesPorFirmar(); setPendientes(Array.isArray(l) ? l : []); }
    catch (e) { showToast('No se pudieron cargar tus pendientes'); }
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

  return (
    <div>
      <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Bitácora' }, { label: 'Por firmar' }]} />
      <h1 className="text-2xl font-bold text-sigecop-blue mb-2">Por firmar — aperturas de bitácora</h1>

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

          {!cargando && pendientes.length === 0 && (
            <div data-testid="por-firmar-vacio" className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No tienes firmas pendientes.
            </div>
          )}

          {!cargando && pendientes.length > 0 && (
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
                  {pendientes.map((p) => (
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
        </>
      )}
    </div>
  );
}
