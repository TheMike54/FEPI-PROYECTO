import { useState, useEffect, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-21 conectado al backend (variante mínima). Registra el pago efectuado; el
// actor (registrado_por) sale del JWT (CA-2). El cierre de la estimación / avance
// financiero (CA-1b) queda diferido a HU-12 — por eso el banner es HONESTO.

const importeNum = (s) => { const n = parseFloat(String(s || '').replace(/[$,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
const mxn = (n) => `$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (s) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return (y && m && d) ? `${d}/${m}/${y}` : '—'; };

export default function RegistroPago() {
  const { token, usuario } = useSesion();
  const { soloLectura } = useVistaHU('HU-21');
  const { showToast } = useToast();
  const sinSesion = !token;
  const hoy = new Date().toISOString().slice(0, 10);

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [ultimo, setUltimo] = useState(null); // banner honesto del último pago

  // Formulario
  const [estimacionRef, setEstimacionRef] = useState('');
  const [fechaPago, setFechaPago] = useState(hoy);
  const [importe, setImporte] = useState('');
  const [referencia, setReferencia] = useState('');
  const [facturaCfdi, setFacturaCfdi] = useState('');
  const [fechaFactura, setFechaFactura] = useState('');
  const [fechaAutorizacion, setFechaAutorizacion] = useState('');
  const [observaciones, setObservaciones] = useState('');

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

  const seleccionar = useCallback(async (id) => {
    setContratoId(id); setPagos([]); setUltimo(null);
    if (!id) return;
    await cargarPagos(id);
  }, [cargarPagos]);

  const requeridosOk = estimacionRef.trim() && fechaPago && importeNum(importe) > 0 && referencia.trim() && facturaCfdi.trim() && fechaFactura;
  const puedeRegistrar = !soloLectura && !!contratoId && requeridosOk && !registrando;

  const limpiar = () => {
    setEstimacionRef(''); setImporte(''); setReferencia(''); setFacturaCfdi('');
    setFechaFactura(''); setFechaAutorizacion(''); setObservaciones(''); setFechaPago(hoy);
  };

  const registrar = async () => {
    if (!contratoId) { showToast('Selecciona un contrato'); return; }
    setRegistrando(true);
    try {
      const payload = {
        contrato_id: Number(contratoId),
        estimacion_ref: estimacionRef.trim(),
        fecha_pago: fechaPago,
        importe: importeNum(importe),
        referencia: referencia.trim(),
        factura_cfdi: facturaCfdi.trim(),
        fecha_factura: fechaFactura,
        fecha_autorizacion: fechaAutorizacion || undefined,
        observaciones: observaciones.trim() || undefined
      };
      const creado = await api.registrarPago(payload);
      setUltimo({ ref: creado.estimacion_ref, fecha: fmtFecha(creado.fecha_pago) });
      showToast('Pago registrado');
      limpiar();
      await cargarPagos(contratoId);
    } catch (e) {
      // El backend manda: se muestra tal cual el error localizado (400/403/404).
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
        descripcion="Registra el pago ya realizado de una estimación. Quien registra se toma de tu sesión (art. 54 LOPSRM: medios electrónicos)."
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Pagos' }, { label: 'Registro de pago' }]}
      />

      {sinSesion ? (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-6 text-center text-sm text-slate-600">
          Inicia sesión en modo aplicación para registrar o consultar pagos.
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
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
                Estimación <strong>{ultimo.ref}</strong> · {ultimo.fecha}. El cierre de la estimación (marcarla pagada) y el avance financiero llegan con <strong>HU-12</strong> (CA-1b, diferido).
              </p>
            </div>
          )}

          {/* Formulario — solo si la página es editable para el rol (finanzas = ejecuta) */}
          {contratoId && !soloLectura && (
            <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
              <h2 className="text-lg font-bold text-sigecop-blue mb-4">Datos del pago</h2>
              <RegionEditable disabled={soloLectura}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="sg-label">Referencia de la estimación (folio/periodo) *</label>
                    <input className="sg-input" placeholder="p.ej. EST-2026-003 — Mayo 2026" value={estimacionRef} onChange={(e) => setEstimacionRef(e.target.value)} data-testid="pago-estimacion-ref" />
                  </div>

                  <div>
                    <label className="sg-label">Fecha de pago *</label>
                    <input type="date" className="sg-input" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} data-testid="pago-fecha" />
                  </div>
                  <div>
                    <label className="sg-label">Importe pagado (MXN) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input className="sg-input pl-7" placeholder="0.00" value={importe} onChange={(e) => setImporte(e.target.value)} data-testid="pago-importe" />
                    </div>
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

          {/* Lista de pagos del contrato (del backend) */}
          {contratoId && (
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
              <div className="px-6 py-3 border-b border-slate-200">
                <h2 className="text-lg font-bold text-sigecop-blue">Pagos del contrato ({pagos.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="tabla-pagos">
                  <thead className="bg-slate-50 text-slate-700">
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
                        <tr key={p.id} className="border-t border-slate-200 hover:bg-slate-50" data-testid="fila-pago">
                          <td className="p-3 font-mono text-xs">{p.estimacion_ref}</td>
                          <td className="p-3">{fmtFecha(p.fecha_pago)}</td>
                          <td className="p-3 text-right font-semibold">{mxn(p.importe)}</td>
                          <td className="p-3 font-mono text-xs">{p.referencia}</td>
                          <td className="p-3 font-mono text-xs">{p.factura_cfdi}</td>
                          <td className="p-3">{p.registrado_por_nombre || '—'}</td>
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${p.plazo_cumplido ? 'bg-green-100 text-sigecop-green-validation' : 'bg-amber-100 text-amber-800'}`}
                              data-testid={`plazo-${p.id}`}
                            >
                              {p.plazo_cumplido ? `✓ dentro del plazo de 20 días (${p.dias_transcurridos} d)` : `⚠ excedió 20 días (${p.dias_transcurridos} d)`}
                            </span>
                            {p.base_provisional && (
                              <div className="text-[10px] text-slate-500 mt-1">provisional — falta la fecha de autorización (HU-20)</div>
                            )}
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
          { numero: 1, texto: 'El registro del pago marca la estimación como pagada y actualiza el avance financiero del contrato.' },
          { numero: 2, texto: 'se encuentran todos o se encuentran los siguientes datos: fecha, importe, referencia bancaria y usuario que realizó el registro.' }
        ]}
      />
      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Variante mínima: se asienta el pago efectuado (CA-2). El cierre de la estimación / avance financiero (CA-1) llega con HU-12. Fundamento: arts. 54-55 LOPSRM · 127-128 RLOPSRM · 191 LFD.
      </p>
    </div>
  );
}
