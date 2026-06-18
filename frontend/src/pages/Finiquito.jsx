import { useState, useEffect, useCallback, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { monedaMXN as moneda } from '../utils/formato.js';

// HU-24 (FASE 4, revisión profe 16-jun) — FINIQUITO Y CIERRE DEL CONTRATO.
// El profe: "debe haber un cierre a fuerzas, hay que agregar finiquito… el finiquito es una nota de
// bitácora y el cálculo de todo lo que te debo / lo que me debes". Fundamento: LOPSRM art. 64, RLOPSRM
// arts. 168-172 (170 contenido mínimo del documento; 171 saldos a favor de cada parte). El saldo lo
// DERIVA el backend (no se recalcula la carátula); ajustes_finales es parametrizable (criterio del equipo,
// default conservador 0; el profe puede ajustar qué conceptos entran).

const fechaLarga = () => new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const A_FAVOR_TXT = {
  contratista: 'a favor del CONTRATISTA (se pone a su disposición el pago, art. 171 RLOPSRM)',
  dependencia: 'a favor de la DEPENDENCIA (el contratista reintegra, art. 171 RLOPSRM)',
  ninguno: 'en CERO (no hay créditos pendientes entre las partes)',
};

function Renglon({ etiqueta, valor, signo, fuerte, nota }) {
  return (
    <div className={`flex items-baseline justify-between py-2 border-b border-borde ${fuerte ? 'font-bold text-base' : 'text-sm'}`}>
      <div className="text-slate-700">{etiqueta}{nota && <span className="block text-[11px] text-slate-400 font-normal">{nota}</span>}</div>
      <div className={`font-mono ${fuerte ? 'text-tinta' : 'text-slate-800'}`}>{signo || ''}{moneda(valor)}</div>
    </div>
  );
}

// Documento imprimible del finiquito (contenido mínimo art. 170 RLOPSRM).
function DocumentoFiniquito({ contrato, desglose, finiquito, onCerrar }) {
  useEffect(() => {
    document.body.classList.add('doc-nota-abierto');
    return () => document.body.classList.remove('doc-nota-abierto');
  }, []);
  const d = desglose;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black bg-opacity-40 p-4 overflow-auto" data-testid="documento-finiquito">
      <div className="bg-white rounded-md shadow-lg max-w-3xl w-full my-6" data-print-area>
        <div className="px-6 py-3 border-b border-borde flex items-center justify-between" data-print-ocultar>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Documento de finiquito (art. 170 RLOPSRM)</h3>
          <div className="flex gap-2">
            <button type="button" className="sg-btn-primary" onClick={() => window.print()} data-testid="btn-imprimir-finiquito">🖨 Imprimir / PDF</button>
            <button type="button" className="text-slate-500 hover:text-slate-800 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
          </div>
        </div>
        <div className="p-6 text-sm text-tinta leading-relaxed space-y-3">
          <div className="text-center">
            <div className="font-bold text-lg">FINIQUITO DE LOS TRABAJOS</div>
            <div className="text-xs text-slate-500">Art. 64 LOPSRM · arts. 168-172 RLOPSRM</div>
          </div>
          <p><strong>I. Lugar y fecha:</strong> Chilpancingo, Guerrero, a {fechaLarga()}.</p>
          <p><strong>III. Contrato:</strong> {contrato.folio} — {contrato.objeto}.</p>
          <div className="border border-borde rounded-md p-4 bg-pagina space-y-1" data-testid="finiquito-doc-saldos">
            <div className="font-semibold mb-1">VI. Relación de créditos y saldo resultante:</div>
            <Renglon etiqueta="Importe real ejecutado (art. 170 fr. IV)" valor={d.importe_real_ejecutado} />
            <Renglon etiqueta="Importe neto estimado y autorizado (art. 54)" valor={d.importe_neto_aprobado} />
            <Renglon etiqueta="(−) Total pagado" valor={d.total_pagado} signo="−" />
            <Renglon etiqueta="(−) Anticipo no amortizado (art. 143)" valor={d.anticipo_no_amortizado} signo="−" />
            {!!d.ajustes_finales && <Renglon etiqueta="(−) Ajustes finales" valor={d.ajustes_finales} signo="−" />}
            <Renglon etiqueta="Saldo resultante" valor={Math.abs(d.saldo)} fuerte nota={A_FAVOR_TXT[d.a_favor_de]} />
          </div>
          {finiquito?.observaciones && <p><strong>Observaciones:</strong> {finiquito.observaciones}</p>}
          <p><strong>X.</strong> Con la firma del presente finiquito se da por terminado el contrato y se extinguen los
            derechos y obligaciones de las partes (art. 172 RLOPSRM), subsistiendo únicamente la garantía por
            vicios ocultos (art. 66 LOPSRM).</p>
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
            <div className="border-t border-tinta pt-1">Por la dependencia (residente / supervisión)</div>
            <div className="border-t border-tinta pt-1">Por el contratista (superintendente)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Finiquito() {
  const { token, usuario, rol } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;
  const puedeCerrar = ['dependencia', 'residente'].includes(rol);

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [data, setData] = useState(null);          // { contrato, desglose, finiquito, tiene_bitacora }
  const [cargando, setCargando] = useState(false);
  const [ajustes, setAjustes] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [verDoc, setVerDoc] = useState(false);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const cargar = useCallback(async (id, aj) => {
    if (!id) { setData(null); return; }
    setCargando(true);
    try {
      setData(await api.finiquitoPrep(id, aj));
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudo cargar el finiquito');
      setData(null);
    } finally { setCargando(false); }
  }, [showToast]);

  const seleccionar = useCallback((id) => {
    setContratoId(id); setAjustes(''); setObservaciones(''); setConfirmar(false); setVerDoc(false);
    cargar(id, '');
  }, [cargar]);

  const cerrado = data?.contrato?.estado === 'cerrado' || !!data?.finiquito;
  const d = data?.desglose;

  const handleCerrar = async () => {
    if (!puedeCerrar || cerrando) return;
    setCerrando(true);
    try {
      const res = await api.cerrarFiniquito(contratoId, { ajustes_finales: ajustes === '' ? 0 : Number(ajustes), observaciones });
      showToast(`Finiquito elaborado. Contrato ${res.contrato.folio} CERRADO. Nota de bitácora #${res.nota.numero}.`);
      setConfirmar(false);
      await cargar(contratoId, ajustes);
      setVerDoc(true);
    } catch (e) {
      showToast(e.status === 409 ? (e.message || 'El contrato ya está cerrado')
        : e.status === 403 ? 'Solo la dependencia o el residente puede elaborar el finiquito'
          : (e.message || 'No se pudo elaborar el finiquito'));
    } finally { setCerrando(false); }
  };

  return (
    <div>
      <HeaderVista
        huId="HU-24"
        titulo="Finiquito y cierre del contrato"
        sprint="Sprint 9"
        rolAcademico="Residente / Dependencia"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Contratos' }, { label: 'Finiquito' }]}
      />

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión para elaborar el finiquito y cerrar un contrato.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
        <label className="sg-label">Contrato</label>
        <select className="sg-input" value={contratoId} onChange={(e) => seleccionar(e.target.value)} disabled={sinSesion} data-testid="select-contrato">
          <option value="">— Selecciona un contrato —</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
        </select>
      </div>

      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando finiquito…</p>}

      {data && d && (
        <>
          {cerrado && (
            <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 rounded-r-md mb-4" data-testid="finiquito-cerrado">
              <div className="text-sm font-semibold text-sigecop-green-validation">✓ Contrato CERRADO (finiquito elaborado)</div>
              <p className="text-sm text-slate-700 mt-1">Los derechos y obligaciones quedaron extinguidos (art. 172 RLOPSRM). El finiquito es inalterable.</p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-md p-5 mb-6 max-w-2xl" data-testid="finiquito-desglose">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
              Cálculo del saldo (art. 64 LOPSRM)
            </h2>
            <Renglon etiqueta="Importe real ejecutado" valor={d.importe_real_ejecutado} nota="Σ ejecutado × P.U. (art. 170 fr. IV, informativo)" />
            <Renglon etiqueta="Importe neto estimado y autorizado" valor={d.importe_neto_aprobado} nota="Σ neto de estimaciones autorizadas/pagadas (art. 54)" />
            <Renglon etiqueta="(−) Total pagado" valor={d.total_pagado} signo="−" />
            <Renglon etiqueta="(−) Anticipo no amortizado" valor={d.anticipo_no_amortizado} signo="−" nota="anticipo − amortización aplicada (art. 143)" />
            {!cerrado && puedeCerrar && (
              <div className="flex items-baseline justify-between py-2 border-b border-borde text-sm">
                <div className="text-slate-700">(−) Ajustes finales <span className="text-[11px] text-slate-400">parametrizable (default 0): deductivas finales / sobrecosto / 5-al-millar pendiente</span></div>
                <input type="number" step="0.01" className="sg-input w-40 text-right font-mono" value={ajustes}
                  onChange={(e) => { setAjustes(e.target.value); cargar(contratoId, e.target.value); }} placeholder="0.00" data-testid="finiquito-ajustes" />
              </div>
            )}
            {cerrado && !!d.ajustes_finales && <Renglon etiqueta="(−) Ajustes finales" valor={d.ajustes_finales} signo="−" />}
            <div className="flex items-baseline justify-between pt-3 mt-1 font-bold text-lg" data-testid="finiquito-saldo">
              <div className="text-tinta">Saldo resultante</div>
              <div className={`font-mono ${d.a_favor_de === 'dependencia' ? 'text-red-700' : 'text-sigecop-green-validation'}`}>{moneda(Math.abs(d.saldo))}</div>
            </div>
            <p className="text-xs text-slate-500 mt-1" data-testid="finiquito-afavor">Saldo {A_FAVOR_TXT[d.a_favor_de]}.</p>
          </div>

          {!cerrado && (
            <div className="max-w-2xl">
              {!data.tiene_bitacora && (
                <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 mb-4 text-sm text-amber-800 rounded-r-md" data-testid="finiquito-sin-bitacora">
                  Este contrato no tiene bitácora abierta. El finiquito se asienta como nota de bitácora, así que primero debe aperturarse.
                </div>
              )}
              {puedeCerrar ? (
                <>
                  <label className="sg-label">Observaciones (opcional)</label>
                  <textarea className="sg-input mb-3" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} data-testid="finiquito-observaciones" />
                  {!confirmar ? (
                    <button type="button" className="sg-btn-primary disabled:opacity-50" disabled={!data.tiene_bitacora} onClick={() => setConfirmar(true)} data-testid="btn-abrir-cierre">
                      🔒 Cerrar contrato (elaborar finiquito)
                    </button>
                  ) : (
                    <div className="bg-white border-2 border-guinda rounded-md p-4" data-testid="finiquito-confirmar">
                      <p className="text-sm font-semibold text-tinta mb-1">¿Seguro que vas a cerrar el contrato?</p>
                      <p className="text-xs text-slate-600 mb-3">El finiquito es inalterable y extingue los derechos y obligaciones (art. 172 RLOPSRM). Esta acción no se puede deshacer.</p>
                      <div className="flex gap-2">
                        <button type="button" className="sg-btn-primary" disabled={cerrando} onClick={handleCerrar} data-testid="btn-confirmar-cierre">
                          {cerrando ? 'Elaborando…' : 'Sí, elaborar finiquito y cerrar'}
                        </button>
                        <button type="button" className="sg-btn-secondary" disabled={cerrando} onClick={() => setConfirmar(false)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">Solo la dependencia o el residente asignado puede elaborar el finiquito.</p>
              )}
            </div>
          )}

          {cerrado && (
            <button type="button" className="sg-btn-secondary" onClick={() => setVerDoc(true)} data-testid="btn-ver-documento-finiquito">
              📄 Ver documento de finiquito (art. 170)
            </button>
          )}
        </>
      )}

      {verDoc && d && <DocumentoFiniquito contrato={data.contrato} desglose={d} finiquito={data.finiquito} onCerrar={() => setVerDoc(false)} />}

      <SeccionCriterios
        huId="HU-24"
        criterios={[
          { numero: 1, texto: 'El sistema calcula el saldo del finiquito (importe neto autorizado − pagado − anticipo no amortizado − ajustes), determinando si resulta a favor del contratista o de la dependencia (art. 64 LOPSRM).' },
          { numero: 2, texto: 'Al elaborar el finiquito se asienta una nota de bitácora de finiquito y el contrato queda CERRADO; el finiquito es inalterable y solo puede haber uno por contrato.' },
          { numero: 3, texto: 'El documento de finiquito es imprimible con el contenido mínimo del art. 170 RLOPSRM (descripción, importes, saldo resultante y extinción de obligaciones).' },
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 64 LOPSRM · arts. 168-172 RLOPSRM. Los ajustes finales (deductivas/sobrecosto/5-al-millar pendiente) son parametrizables (criterio del equipo, default 0; el profe confirma qué conceptos entran).
      </p>
    </div>
  );
}
