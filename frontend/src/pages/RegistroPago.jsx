import { useState, useEffect, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-21 ENDURECIDO: el pago se AMARRA a una estimación REAL del contrato (estimacion_id); el
// importe = NETO de esa estimación (read-only, derivado del servidor, no se teclea); no se paga
// dos veces; al registrar, la estimación pasa a 'pagada' (CA-1). El actor sale del JWT (CA-2).

const mxn = (n) => `$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (s) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return (y && m && d) ? `${d}/${m}/${y}` : '—'; };
const PAGABLES = new Set(['integrada', 'autorizada']);

export default function RegistroPago() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-21');
  const { showToast } = useToast();
  const sinSesion = !token;
  const hoy = new Date().toISOString().slice(0, 10);

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [estimaciones, setEstimaciones] = useState([]); // estimaciones PAGABLES del contrato
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [ultimo, setUltimo] = useState(null);

  // Formulario
  const [estimacionId, setEstimacionId] = useState('');
  const [fechaPago, setFechaPago] = useState(hoy);
  const [referencia, setReferencia] = useState('');
  const [facturaCfdi, setFacturaCfdi] = useState('');
  const [fechaFactura, setFechaFactura] = useState('');
  const [fechaAutorizacion, setFechaAutorizacion] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const estSel = estimaciones.find((e) => String(e.id) === String(estimacionId)) || null;
  const importeNeto = estSel ? estSel.neto : null; // el importe lo DERIVA el servidor del neto

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const cargarPagos = useCallback(async (cid) => {
    setCargando(true);
    try { setPagos(await api.listarPagos(cid)); }
    catch (e) { showToast(e.status === 403 ? 'No tienes acceso a los pagos de este contrato' : 'No se pudieron cargar los pagos'); setPagos([]); }
    finally { setCargando(false); }
  }, [showToast]);

  const cargarEstimaciones = useCallback(async (cid) => {
    try {
      const list = await api.estimacionesDeContrato(cid);
      setEstimaciones((Array.isArray(list) ? list : []).filter((e) => PAGABLES.has(e.estado)));
    } catch (e) { setEstimaciones([]); }
  }, []);

  const seleccionar = useCallback(async (id) => {
    setContratoId(id); setPagos([]); setEstimaciones([]); setEstimacionId(''); setUltimo(null);
    if (!id) return;
    await Promise.all([cargarPagos(id), cargarEstimaciones(id)]);
  }, [cargarPagos, cargarEstimaciones]);

  const requeridosOk = estimacionId && fechaPago && referencia.trim() && facturaCfdi.trim() && fechaFactura;
  const puedeRegistrar = !soloLectura && !!contratoId && requeridosOk && !registrando;

  const limpiar = () => {
    setEstimacionId(''); setReferencia(''); setFacturaCfdi('');
    setFechaFactura(''); setFechaAutorizacion(''); setObservaciones(''); setFechaPago(hoy);
  };

  const registrar = async () => {
    if (!contratoId) { showToast('Selecciona un contrato'); return; }
    if (!estimacionId) { showToast('Selecciona la estimación a pagar'); return; }
    setRegistrando(true);
    try {
      // El importe NO se envía: el servidor lo deriva del neto de la estimación (no arbitrario).
      const payload = {
        contrato_id: Number(contratoId),
        estimacion_id: Number(estimacionId),
        fecha_pago: fechaPago,
        referencia: referencia.trim(),
        factura_cfdi: facturaCfdi.trim(),
        fecha_factura: fechaFactura,
        fecha_autorizacion: fechaAutorizacion || undefined,
        observaciones: observaciones.trim() || undefined
      };
      const creado = await api.registrarPago(payload);
      setUltimo({ ref: creado.estimacion_ref, fecha: fmtFecha(creado.fecha_pago), importe: creado.importe });
      showToast('Pago registrado · la estimación quedó marcada como pagada');
      limpiar();
      await Promise.all([cargarPagos(contratoId), cargarEstimaciones(contratoId)]);
    } catch (e) {
      showToast(e.message || 'No se pudo registrar el pago');
    } finally { setRegistrando(false); }
  };

  return (
    <div>
      <HeaderVista
        huId="HU-21"
        titulo="Registro del pago efectuado"
        sprint="Sprint 2"
        rolAcademico="Finanzas"
        descripcion="Registra el pago de una ESTIMACIÓN del contrato. El importe = neto de la estimación (no se teclea). Quien registra se toma de tu sesión (art. 54 LOPSRM)."
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Pagos' }, { label: 'Registro de pago' }]}
      />

      {sinSesion ? (
        <div className="bg-pagina border border-borde rounded-md px-4 py-6 text-center text-sm text-slate-600">
          Inicia sesión en modo aplicación para registrar o consultar pagos.
        </div>
      ) : (
        <>
          <div className="bg-white border border-borde rounded-lg p-4 mb-6 max-w-2xl">
            <label className="sg-label">Contrato</label>
            <select className="sg-input" value={contratoId} onChange={(e) => seleccionar(e.target.value)} data-testid="select-contrato">
              <option value="">— Selecciona un contrato —</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
            </select>
          </div>

          {!contratoId && <p className="text-sm text-slate-500">Selecciona un contrato para registrar o ver sus pagos.</p>}

          {contratoId && ultimo && (
            <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-6 rounded-r-md" data-testid="aviso-pago-registrado">
              <div className="text-sm font-semibold text-sigecop-green-validation">✓ Pago registrado</div>
              <p className="text-sm text-slate-800 mt-1">
                <strong>{ultimo.ref}</strong> · {ultimo.fecha} · {mxn(ultimo.importe)}. La estimación quedó marcada como <strong>pagada</strong>.
              </p>
            </div>
          )}

          {contratoId && !soloLectura && (
            <div className="bg-white border border-borde rounded-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-sigecop-blue mb-4">Datos del pago</h2>
              <RegionEditable disabled={soloLectura}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="sg-label">Estimación a pagar * <span className="text-[11px] font-normal text-slate-500">(integrada/autorizada, no pagada)</span></label>
                    <select className="sg-input" value={estimacionId} onChange={(e) => setEstimacionId(e.target.value)} data-testid="pago-estimacion">
                      <option value="">— Selecciona la estimación —</option>
                      {estimaciones.map((e) => (
                        <option key={e.id} value={e.id}>Estimación #{e.numero} · {fmtFecha(e.periodo_inicio)}–{fmtFecha(e.periodo_fin)} · neto {mxn(e.neto)}</option>
                      ))}
                    </select>
                    {estimaciones.length === 0 && <p className="text-[11px] text-amber-700 mt-1">Este contrato no tiene estimaciones pagables (integradas o autorizadas, no pagadas).</p>}
                  </div>

                  <div>
                    <label className="sg-label">Importe a pagar (neto de la estimación)</label>
                    <div className="sg-input bg-pagina font-semibold" data-testid="pago-importe-neto">{importeNeto != null ? mxn(importeNeto) : '—'}</div>
                    <p className="text-[11px] text-slate-500 mt-1">Derivado del servidor (neto de la estimación). No editable (art. 118 / cuadre).</p>
                  </div>
                  <div>
                    <label className="sg-label">Fecha de pago *</label>
                    <input type="date" className="sg-input" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} data-testid="pago-fecha" />
                  </div>

                  <div>
                    <label className="sg-label">Referencia bancaria (SPEI) *</label>
                    <input className="sg-input" placeholder="Clave de rastreo / folio de transferencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} data-testid="pago-referencia" />
                  </div>
                  <div>
                    <label className="sg-label">Folio fiscal (CFDI) *</label>
                    <input className="sg-input" placeholder="UUID del CFDI" value={facturaCfdi} onChange={(e) => setFacturaCfdi(e.target.value)} data-testid="pago-cfdi" />
                  </div>

                  <div>
                    <label className="sg-label">Fecha de la factura *</label>
                    <input type="date" className="sg-input" value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)} data-testid="pago-fecha-factura" />
                  </div>
                  <div>
                    <label className="sg-label">Fecha de autorización de la estimación</label>
                    <input type="date" className="sg-input" value={fechaAutorizacion} onChange={(e) => setFechaAutorizacion(e.target.value)} data-testid="pago-fecha-autorizacion" />
                    <p className="text-[11px] text-slate-500 mt-1">Opcional · provisional — pasará a HU-20 (instrucción de pago).</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="sg-label">Observaciones</label>
                    <textarea className="sg-input" rows={2} placeholder="Notas del pago efectuado (opcional)" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} data-testid="pago-observaciones" />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900" onClick={limpiar}>Limpiar</button>
                  <button type="button" className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" disabled={!puedeRegistrar} onClick={registrar} data-testid="btn-registrar-pago">
                    {registrando ? 'Registrando…' : 'Registrar pago'}
                  </button>
                </div>
              </RegionEditable>
            </div>
          )}

          {contratoId && (
            <div className="bg-white border border-borde rounded-lg overflow-hidden">
              <div className="px-6 py-3 border-b border-borde">
                <h2 className="text-lg font-bold text-sigecop-blue">Pagos del contrato ({pagos.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="tabla-pagos">
                  <thead className="bg-pagina text-tinta-sec">
                    <tr>
                      <th className="text-left p-3 font-semibold">Estimación</th>
                      <th className="text-left p-3 font-semibold">Fecha pago</th>
                      <th className="text-right p-3 font-semibold">Importe</th>
                      <th className="text-left p-3 font-semibold">Referencia</th>
                      <th className="text-left p-3 font-semibold">CFDI</th>
                      <th className="text-left p-3 font-semibold">Registró</th>
                      <th className="text-left p-3 font-semibold">Plazo (art. 54)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr><td colSpan="7" className="p-6 text-center text-slate-400">Cargando…</td></tr>
                    ) : pagos.length === 0 ? (
                      <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">Este contrato aún no tiene pagos registrados.</td></tr>
                    ) : (
                      pagos.map((p) => (
                        <tr key={p.id} className="border-t border-borde hover:bg-pagina" data-testid="fila-pago">
                          <td className="p-3 font-mono text-xs">{p.estimacion_ref}</td>
                          <td className="p-3">{fmtFecha(p.fecha_pago)}</td>
                          <td className="p-3 text-right font-semibold">{mxn(p.importe)}</td>
                          <td className="p-3 font-mono text-xs">{p.referencia}</td>
                          <td className="p-3 font-mono text-xs">{p.factura_cfdi}</td>
                          <td className="p-3">{p.registrado_por_nombre || '—'}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${p.plazo_cumplido ? 'bg-exito-bg text-exito' : 'bg-aviso-bg text-aviso'}`} data-testid={`plazo-${p.id}`}>
                              {p.plazo_cumplido ? `✓ dentro del plazo de 20 días (${p.dias_transcurridos} d)` : `⚠ excedió 20 días (${p.dias_transcurridos} d)`}
                            </span>
                            {p.base_provisional && <div className="text-[10px] text-slate-500 mt-1">provisional — falta la fecha de autorización (HU-20)</div>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <SeccionCriterios
        huId="HU-21"
        criterios={[
          { numero: 1, texto: 'El registro del pago marca la estimación como pagada (estado → pagada) y la liga a un pago real (no doble pago).' },
          { numero: 2, texto: 'se registran: estimación, fecha, importe (= neto), referencia bancaria, CFDI y usuario que realizó el registro.' }
        ]}
      />
      <p className="mt-4 text-xs text-slate-500 italic text-center">
        El pago se amarra a una estimación real; el importe = neto (server-side); no se paga dos veces. Fundamento: arts. 54-55 LOPSRM · 127-128 RLOPSRM · 191 LFD.
      </p>
    </div>
  );
}
