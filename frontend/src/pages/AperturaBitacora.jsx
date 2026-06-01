import { useState, useEffect, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { partesBitacoraDummy } from '../data/dummy.js';

const formatoMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const soloFecha = (s) => (s ? String(s).slice(0, 10) : '');
const mxn = (v) => (v == null || v === '' ? '—' : formatoMXN.format(Number(v)));

// Tarjeta editable de cada parte firmante (formulario de apertura).
function ParteCard({ parte, valores, onChange, soloLectura, deshabilitada }) {
  const aplica = valores.aplica !== false;
  const firmado = valores.firmado === true;
  const inactivaCampos = soloLectura || deshabilitada || !aplica;
  const inactivaFirma = soloLectura || deshabilitada || !aplica || firmado;
  return (
    <div className={`bg-white border ${firmado ? 'border-sigecop-green-validation' : 'border-slate-200'} rounded-md p-5 ${!aplica ? 'opacity-70' : ''}`} data-parte={parte.num}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-sigecop-blue text-white flex items-center justify-center font-bold flex-shrink-0">{parte.num}</div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-sigecop-accent uppercase tracking-wider">Parte {parte.num}{parte.opcional ? ' · opcional' : ''}</div>
          <div className="font-bold text-slate-900">{parte.titulo}</div>
        </div>
        {!aplica ? (
          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded">No aplica</span>
        ) : firmado ? (
          <span className="inline-block px-2 py-1 bg-green-100 text-sigecop-green-validation text-xs font-semibold rounded">✓ Firmado</span>
        ) : (
          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded">Pendiente de firma</span>
        )}
      </div>

      {parte.opcional && (
        <div className="mb-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" disabled={soloLectura || deshabilitada} checked={!aplica} onChange={(e) => onChange('aplica', !e.target.checked)} />
            No aplica (el contrato no contempla supervisor externo)
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="sg-label">Firmante autorizado</label>
          <input className="sg-input" value={valores.firmante} disabled={inactivaCampos} onChange={(e) => onChange('firmante', e.target.value)} />
        </div>
        <div>
          <label className="sg-label">{parte.cargoLabel}</label>
          <input className="sg-input" value={valores.cargo} disabled={inactivaCampos} onChange={(e) => onChange('cargo', e.target.value)} />
        </div>
        <div>
          <label className="sg-label">Correo electrónico</label>
          <input type="email" className="sg-input" value={valores.correo} disabled={inactivaCampos} onChange={(e) => onChange('correo', e.target.value)} />
        </div>
        <div>
          <label className="sg-label">Firmar</label>
          {firmado ? (
            <div className="sg-input bg-sigecop-green-bg text-sigecop-green-validation font-semibold flex items-center">✓ Firmado · {valores.fechaFirma}</div>
          ) : (
            <button type="button" disabled={inactivaFirma} onClick={() => onChange('firmar', null)} className="sg-btn-primary w-full disabled:bg-slate-300 disabled:cursor-not-allowed" data-testid={`btn-firmar-${parte.num}`}>Firmar</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Render solo-lectura de una bitácora ya persistida (inalterable).
function BitacoraReadOnly({ bitacora }) {
  const acta = bitacora.acta || {};
  const ident = acta.identificacion || {};
  const fin = acta.datos_financieros || {};
  const cron = acta.cronograma || {};
  const firmas = (bitacora.firmantes && bitacora.firmantes.length ? bitacora.firmantes : acta.firmas) || [];
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
            <Dato label="Inicio (entrega del sitio)" valor={soloFecha(cron.inicio)} />
            <Dato label="Término contractual" valor={soloFecha(cron.fin)} />
            <Dato label="Fecha de entrega del sitio" valor={soloFecha(cron.entrega_sitio)} />
          </div>
        </Grupo>
        <Grupo titulo="Registro de firmas">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {firmas.map((f) => (
              <div key={f.parte} className="border border-slate-200 rounded-md p-3 bg-white">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parte {f.parte} · {f.titulo}</div>
                {f.aplica === false ? (
                  <div className="text-sm text-slate-500 italic mt-1">No aplica</div>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-slate-800 mt-1">{f.firmante}</div>
                    {f.cargo && <div className="text-xs text-slate-600">{f.cargo}</div>}
                    <div className="text-xs text-sigecop-green-validation font-semibold mt-1">
                      ✓ Firmado{f.firmado_en ? ' · ' + new Date(f.firmado_en).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </div>
                  </>
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
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-08');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [bitacora, setBitacora] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [aperturando, setAperturando] = useState(false);

  const templatePartes = () =>
    partesBitacoraDummy.reduce((acc, p) => {
      acc[p.num] = { firmante: p.firmante, cargo: p.cargo, correo: p.correo, firmado: false, fechaFirma: null, aplica: true };
      return acc;
    }, {});
  const [partes, setPartes] = useState(templatePartes);
  const [primeraNota, setPrimeraNota] = useState({ fechaInicioCronograma: '', fechaFinCronograma: '', fechaApertura: '' });

  const contratoSel = contratos.find((c) => String(c.id) === String(contratoId)) || null;

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionar = useCallback(async (id) => {
    setContratoId(id);
    setBitacora(null);
    setPartes(templatePartes());
    if (!id) { setPrimeraNota({ fechaInicioCronograma: '', fechaFinCronograma: '', fechaApertura: '' }); return; }
    const c = contratos.find((x) => String(x.id) === String(id));
    if (c) {
      setPrimeraNota({
        fechaInicioCronograma: soloFecha(c.fecha_inicio),
        fechaFinCronograma: soloFecha(c.fecha_termino),
        fechaApertura: soloFecha(c.fecha_inicio)
      });
    }
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

  const handleChangeParte = (num) => (campo, valor) => {
    setPartes((prev) => {
      const actual = prev[num];
      if (campo === 'firmar') {
        const fecha = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
        return { ...prev, [num]: { ...actual, firmado: true, fechaFirma: fecha } };
      }
      if (campo === 'aplica') {
        return { ...prev, [num]: { ...actual, aplica: valor, firmado: valor ? actual.firmado : false, fechaFirma: valor ? actual.fechaFirma : null } };
      }
      return { ...prev, [num]: { ...actual, [campo]: valor } };
    });
  };
  const handleChangeNota = (campo) => (e) => setPrimeraNota((prev) => ({ ...prev, [campo]: e.target.value }));

  const fechasOk = !!primeraNota.fechaInicioCronograma && !!primeraNota.fechaFinCronograma && !!primeraNota.fechaApertura;
  const firmasOk = partesBitacoraDummy.every((tpl) => { const p = partes[tpl.num]; return p.aplica === false || p.firmado === true; });
  const puedeAperturar = !soloLectura && !!contratoId && !bitacora && !cargando && fechasOk && firmasOk && !aperturando;

  const handleAperturar = async () => {
    if (!puedeAperturar) return;
    setAperturando(true);
    try {
      const firmantes = partesBitacoraDummy.map((tpl) => {
        const v = partes[tpl.num];
        return { parte: tpl.num, titulo: tpl.titulo, firmante: v.firmante, cargoLabel: tpl.cargoLabel, cargo: v.cargo, correo: v.correo, opcional: tpl.opcional, aplica: v.aplica, firmado: v.firmado };
      });
      const payload = {
        contratoId: Number(contratoId),
        fechaEntregaSitio: primeraNota.fechaApertura,
        fechaInicioCronograma: primeraNota.fechaInicioCronograma,
        fechaFinCronograma: primeraNota.fechaFinCronograma,
        firmantes
      };
      await api.abrirBitacora(payload);
      showToast('Bitácora aperturada');
      const b = await api.bitacoraDeContrato(contratoId);
      setBitacora(b);
    } catch (err) {
      if (err.status === 409) {
        showToast('Ya existe una bitácora para este contrato');
        const b = await api.bitacoraDeContrato(contratoId).catch(() => null);
        if (b) setBitacora(b);
      } else if (err.status === 403) {
        showToast('Solo el residente puede aperturar la bitácora');
      } else if (err.status === 401) {
        showToast('Tu sesión expiró. Vuelve a iniciar sesión.');
      } else {
        showToast(err.message || 'No se pudo aperturar la bitácora');
      }
    } finally {
      setAperturando(false);
    }
  };

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
          Inicia sesión en modo aplicación (como residente) para aperturar o consultar la bitácora de un contrato.
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

          {contratoId && !cargando && !bitacora && soloLectura && (
            <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 rounded-r-md text-sm text-slate-800">
              Este contrato aún no tiene bitácora aperturada. Solo el residente puede aperturarla.
            </div>
          )}

          {contratoId && !cargando && !bitacora && !soloLectura && (
            <>
              <h2 className="text-lg font-bold text-sigecop-blue mb-4">Firma conjunta de los tres autorizados</h2>
              <RegionEditable disabled={soloLectura}>
                <div className="space-y-4">
                  {partesBitacoraDummy.map((p) => (
                    <ParteCard key={p.num} parte={p} valores={partes[p.num]} onChange={handleChangeParte(p.num)} soloLectura={soloLectura} deshabilitada={aperturando} />
                  ))}
                </div>
              </RegionEditable>

              <h2 className="text-lg font-bold text-sigecop-blue mt-8 mb-4">Primera nota de bitácora</h2>
              <RegionEditable disabled={soloLectura}>
                <div className="bg-white border border-slate-200 rounded-md p-5 mb-4 space-y-5">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Identificación del contrato</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><label className="sg-label">Folio</label><input className="sg-input bg-slate-50" value={contratoSel?.folio || ''} readOnly /></div>
                      <div><label className="sg-label">Dependencia</label><input className="sg-input bg-slate-50" value={contratoSel?.dependencia || ''} readOnly /></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Objeto de los trabajos</div>
                    <input className="sg-input bg-slate-50" value={contratoSel?.objeto || ''} readOnly />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Datos financieros</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div><label className="sg-label">Monto contractual</label><input className="sg-input bg-slate-50" value={mxn(contratoSel?.monto)} readOnly /></div>
                      <div><label className="sg-label">Anticipo</label><input className="sg-input bg-slate-50" value={contratoSel?.anticipo_pct != null ? `${contratoSel.anticipo_pct}%` : '—'} readOnly /></div>
                      <div><label className="sg-label">Plazo de ejecución</label><input className="sg-input bg-slate-50" value={contratoSel?.plazo_dias != null ? `${contratoSel.plazo_dias} días` : '—'} readOnly /></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Cronograma contractual</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="sg-label">Inicio (= entrega del sitio) <span className="text-red-600">*</span></label>
                        <input type="date" className="sg-input" value={primeraNota.fechaInicioCronograma} onChange={handleChangeNota('fechaInicioCronograma')} disabled={soloLectura} required />
                      </div>
                      <div>
                        <label className="sg-label">Término contractual <span className="text-red-600">*</span></label>
                        <input type="date" className="sg-input" value={primeraNota.fechaFinCronograma} onChange={handleChangeNota('fechaFinCronograma')} disabled={soloLectura} required />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Fecha de apertura</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="sg-label">Fecha de entrega del sitio <span className="text-red-600">*</span></label>
                        <input type="date" className="sg-input" value={primeraNota.fechaApertura} onChange={handleChangeNota('fechaApertura')} disabled={soloLectura} required data-testid="input-fecha-apertura" />
                      </div>
                    </div>
                  </div>
                </div>
              </RegionEditable>

              <div className="mt-6 bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 rounded-r-md">
                <div className="text-sm font-semibold text-sigecop-amber-attention">⚠️ Evento formal inalterable</div>
                <p className="text-sm text-slate-800 mt-1">
                  Esta apertura se registrará como evento formal inalterable conforme al art. 46 último párrafo LOPSRM y a los arts. 122-123 RLOPSRM. Una vez abierta, la fecha y hora quedan registradas y no pueden modificarse.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900">Cancelar</button>
                <button type="button" disabled={!puedeAperturar} onClick={handleAperturar} className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" data-testid="btn-aperturar">
                  {aperturando ? 'Aperturando…' : 'Aperturar bitácora'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <SeccionCriterios
        huId="HU-08"
        criterios={[
          { numero: 1, texto: 'Existe una bitácora única por contrato con las tres partes ligadas y sus firmantes autorizados (residente, supervisor externo si existe, superintendente).' },
          { numero: 2, texto: 'La fecha y hora de apertura (fecha de entrega del sitio) queda registrada como evento formal inalterable, con la firma conjunta de los tres autorizados.' },
          { numero: 3, texto: 'La primera nota registra los datos obligatorios: identificación del contrato, objeto, datos financieros, cronograma contractual y registro de firmas (art. 122 RLOPSRM).' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">Fundamento: art. 122 RLOPSRM (Reglamento de la LOPSRM).</p>
    </div>
  );
}
