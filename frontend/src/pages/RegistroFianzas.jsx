import { useState, useEffect, useMemo, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-02 (sesión E2 18-jun) — REGISTRO DE FIANZAS Y GARANTÍAS, cableado al backend real (antes era maqueta).
// Las garantías ya persistían desde el alta HU-01; aquí se gestionan/leen/endosan por esta pantalla, con su
// PDF real. Una garantía por tipo por contrato (UNIQUE contrato_id,tipo: una de anticipo y una de cumplimiento,
// art. 48 LOPSRM; vicios ocultos art. 66 LOPSRM). El endoso = ajuste por modificación de monto/plazo (art. 91 RLOPSRM).

const TIPOS = [
  { key: 'cumplimiento', label: 'Cumplimiento' },
  { key: 'anticipo', label: 'Anticipo' },
  { key: 'vicios_ocultos', label: 'Vicios ocultos' },
];
const tipoLabel = (k) => (TIPOS.find((t) => t.key === k)?.label) || k;
const MOTIVOS_ENDOSO = [
  { key: 'ampliacion_monto', label: 'Ampliación de monto' },
  { key: 'prorroga_vigencia', label: 'Prórroga de vigencia' },
  { key: 'mixto', label: 'Mixto (monto y vigencia)' },
  { key: 'otro', label: 'Otro' },
];

const soloFecha = (s) => (s ? String(s).slice(0, 10) : '');
const moneda = (n) => `$ ${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaLabel = (iso) => { const p = soloFecha(iso).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '—'; };
function diasHasta(iso) {
  if (!iso) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(soloFecha(iso) + 'T00:00:00');
  return Math.round((d - hoy) / 86400000);
}
function badgePorDias(dias) {
  if (dias == null) return { color: 'gris', estado: 'sin vigencia', clase: 'bg-slate-100 text-slate-500 border border-slate-300' };
  if (dias < 0) return { color: 'rojo', estado: `Vencida hace ${Math.abs(dias)} d`, clase: 'bg-red-100 text-red-700 border border-red-300' };
  if (dias <= 5) return { color: 'rojo', estado: `Vence en ${dias} d`, clase: 'bg-red-100 text-red-700 border border-red-300' };
  if (dias <= 15) return { color: 'ambar', estado: `Vence en ${dias} d`, clase: 'bg-amber-100 text-sigecop-amber-attention border border-amber-300' };
  if (dias <= 30) return { color: 'amarillo', estado: `Vence en ${dias} d`, clase: 'bg-yellow-50 text-yellow-800 border border-yellow-300' };
  return { color: 'verde', estado: 'Vigente', clase: 'bg-green-100 text-sigecop-green-validation border border-green-300' };
}

const FORM_VACIO = { tipo: '', afianzadora: '', poliza: '', monto: '', vigencia: '', archivo: null };

function ModalPoliza({ abierto, modo, valores, tiposDisponibles, onCambio, onArchivo, onCerrar, onConfirmar, datosOk, guardando }) {
  if (!abierto) return null;
  const tipos = modo === 'editar' ? TIPOS : TIPOS.filter((t) => tiposDisponibles.includes(t.key));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4" data-testid="modal-agregar-poliza">
      <div className="bg-white rounded-md shadow-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-sigecop-blue">{modo === 'editar' ? 'Editar póliza' : 'Agregar nueva póliza'}</h3>
          <button type="button" className="text-slate-400 hover:text-slate-700 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="sg-label">Tipo *</label>
            <select className="sg-input" value={valores.tipo} onChange={(e) => onCambio('tipo', e.target.value)} disabled={modo === 'editar'} data-testid="mp-tipo">
              <option value="">— Selecciona —</option>
              {tipos.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div><label className="sg-label">Afianzadora *</label><input className="sg-input" value={valores.afianzadora} onChange={(e) => onCambio('afianzadora', e.target.value)} data-testid="mp-afianzadora" /></div>
          <div><label className="sg-label">Número de póliza</label><input className="sg-input" value={valores.poliza} onChange={(e) => onCambio('poliza', e.target.value)} data-testid="mp-folio" /></div>
          <div><label className="sg-label">Monto afianzado (MXN) *</label><input type="number" min="0" step="any" className="sg-input" value={valores.monto} onChange={(e) => onCambio('monto', e.target.value)} data-testid="mp-monto" /></div>
          <div><label className="sg-label">Fecha de vencimiento *</label><input type="date" className="sg-input" value={valores.vigencia} onChange={(e) => onCambio('vigencia', e.target.value)} data-testid="mp-vencimiento" /></div>
          <div className="md:col-span-2">
            <label className="sg-label">Archivo PDF de la póliza {modo === 'editar' ? '(opcional: reemplaza el actual)' : ''}</label>
            <input type="file" accept="application/pdf" className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-sigecop-blue-light file:text-sigecop-blue hover:file:bg-sigecop-accent hover:file:text-white" onChange={onArchivo} data-testid="mp-archivo" />
            {valores.archivo && <p className="text-xs text-slate-600 mt-1">Archivo seleccionado: <strong>{valores.archivo.name}</strong></p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900" onClick={onCerrar}>Cancelar</button>
          <button type="button" className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" disabled={!datosOk || guardando} onClick={onConfirmar} data-testid="mp-confirmar">
            {guardando ? 'Guardando…' : (modo === 'editar' ? 'Guardar cambios' : 'Registrar')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalEndoso({ abierto, garantia, valores, onCambio, onCerrar, onConfirmar, guardando }) {
  if (!abierto || !garantia) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4" data-testid="modal-endoso">
      <div className="bg-white rounded-md shadow-lg max-w-xl w-full p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-sigecop-blue">Endoso a la garantía de {tipoLabel(garantia.tipo)}</h3>
          <button type="button" className="text-slate-400 hover:text-slate-700 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Ajuste de la garantía por modificación de monto o plazo (art. 91 RLOPSRM). El endoso es inalterable; corregir = endoso nuevo.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="sg-label">Motivo *</label>
            <select className="sg-input" value={valores.motivo} onChange={(e) => onCambio('motivo', e.target.value)} data-testid="endoso-motivo">
              {MOTIVOS_ENDOSO.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div><label className="sg-label">Nuevo monto (MXN)</label><input type="number" min="0" step="any" className="sg-input" value={valores.nuevo_monto} onChange={(e) => onCambio('nuevo_monto', e.target.value)} data-testid="endoso-monto" /></div>
          <div><label className="sg-label">Nueva vigencia</label><input type="date" className="sg-input" value={valores.nueva_vigencia} onChange={(e) => onCambio('nueva_vigencia', e.target.value)} data-testid="endoso-vigencia" /></div>
          <div className="md:col-span-2"><label className="sg-label">Observaciones</label><textarea className="sg-input" rows={2} value={valores.observaciones} onChange={(e) => onCambio('observaciones', e.target.value)} data-testid="endoso-obs" /></div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900" onClick={onCerrar}>Cancelar</button>
          <button type="button" className="sg-btn-primary disabled:opacity-50" disabled={guardando} onClick={onConfirmar} data-testid="endoso-confirmar">{guardando ? 'Registrando…' : 'Registrar endoso'}</button>
        </div>
      </div>
    </div>
  );
}

export default function RegistroFianzas() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-02');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [garantias, setGarantias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState({ abierto: false, modo: 'agregar', id: null });
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [endoso, setEndoso] = useState({ abierto: false, garantia: null });
  const [endosoForm, setEndosoForm] = useState({ motivo: 'prorroga_vigencia', nuevo_monto: '', nueva_vigencia: '', observaciones: '' });

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const cargar = useCallback(async (id) => {
    if (!id) { setGarantias([]); return; }
    setCargando(true);
    try {
      const data = await api.garantiasDeContrato(id);
      setGarantias(Array.isArray(data?.garantias) ? data.garantias : []);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a las garantías de este contrato' : 'No se pudieron cargar las garantías');
      setGarantias([]);
    } finally { setCargando(false); }
  }, [showToast]);

  const seleccionar = (id) => { setContratoId(id); cargar(id); };

  const tiposPresentes = useMemo(() => garantias.map((g) => g.tipo), [garantias]);
  const tiposDisponibles = TIPOS.map((t) => t.key).filter((k) => !tiposPresentes.includes(k));

  const abrirAgregar = () => { setForm(FORM_VACIO); setModal({ abierto: true, modo: 'agregar', id: null }); };
  const abrirEditar = (g) => {
    setForm({ tipo: g.tipo, afianzadora: g.afianzadora || '', poliza: g.poliza || '', monto: String(g.monto ?? ''), vigencia: soloFecha(g.vigencia), archivo: null });
    setModal({ abierto: true, modo: 'editar', id: g.id });
  };
  const cerrarModal = () => { setModal({ abierto: false, modo: 'agregar', id: null }); setForm(FORM_VACIO); };
  const onCambio = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));
  const onArchivo = (e) => setForm((p) => ({ ...p, archivo: e.target.files?.[0] || null }));
  const datosOk = !!form.tipo && form.afianzadora.trim().length > 0 && Number(form.monto) > 0 && !!form.vigencia;

  const confirmar = async () => {
    if (!datosOk || guardando) return;
    setGuardando(true);
    try {
      const payload = { tipo: form.tipo, afianzadora: form.afianzadora.trim(), poliza: form.poliza.trim() || null, monto: Number(form.monto), vigencia: form.vigencia };
      let gid = modal.id;
      if (modal.modo === 'editar') { await api.editarGarantia(gid, payload); }
      else { const res = await api.crearGarantia(contratoId, payload); gid = res.id; }
      if (form.archivo) { await api.subirPdfGarantia(gid, form.archivo); }
      showToast(modal.modo === 'editar' ? 'Garantía actualizada.' : 'Garantía registrada.');
      cerrarModal();
      await cargar(contratoId);
    } catch (e) {
      showToast(e.status === 409 ? (e.message || 'Ya existe una garantía de ese tipo')
        : e.status === 403 ? 'Solo la dependencia o el residente puede gestionar garantías'
          : (e.message || 'No se pudo guardar la garantía'));
    } finally { setGuardando(false); }
  };

  const verPdf = async (g) => {
    try {
      const blob = await api.descargarPdfGarantia(g.id);
      const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { showToast(e.status === 404 ? 'Esta póliza no tiene PDF cargado' : (e.message || 'No se pudo abrir el PDF')); }
  };

  const abrirEndoso = (g) => { setEndoso({ abierto: true, garantia: g }); setEndosoForm({ motivo: 'prorroga_vigencia', nuevo_monto: '', nueva_vigencia: '', observaciones: '' }); };
  const confirmarEndoso = async () => {
    if (guardando) return; setGuardando(true);
    try {
      await api.registrarEndoso(endoso.garantia.id, {
        motivo: endosoForm.motivo,
        nuevo_monto: endosoForm.nuevo_monto === '' ? null : Number(endosoForm.nuevo_monto),
        nueva_vigencia: endosoForm.nueva_vigencia || null,
        observaciones: endosoForm.observaciones.trim() || null,
      });
      showToast('Endoso registrado (art. 91 RLOPSRM).');
      setEndoso({ abierto: false, garantia: null });
      await cargar(contratoId);
    } catch (e) { showToast(e.message || 'No se pudo registrar el endoso'); } finally { setGuardando(false); }
  };

  const conteo = useMemo(() => {
    let c5 = 0, c15 = 0, c30 = 0;
    for (const g of garantias) { const d = diasHasta(g.vigencia); if (d == null) continue; if (d <= 30) c30++; if (d <= 15) c15++; if (d <= 5) c5++; }
    return { c5, c15, c30 };
  }, [garantias]);

  return (
    <div>
      <HeaderVista huId="HU-02" titulo="Registro de fianzas y garantías" sprint="Sprint 6"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Contratos' }, { label: 'Registro de fianzas' }]} />

      {sinSesion && <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">Inicia sesión para consultar y registrar las garantías de un contrato.</div>}

      {/* 3A · P3 — hereda el contrato activo global en vez de re-seleccionarlo aquí */}
      <BannerContratoActivo seleccionar={seleccionar} contratoId={contratoId} />

      {!contratoId && !sinSesion && <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para ver y gestionar sus pólizas de fianza.</p>}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando garantías…</p>}

      {contratoId && !cargando && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-red-200 rounded-md p-4 shadow-sm" data-testid="card-5d"><div className="text-xs text-slate-500 uppercase tracking-wider">Por vencer ≤ 5 días</div><div className="text-3xl font-bold text-red-600 mt-1">{conteo.c5}</div><div className="text-xs text-slate-600">pólizas en alerta crítica</div></div>
            <div className="bg-white border border-amber-200 rounded-md p-4 shadow-sm" data-testid="card-15d"><div className="text-xs text-slate-500 uppercase tracking-wider">Por vencer ≤ 15 días</div><div className="text-3xl font-bold text-sigecop-amber-attention mt-1">{conteo.c15}</div><div className="text-xs text-slate-600">pólizas requieren gestión</div></div>
            <div className="bg-white border border-yellow-200 rounded-md p-4 shadow-sm" data-testid="card-30d"><div className="text-xs text-slate-500 uppercase tracking-wider">Por vencer ≤ 30 días</div><div className="text-3xl font-bold text-yellow-700 mt-1">{conteo.c30}</div><div className="text-xs text-slate-600">pólizas en seguimiento</div></div>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-sigecop-blue">Pólizas de fianza del contrato ({garantias.length})</h2>
              {!soloLectura && (
                <button type="button" className="sg-btn-primary disabled:opacity-50" onClick={abrirAgregar} disabled={tiposDisponibles.length === 0} title={tiposDisponibles.length === 0 ? 'El contrato ya tiene las 3 garantías; edítalas' : ''} data-testid="btn-agregar-poliza">+ Agregar nueva póliza</button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-polizas">
                <thead className="bg-slate-50"><tr className="text-slate-700">
                  <th className="text-left p-3 font-semibold">Tipo</th><th className="text-left p-3 font-semibold">Póliza</th>
                  <th className="text-left p-3 font-semibold">Afianzadora</th><th className="text-right p-3 font-semibold">Monto</th>
                  <th className="text-center p-3 font-semibold">Vencimiento</th><th className="text-center p-3 font-semibold">Alerta</th>
                  <th className="text-center p-3 font-semibold">Endosos</th><th className="text-center p-3 font-semibold">Acciones</th>
                </tr></thead>
                <tbody>
                  {garantias.length === 0 ? (
                    <tr><td colSpan="8" className="p-8 text-center text-slate-400 italic" data-testid="fianzas-vacio">Este contrato no tiene garantías registradas.</td></tr>
                  ) : garantias.map((g) => {
                    const dias = diasHasta(g.vigencia); const badge = badgePorDias(dias);
                    return (
                      <tr key={g.id} className="border-t border-slate-200 hover:bg-slate-50" data-badge={badge.color} data-testid={`fila-poliza-${g.id}`}>
                        <td className="p-3"><span className="inline-block px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold rounded">{tipoLabel(g.tipo)}</span></td>
                        <td className="p-3 font-mono text-xs">{g.poliza || '—'}</td>
                        <td className="p-3">{g.afianzadora || '—'}</td>
                        <td className="p-3 text-right font-mono text-xs">{moneda(g.monto)}</td>
                        <td className="p-3 text-center text-xs">{fechaLabel(g.vigencia)}</td>
                        <td className="p-3 text-center"><span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge.clase}`}>{badge.estado}</span></td>
                        <td className="p-3 text-center text-xs" data-testid={`endosos-count-${g.id}`}>{g.endosos?.length ? `${g.endosos.length} endoso(s)` : '—'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {g.tiene_pdf && <button type="button" title="Ver PDF de la póliza" className="text-sigecop-accent hover:text-sigecop-blue text-lg" onClick={() => verPdf(g)} data-testid={`btn-ver-pdf-${g.id}`}>👁</button>}
                            {!soloLectura && <button type="button" title="Editar póliza" className="text-slate-500 hover:text-sigecop-blue" onClick={() => abrirEditar(g)} data-testid={`btn-editar-${g.id}`}>✏️</button>}
                            {!soloLectura && <button type="button" title="Registrar endoso" className="text-slate-500 hover:text-sigecop-blue text-xs font-semibold" onClick={() => abrirEndoso(g)} data-testid={`btn-endoso-${g.id}`}>+ endoso</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className="mt-3 text-xs text-slate-500">
        <strong>⚖️ Fundamento:</strong> Art. 48 LOPSRM — el contratista garantiza el anticipo (fr. I) y el cumplimiento del
        contrato (fr. II), dentro de los 15 días naturales del fallo; vicios ocultos (art. 66 LOPSRM). El endoso (ajuste de
        la garantía por modificación de monto o plazo) se funda en el art. 91 RLOPSRM, que remite a la fr. II del art. 98 RLOPSRM.
      </p>

      <SeccionCriterios huId="HU-02" criterios={[
        { numero: 1, texto: 'La póliza queda ligada al contrato con afianzadora, vigencia y monto registrados (una garantía por tipo: anticipo, cumplimiento, vicios ocultos).' },
        { numero: 2, texto: 'El sistema muestra el estado de vigencia con alerta a 30, 15 y 5 días del vencimiento.' },
        { numero: 3, texto: 'La póliza registrada se consulta como PDF real desde el listado, y admite endosos (ajustes) que quedan registrados sin alterar la garantía original.' },
      ]} />

      <ModalPoliza abierto={modal.abierto} modo={modal.modo} valores={form} tiposDisponibles={tiposDisponibles}
        onCambio={onCambio} onArchivo={onArchivo} onCerrar={cerrarModal} onConfirmar={confirmar} datosOk={datosOk} guardando={guardando} />
      <ModalEndoso abierto={endoso.abierto} garantia={endoso.garantia} valores={endosoForm}
        onCambio={(c, v) => setEndosoForm((p) => ({ ...p, [c]: v }))} onCerrar={() => setEndoso({ abierto: false, garantia: null })}
        onConfirmar={confirmarEndoso} guardando={guardando} />
    </div>
  );
}
