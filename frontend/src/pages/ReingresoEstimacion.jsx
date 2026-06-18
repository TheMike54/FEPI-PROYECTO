import { useState, useEffect, useCallback, useMemo } from 'react';
import jsPDF from 'jspdf';
import { descargarExcelHoja } from '../services/excelExport.js';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import Boton from '../components/ui/Boton.jsx';
import Tabla, { thClass } from '../components/ui/Tabla.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';

// HU-16 (Equipo 3) — cableado al backend real. Reingreso de estimación tras rechazo.
// Fuente de la verdad = backend; aquí NO se fabrican datos (sin dummy):
//   · Las observaciones de la versión RECHAZADA se leen del detalle real de HU-15
//     (GET /estimaciones-ciclo/estimacion/:id/revision) y se exportan a PDF/Excel (CA-2).
//   · El reingreso (POST .../reingresar) crea la nueva versión como BLOQUE INDEPENDIENTE
//     ligado vía reemplaza_a (CA-1), atómico y server-side. La trazabilidad de versiones
//     se DERIVA del historial real (reemplaza_a) (CA-3).
//   · El plazo de presentación (art. 54 LOPSRM) NO se reinicia: se REFERENCIA el envío
//     original de la rechazada (enviada_en), derivado en lectura, sin contador persistido.
// Lo que no tiene fuente real (numeración v1/v2 inventada, banner dummy) se elimina.

// --- formato de periodo (mismo criterio que HU-15) ---
const fmtMes = new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const mesLabel = (iso) => {
  const s = (iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—';
  const txt = fmtMes.format(new Date(s + 'T00:00:00Z')).replace('.', '');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};
const periodoLabel = (ini, fin) => {
  const a = mesLabel(ini); const b = mesLabel(fin);
  return a === b ? a : `${a} – ${b}`;
};
const estLabel = (e) => `EST-${String(e?.numero ?? 0).padStart(3, '0')}`;
const fechaMX = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Severidad real (estimacion_observaciones): menor/mayor/critica.
const SEVERIDAD_LABEL = { menor: 'Menor', mayor: 'Mayor', critica: 'Crítica' };
const SEVERIDAD_CLASE = {
  critica: 'bg-red-100 text-red-700',
  mayor:   'bg-amber-100 text-sigecop-amber-attention',
  menor:   'bg-slate-200 text-slate-700'
};
function SeveridadBadge({ severidad }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${SEVERIDAD_CLASE[severidad] || 'bg-slate-200 text-slate-600'}`}>
      {SEVERIDAD_LABEL[severidad] || severidad}
    </span>
  );
}
const TIPO_LABEL = { aclaracion: 'Aclaración', correccion: 'Corrección', rechazo: 'Rechazo' };
const SECCION_LABEL = { caratula: 'Carátula', generadores: 'Números generadores', fotos: 'Registro fotográfico', soportes: 'Soportes', notas: 'Notas vinculadas' };

const ESTADO_CLASE = {
  integrada:  'bg-slate-200 text-slate-600',
  enviada:    'bg-amber-100 text-sigecop-amber-attention',
  autorizada: 'bg-green-100 text-sigecop-green-validation',
  pagada:     'bg-green-100 text-sigecop-green-validation',
  rechazada:  'bg-red-100 text-red-700'
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function EstadoBadge({ estado }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ESTADO_CLASE[estado] || 'bg-slate-200 text-slate-600'}`}>
      {cap(estado)}
    </span>
  );
}

// Filas exportables de las observaciones de la rechazada (datos REALES de revisión).
const obsAFilas = (observaciones) =>
  (observaciones || []).map((o, i) => ({
    '#': i + 1,
    Sección: SECCION_LABEL[o.seccion] || o.seccion,
    Tipo: TIPO_LABEL[o.tipo] || o.tipo,
    Severidad: SEVERIDAD_LABEL[o.severidad] || o.severidad,
    Observación: o.descripcion
  }));

function exportarObservacionesPdf(observaciones, folio, est) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Observaciones de la version rechazada', 14, 20);
  doc.setFontSize(10);
  doc.text(`Contrato: ${folio || '—'}`, 14, 28);
  doc.text(`Estimacion: ${estLabel(est)} (version rechazada)`, 14, 34);
  doc.text(`Fecha de descarga: ${new Date().toLocaleDateString('es-MX')}`, 14, 40);

  let y = 52;
  doc.setFontSize(11);
  doc.text('# | Seccion | Tipo | Severidad | Observacion', 14, y);
  y += 4;
  doc.setDrawColor(180);
  doc.line(14, y, 196, y);
  y += 6;
  doc.setFontSize(10);
  obsAFilas(observaciones).forEach((f) => {
    const lineas = doc.splitTextToSize(
      `${f['#']}. [${f.Severidad}] ${f.Sección} · ${f.Tipo}: ${f.Observación}`,
      180
    );
    if (y + lineas.length * 5 > 280) { doc.addPage(); y = 20; }
    doc.text(lineas, 14, y);
    y += lineas.length * 5 + 2;
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`observaciones_${estLabel(est)}_${folio || 'contrato'}_${stamp}.pdf`);
}

function exportarObservacionesExcel(observaciones, folio, est) {
  const stamp = new Date().toISOString().slice(0, 10);
  return descargarExcelHoja(
    `observaciones_${estLabel(est)}_${folio || 'contrato'}_${stamp}.xlsx`,
    'Observaciones',
    obsAFilas(observaciones)
  );
}

export default function ReingresoEstimacion() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-16');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [historial, setHistorial] = useState([]);      // todas las estimaciones del contrato (real)
  const [rechazadaId, setRechazadaId] = useState('');
  const [revision, setRevision] = useState(null);      // detalle de revisión (observaciones reales)
  const [cargandoHist, setCargandoHist] = useState(false);
  const [cargandoRev, setCargandoRev] = useState(false);
  const [accion, setAccion] = useState(false);
  const [nota, setNota] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [reingreso, setReingreso] = useState(null);    // resultado del POST /reingresar

  const contratoSel = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);
  const rechazadaSel = useMemo(() => historial.find((e) => String(e.id) === String(rechazadaId)) || null, [historial, rechazadaId]);

  // Rechazadas REINGRESABLES = estado 'rechazada' que aún NO tienen un reingreso
  // (ninguna otra estimación las referencia vía reemplaza_a).
  const reingresables = useMemo(
    () => historial.filter((e) => e.estado === 'rechazada' && !historial.some((o) => o.reemplaza_a === e.id)),
    [historial]
  );

  // Carga inicial: contratos del usuario (acotados por el backend).
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const cargarHistorial = useCallback(async (id) => {
    if (!id) { setHistorial([]); return; }
    setCargandoHist(true);
    try {
      const data = await api.historialEstimaciones(id);
      setHistorial(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a las estimaciones de este contrato' : 'No se pudieron cargar las estimaciones');
      setHistorial([]);
    } finally {
      setCargandoHist(false);
    }
  }, [showToast]);

  const cargarRevision = useCallback(async (id) => {
    if (!id) { setRevision(null); return; }
    setCargandoRev(true);
    try {
      setRevision(await api.revisionEstimacion(id));
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a la revisión de esta estimación' : 'No se pudo cargar la estimación');
      setRevision(null);
    } finally {
      setCargandoRev(false);
    }
  }, [showToast]);

  const seleccionarContrato = useCallback((id) => {
    setContratoId(id);
    setRechazadaId(''); setRevision(null); setReingreso(null);
    setNota(''); setConfirmado(false);
    cargarHistorial(id);
  }, [cargarHistorial]);

  const seleccionarRechazada = useCallback((id) => {
    setRechazadaId(id);
    setRevision(null); setReingreso(null);
    setNota(''); setConfirmado(false);
    cargarRevision(id);
  }, [cargarRevision]);

  const observaciones = revision?.observaciones || [];
  const puedeReingresar = !soloLectura && !!rechazadaSel && nota.trim().length > 0 && confirmado && !reingreso && !accion;

  const handleReingresar = useCallback(async () => {
    if (!puedeReingresar) return;
    setAccion(true);
    try {
      const res = await api.reingresarEstimacion(rechazadaId, { confirmacion: true });
      setReingreso(res);
      showToast(`Reingreso creado: ${estLabel(res.nueva)} vinculada a ${estLabel(rechazadaSel)}.`);
      await cargarHistorial(contratoId);  // refresca para la trazabilidad real (v2)
    } catch (e) {
      showToast(e.payload?.error || 'No se pudo reingresar la estimación');
    } finally {
      setAccion(false);
    }
  }, [puedeReingresar, rechazadaId, rechazadaSel, contratoId, cargarHistorial, showToast]);

  // Trazabilidad REAL de la versión seleccionada: la rechazada + su reingreso (si existe),
  // derivada del historial (reemplaza_a). CA-1 (histórico vinculado) + CA-3 (sin reinicio).
  const cadena = useMemo(() => {
    if (!rechazadaSel) return [];
    const reingresoFila = historial.find((e) => e.reemplaza_a === rechazadaSel.id) || null;
    const filas = [{ est: rechazadaSel, vinculadaA: null }];
    if (reingresoFila) filas.push({ est: reingresoFila, vinculadaA: rechazadaSel });
    return filas;
  }, [rechazadaSel, historial]);

  const tieneReingreso = cadena.length > 1;

  return (
    <div>
      <HeaderVista
        huId="HU-16"
        titulo="Reingreso de estimación tras rechazo"
        sprint="Sprint 8"
        rolAcademico="Contratista"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Reingreso' }
        ]}
      />

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión para reingresar estimaciones.
        </div>
      )}

      {/* Selección de contrato + estimación rechazada. */}
      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl space-y-4">
        <div>
          <label className="sg-label">Contrato</label>
          <select
            className="sg-input"
            value={contratoId}
            onChange={(e) => seleccionarContrato(e.target.value)}
            disabled={sinSesion}
            data-testid="select-contrato"
          >
            <option value="">— Selecciona un contrato —</option>
            {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
          </select>
        </div>
        {contratoId && (
          <div>
            <label className="sg-label">Estimación rechazada</label>
            <select
              className="sg-input"
              value={rechazadaId}
              onChange={(e) => seleccionarRechazada(e.target.value)}
              disabled={cargandoHist}
              data-testid="select-estimacion"
            >
              <option value="">— Selecciona una estimación rechazada —</option>
              {reingresables.map((e) => (
                <option key={e.id} value={e.id}>
                  {estLabel(e)} · {periodoLabel(e.periodo_inicio, e.periodo_fin)} · Rechazada
                </option>
              ))}
            </select>
            {!cargandoHist && reingresables.length === 0 && (
              <p className="text-xs text-slate-500 mt-1" data-testid="sin-rechazadas">
                Este contrato no tiene estimaciones rechazadas pendientes de reingreso.
              </p>
            )}
          </div>
        )}
      </div>

      {cargandoRev && <p className="text-sm text-slate-500 mb-4">Cargando estimación…</p>}

      {rechazadaSel && !cargandoRev && (
        <>
          <BannerContexto
            variant="slate"
            folio={contratoSel?.folio}
            folioLabel="Contrato"
            extra={[
              { label: 'Estimación', value: estLabel(rechazadaSel), resaltado: true },
              { label: 'Periodo', value: periodoLabel(rechazadaSel.periodo_inicio, rechazadaSel.periodo_fin) },
              { value: <span className="text-red-700 font-bold">RECHAZADA</span> }
            ]}
            margenAbajo="mb-4"
          />

          {/* CA-3: el plazo del art. 54 NO se reinicia — referencia el envío original. */}
          <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 mb-6 text-sm text-slate-800 rounded-r-md">
            <strong>Plazo de presentación (art. 54 LOPSRM):</strong>{' '}
            la nueva versión se REFERENCIA al envío original de {estLabel(rechazadaSel)} ({fechaMX(rechazadaSel.enviada_en)}) y
            <strong> no reinicia</strong> el plazo (art. 54 LOPSRM: el reingreso no reinicia el plazo de presentación).
          </div>

          {reingreso && (
            <div
              className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-3 mb-6 text-sm text-slate-800 rounded-r-md"
              data-testid="aviso-reingreso"
            >
              <strong>
                ✓ Nueva versión {estLabel(reingreso.nueva)} creada y vinculada a la versión rechazada {estLabel(rechazadaSel)}.
              </strong>{' '}
              El plazo de presentación NO se reinicia.
            </div>
          )}

          {/* Observaciones REALES de la versión rechazada — display + export (CA-2). */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden mb-6">
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Observaciones de la versión rechazada
              </h2>
              <div className="flex gap-2">
                <Boton
                  variante="secundario"
                  data-testid="btn-descargar-obs-pdf"
                  disabled={observaciones.length === 0}
                  onClick={() => exportarObservacionesPdf(observaciones, contratoSel?.folio, rechazadaSel)}
                >
                  ⬇ Descargar PDF
                </Boton>
                <Boton
                  variante="secundario"
                  data-testid="btn-descargar-obs-excel"
                  disabled={observaciones.length === 0}
                  onClick={() => exportarObservacionesExcel(observaciones, contratoSel?.folio, rechazadaSel)}
                >
                  ⬇ Descargar Excel
                </Boton>
              </div>
            </div>
            {observaciones.length === 0 ? (
              <p className="px-6 py-4 text-sm text-slate-500 italic">
                La versión rechazada no tiene observaciones registradas.
              </p>
            ) : (
              <Tabla className="border-0 rounded-none">
                <thead>
                  <tr>
                    <th className={`${thClass} w-10`}>#</th>
                    <th className={thClass}>Sección</th>
                    <th className={thClass}>Tipo</th>
                    <th className={`${thClass} w-28`}>Severidad</th>
                    <th className={thClass}>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {observaciones.map((o, i) => (
                    <tr key={o.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">{i + 1}</td>
                      <td className="p-3 font-semibold">{SECCION_LABEL[o.seccion] || o.seccion}</td>
                      <td className="p-3 text-slate-700">{TIPO_LABEL[o.tipo] || o.tipo}</td>
                      <td className="p-3"><SeveridadBadge severidad={o.severidad} /></td>
                      <td className="p-3 text-slate-700">{o.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            )}
          </div>

          {/* Nueva versión — captura (gate de control). Deshabilitada en solo lectura. */}
          <fieldset disabled={soloLectura || !!reingreso} className="contents">
            <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                Nueva versión
              </h2>
              <div className="mb-4">
                <label className="sg-label">Nota de atención a observaciones</label>
                <textarea
                  className="sg-input"
                  rows="4"
                  placeholder="Describe cómo se atendieron las observaciones de la versión rechazada."
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  data-testid="textarea-nota"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Nota de control (no se persiste en Etapa 1; criterio del equipo (default conservador): persistirla requiere ajuste de esquema, diferido).
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
                <input
                  type="checkbox"
                  checked={confirmado}
                  onChange={(e) => setConfirmado(e.target.checked)}
                  data-testid="chk-confirmado"
                />
                Confirmo que atendí las observaciones de la versión rechazada.
              </label>
              <div className="flex justify-end">
                <Boton
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!puedeReingresar}
                  onClick={handleReingresar}
                  data-testid="btn-reingresar"
                >
                  Reingresar estimación (nueva versión)
                </Boton>
              </div>
            </div>
          </fieldset>

          {/* Trazabilidad REAL de versiones (CA-1 + CA-3). */}
          <div
            className="bg-white border border-slate-200 rounded-md overflow-hidden mb-6"
            data-testid="tabla-trazabilidad"
          >
            <div className="px-6 py-3 border-b border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Trazabilidad de versiones
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                La nueva versión se trata como bloque completo independiente; la rechazada queda
                como histórico vinculado. El plazo de presentación no se reinicia.
              </p>
            </div>
            <Tabla className="border-0 rounded-none">
              <thead>
                <tr>
                  <th className={`${thClass} w-28`}>Versión</th>
                  <th className={thClass}>Periodo</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass}>Vinculada a</th>
                </tr>
              </thead>
              <tbody>
                {cadena.map(({ est, vinculadaA }) => (
                  <tr key={est.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-3 font-mono font-semibold">{estLabel(est)}</td>
                    <td className="p-3 text-slate-700">{periodoLabel(est.periodo_inicio, est.periodo_fin)}</td>
                    <td className="p-3"><EstadoBadge estado={est.estado} /></td>
                    <td className="p-3 font-mono text-xs text-slate-700">
                      {vinculadaA ? estLabel(vinculadaA) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
            {!tieneReingreso && (
              <p className="px-6 py-3 text-xs text-slate-500">
                Aún no se ha reingresado esta versión.
              </p>
            )}
          </div>
        </>
      )}

      <SeccionCriterios
        huId="HU-16"
        criterios={[
          { numero: 1, texto: 'La nueva versión se trata como bloque completo independiente y la versión rechazada queda como histórico vinculado.' },
          { numero: 2, texto: 'El listado de observaciones de la versión rechazada está disponible para descarga en PDF o Excel.' },
          { numero: 3, texto: 'La nueva versión queda vinculada con la rechazada para trazabilidad, sin reiniciar el plazo de presentación.' }
        ]}
      />
    </div>
  );
}
