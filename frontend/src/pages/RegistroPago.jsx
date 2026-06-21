import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegistroPagoForm from '../components/pagos/RegistroPagoForm.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-21 ENDURECIDO: el pago se AMARRA a una estimación REAL del contrato (estimacion_id); el
// importe = NETO de esa estimación (read-only, derivado del servidor, no se teclea); no se paga
// dos veces; al registrar, la estimación pasa a 'pagada' (CA-1). El actor sale del JWT (CA-2).
//
// F6 (match wizard): el FORMULARIO de registro vive en un componente COMPARTIDO (RegistroPagoForm), que también
// usa el 4º paso del wizard de tránsito a pago (TransitoPago). Esta pantalla conserva su ruta /pagos/registro
// (compatibilidad) = el selector de contrato + el form compartido + la tabla de pagos del contrato.

const mxn = (n) => `$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (s) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return (y && m && d) ? `${d}/${m}/${y}` : '—'; };

export default function RegistroPago() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-21');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const cargarPagos = useCallback(async (cid) => {
    if (!cid) { setPagos([]); return; }
    setCargando(true);
    try { setPagos(await api.listarPagos(cid)); }
    catch (e) { showToast(e.status === 403 ? 'No tienes acceso a los pagos de este contrato' : 'No se pudieron cargar los pagos'); setPagos([]); }
    finally { setCargando(false); }
  }, [showToast]);

  const seleccionar = useCallback(async (id) => {
    setContratoId(id); setPagos([]);
    if (!id) return;
    await cargarPagos(id);
  }, [cargarPagos]);

  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  useEffect(() => {
    // B6b/A-3A: preselecciona el contrato del ?contrato=ID (consistencia entre pantallas).
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) seleccionar(String(contratoQuery));
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionar]);

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

      <PestanasCiclo ciclo="pago" activo="registro" />

      {sinSesion ? (
        <div className="bg-pagina border border-borde rounded-md px-4 py-6 text-center text-sm text-slate-600">
          Inicia sesión en modo aplicación para registrar o consultar pagos.
        </div>
      ) : (
        <>
          {/* 3A·P3: hereda el contrato activo global en vez de re-seleccionarlo. El banner llama
              seleccionar(idGlobal) (carga pagos) y pinta "Contrato activo · Cambiar". */}
          <BannerContratoActivo seleccionar={seleccionar} contratoId={contratoId} />

          {!contratoId && <p className="text-sm text-slate-500">Selecciona un contrato para registrar o ver sus pagos.</p>}

          {/* F6: el formulario de registro (HU-21) es un componente COMPARTIDO (el mismo del 4º paso del wizard
              de pago). Solo lo ve quien EJECUTA (finanzas: HU-21='E'); el botón se gatea a finanzas dentro del
              form. La estimación a pagar se elige dentro del form. */}
          {contratoId && !soloLectura && (
            <RegistroPagoForm contratoId={contratoId} soloLectura={soloLectura} onRegistrado={() => cargarPagos(contratoId)} />
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
