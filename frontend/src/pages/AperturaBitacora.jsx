import { useState, useEffect, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

const formatoMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const soloFecha = (s) => (s ? String(s).slice(0, 10) : '');
const mxn = (v) => (v == null || v === '' ? '—' : formatoMXN.format(Number(v)));
const ROL_LABEL = { residente: 'Residente de obra', superintendente: 'Superintendente (contratista)', supervision: 'Supervisión' };
const fechaHora = (s) => (s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '');

// Render solo-lectura de una bitácora ya aperturada (acta inmutable + estado de firmas).
function BitacoraReadOnly({ bitacora }) {
  const acta = bitacora.acta || {};
  const ident = acta.identificacion || {};
  const fin = acta.datos_financieros || {};
  const cron = acta.cronograma || {};
  const firmantes = bitacora.firmantes || [];
  const completa = bitacora.completa === true;
  const firmadas = firmantes.filter((f) => f.firmado).length;
  const aperturaEn = bitacora.apertura_en
    ? new Date(bitacora.apertura_en).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    : '—';

  const Grupo = ({ titulo, children }) => (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{titulo}</div>
      {children}
    </div>
  );
  const Dato = ({ label, valor }) => (
    <div><div className="text-xs text-slate-500">{label}</div><div className="text-sm text-slate-800 font-medium">{valor || '—'}</div></div>
  );

  return (
    <div data-testid="bitacora-readonly">
      <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 rounded-r-md mb-6">
        <div className="text-sm font-semibold text-sigecop-green-validation">✓ Bitácora aperturada</div>
        <p className="text-sm text-slate-800 mt-1">
          Evento formal registrado el <strong>{aperturaEn}</strong> (entrega del sitio: {soloFecha(bitacora.fecha_apertura)}). La fecha y hora son <strong>inalterables</strong>.
        </p>
      </div>

      <div className={`px-4 py-3 rounded-md border mb-6 text-sm font-medium ${completa ? 'text-green-700 bg-green-50 border-green-300' : 'text-amber-800 bg-amber-50 border-amber-300'}`} data-testid="estado-firmas">
        {completa
          ? `✓ Firma conjunta COMPLETA — las ${firmantes.length} partes firmaron.`
          : `Firma conjunta PENDIENTE — ${firmadas} de ${firmantes.length} firmadas. Cada parte firma desde su cuenta en "Por firmar".`}
      </div>

      <h2 className="text-lg font-bold text-sigecop-blue mb-4">Primera nota de bitácora (acta de apertura)</h2>
      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6 space-y-5">
        <Grupo titulo="Identificación del contrato">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Dato label="Folio" valor={ident.folio} />
            <Dato label="Dependencia" valor={ident.dependencia} />
            <Dato label="Contratista" valor={ident.contratista} />
          </div>
        </Grupo>
        <Grupo titulo="Objeto de los trabajos"><div className="text-sm text-slate-800">{acta.objeto || '—'}</div></Grupo>
        <Grupo titulo="Datos financieros">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Dato label="Monto contractual" valor={mxn(fin.monto)} />
            <Dato label="Anticipo" valor={fin.anticipo_pct != null ? `${fin.anticipo_pct}%` : '—'} />
            <Dato label="Plazo de ejecución" valor={fin.plazo_dias != null ? `${fin.plazo_dias} días` : '—'} />
          </div>
        </Grupo>
        <Grupo titulo="Cronograma contractual">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Dato label="Inicio contractual" valor={soloFecha(cron.inicio)} />
            <Dato label="Término contractual" valor={soloFecha(cron.fin)} />
            <Dato label="Fecha de entrega del sitio" valor={soloFecha(cron.entrega_sitio)} />
          </div>
        </Grupo>
        <Grupo titulo="Registro de firmas (por cuenta)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {firmantes.map((f) => (
              <div key={f.usuario_id || f.rol_en_firma} className={`border rounded-md p-3 ${f.firmado ? 'border-sigecop-green-validation bg-sigecop-green-bg/40' : 'border-slate-200 bg-white'}`} data-testid={`firmante-${f.rol_en_firma}`}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{ROL_LABEL[f.rol_en_firma] || f.rol_en_firma}</div>
                <div className="text-sm font-semibold text-slate-800 mt-1">{f.nombre || '—'}</div>
                {f.email && <div className="text-xs text-slate-600">{f.email}</div>}
                {f.firmado ? (
                  <div className="text-xs text-sigecop-green-validation font-semibold mt-1">✓ Firmado{f.firmado_en ? ' · ' + fechaHora(f.firmado_en) : ''}</div>
                ) : (
                  <div className="text-xs text-amber-700 font-semibold mt-1">Pendiente de firma</div>
                )}
              </div>
            ))}
          </div>
        </Grupo>
      </div>
    </div>
  );
}

export default function AperturaBitacora() {
  const { token, usuario } = useSesion();
  const { soloLectura } = useVistaHU('HU-08');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [bitacora, setBitacora] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [aperturando, setAperturando] = useState(false);
  const [fechaEntregaSitio, setFechaEntregaSitio] = useState('');

  const contratoSel = contratos.find((c) => String(c.id) === String(contratoId)) || null;
  const soyResidenteDelContrato = !!contratoSel && contratoSel.residente_id === usuario?.id;
  const tieneSuperintendente = !!contratoSel && !!contratoSel.superintendente_id;

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionar = useCallback(async (id) => {
    setContratoId(id);
    setBitacora(null);
    if (!id) { setFechaEntregaSitio(''); return; }
    const c = contratos.find((x) => String(x.id) === String(id));
    setFechaEntregaSitio(soloFecha(c?.fecha_inicio));
    setCargando(true);
    try {
      const b = await api.bitacoraDeContrato(id);
      setBitacora(b);
    } catch (e) {
      if (e.status === 404) setBitacora(null);
      else showToast('No se pudo consultar la bitácora');
    } finally {
      setCargando(false);
    }
  }, [contratos, showToast]);

  const puedeAperturar = !soloLectura && soyResidenteDelContrato && tieneSuperintendente && !bitacora && !cargando && !!fechaEntregaSitio && !aperturando;

  const handleAperturar = async () => {
    if (!puedeAperturar) return;
    setAperturando(true);
    try {
      await api.abrirBitacora({ contratoId: Number(contratoId), fechaEntregaSitio });
      showToast('Bitácora aperturada. Cada parte ya puede firmar desde "Por firmar".');
      const b = await api.bitacoraDeContrato(contratoId);
      setBitacora(b);
    } catch (err) {
      if (err.status === 409) {
        showToast('Ya existe una bitácora para este contrato');
        const b = await api.bitacoraDeContrato(contratoId).catch(() => null);
        if (b) setBitacora(b);
      } else if (err.status === 403) {
        showToast('Solo el residente asignado puede aperturar la bitácora');
      } else if (err.status === 401) {
        showToast('Tu sesión expiró. Vuelve a iniciar sesión.');
      } else {
        showToast(err.message || 'No se pudo aperturar la bitácora');
      }
    } finally {
      setAperturando(false);
    }
  };

  const EquipoFila = ({ rol, nombre }) => (
    <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{ROL_LABEL[rol]}</div>
      <div className="text-sm font-semibold text-slate-800 mt-1">{nombre || '— sin asignar —'}</div>
    </div>
  );

  return (
    <div>
      <HeaderVista
        huId="HU-08"
        titulo="Apertura formal de la bitácora del contrato"
        sprint="Sprint 1"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Bitácora' }, { label: 'Apertura' }]}
      />

      {sinSesion ? (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-6 text-center text-sm text-slate-600">
          Inicia sesión en modo aplicación para aperturar o consultar la bitácora de un contrato.
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
            <label className="sg-label">Contrato</label>
            <select className="sg-input" value={contratoId} onChange={(e) => seleccionar(e.target.value)} data-testid="select-contrato">
              <option value="">— Selecciona un contrato —</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>
              ))}
            </select>
          </div>

          {!contratoId && <p className="text-sm text-slate-500">Selecciona un contrato para ver o aperturar su bitácora.</p>}
          {contratoId && cargando && <p className="text-sm text-slate-500">Consultando bitácora…</p>}

          {contratoId && !cargando && bitacora && <BitacoraReadOnly bitacora={bitacora} />}

          {contratoId && !cargando && !bitacora && (soloLectura || !soyResidenteDelContrato) && (
            <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 rounded-r-md text-sm text-slate-800">
              Este contrato aún no tiene bitácora aperturada. Solo el <strong>residente asignado</strong> al contrato puede aperturarla.
            </div>
          )}

          {contratoId && !cargando && !bitacora && !soloLectura && soyResidenteDelContrato && (
            <>
              <h2 className="text-lg font-bold text-sigecop-blue mb-2">Iniciar apertura</h2>
              <p className="text-sm text-slate-600 mb-4">
                Al iniciar la apertura se genera el acta inmutable y queda una <strong>firma pendiente por cada miembro del equipo</strong>. Nadie firma aquí: cada quien firma después desde su cuenta en <strong>“Por firmar”</strong>.
              </p>

              <RegionEditable disabled={soloLectura}>
                <div className="bg-white border border-slate-200 rounded-md p-5 mb-4 space-y-5">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Equipo que firmará (ligado a cuentas)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <EquipoFila rol="residente" nombre={contratoSel?.residente_nombre} />
                      <EquipoFila rol="superintendente" nombre={contratoSel?.superintendente_nombre} />
                      {contratoSel?.supervision_id
                        ? <EquipoFila rol="supervision" nombre={contratoSel?.supervision_nombre} />
                        : <div className="border border-dashed border-slate-200 rounded-md p-3 text-xs text-slate-400 flex items-center">Sin supervisión (opcional)</div>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Identificación del contrato</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div><label className="sg-label">Folio</label><input className="sg-input bg-slate-50" value={contratoSel?.folio || ''} readOnly /></div>
                      <div><label className="sg-label">Monto contractual</label><input className="sg-input bg-slate-50" value={mxn(contratoSel?.monto)} readOnly /></div>
                      <div><label className="sg-label">Plazo</label><input className="sg-input bg-slate-50" value={contratoSel?.plazo_dias != null ? `${contratoSel.plazo_dias} días` : '—'} readOnly /></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Fecha de entrega del sitio</div>
                    <div className="max-w-xs">
                      <label className="sg-label">Entrega del sitio <span className="text-red-600">*</span></label>
                      <input type="date" className="sg-input" value={fechaEntregaSitio} onChange={(e) => setFechaEntregaSitio(e.target.value)} disabled={soloLectura} required data-testid="input-fecha-apertura" />
                    </div>
                  </div>
                </div>
              </RegionEditable>

              <div className="mt-6 bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 rounded-r-md">
                <div className="text-sm font-semibold text-sigecop-amber-attention">⚠️ Evento formal inalterable</div>
                <p className="text-sm text-slate-800 mt-1">
                  La apertura se registra como evento formal inalterable conforme al art. 46 último párrafo LOPSRM y a los arts. 122-123 RLOPSRM. La fecha y hora quedan registradas y no pueden modificarse.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={!puedeAperturar} onClick={handleAperturar} className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" data-testid="btn-aperturar">
                  {aperturando ? 'Aperturando…' : 'Iniciar apertura'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <SeccionCriterios
        huId="HU-08"
        criterios={[
          { numero: 1, texto: 'Existe una bitácora única por contrato con el equipo (residente, superintendente y supervisión si aplica) ligado a sus cuentas de usuario.' },
          { numero: 2, texto: 'La fecha y hora de apertura queda registrada como evento formal inalterable; cada parte firma desde su propia cuenta (firma conjunta derivada de todas las firmas).' },
          { numero: 3, texto: 'La primera nota registra los datos obligatorios: identificación del contrato, objeto, datos financieros, cronograma contractual y registro de firmas (art. 122 RLOPSRM).' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">Fundamento: art. 122 RLOPSRM (Reglamento de la LOPSRM).</p>
    </div>
  );
}
