import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { monedaMXN as moneda } from '../utils/formato.js';

// AMBIENTE DE CIERRE / FINIQUITO (sesión grande 18-jun, BLOQUE B) — cascarón que ENVUELVE HU-24 (finiquito)
// SIN fundir las historias. NO reemplaza /contratos/finiquito (esa sigue siendo la pantalla de HU-24): este
// ambiente la recorre por bloques read-only y DELEGA el cierre formal a HU-24.
//
// CASCARÓN: cada bloque es lectura (finiquitoPrep/bitacoraDeContrato/estimacionesDeContrato/listarPagos, que
// el backend YA calcula) + enlace a la ruta real. El POST transaccional (nota de finiquito + estado
// 'cerrado') lo hace el controller de HU-24 sin cambios; aquí NO se ejecuta cerrarFiniquito. Ruta NUEVA
// /contratos/cierre, fuera del catálogo (no toca permisos.js). Roles de HU-24: dependencia/residente.
// El finiquito ES una nota de bitácora (art. 64 LOPSRM); su documento contiene la relación de estimaciones
// y el saldo (art. 170 RLOPSRM).

function Bloque({ n, titulo, estado = 'activo', candado = false, children }) {
  const color = candado ? 'border-amber-300' : estado === 'listo' ? 'border-sigecop-green-validation' : 'border-borde';
  return (
    <section className={`bg-white border ${color} rounded-lg overflow-hidden`} data-testid={`bloque-cierre-${n}`}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${candado ? 'bg-amber-100 text-amber-800' : 'bg-guinda-soft text-guinda'}`}>{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {candado && <span className="ml-auto text-[11px] uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded" data-testid={`candado-cierre-${n}`}>🔒 En candado</span>}
        {estado === 'listo' && !candado && <span className="ml-auto text-[11px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">✓ Listo</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AmbienteFiniquito() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [prep, setPrep] = useState(null);
  const [estimaciones, setEstimaciones] = useState([]);
  const [pagos, setPagos] = useState([]);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setPrep(null); setEstimaciones([]); setPagos([]);
    if (!id) return;
    try {
      setPrep(await api.finiquitoPrep(id));
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudo preparar el finiquito');
    }
    try {
      const e = await api.estimacionesDeContrato(id);
      setEstimaciones(Array.isArray(e) ? e : (Array.isArray(e?.estimaciones) ? e.estimaciones : []));
    } catch (_) { /* informativo */ }
    try {
      const p = await api.listarPagos(id);
      setPagos(Array.isArray(p) ? p : (Array.isArray(p?.pagos) ? p.pagos : []));
    } catch (_) { /* informativo */ }
  }, [showToast]);

  const d = prep?.desglose || {};
  const tieneBitacora = !!prep?.tiene_bitacora;
  const cerrado = (prep?.contrato?.estado || '') === 'cerrado' || !!prep?.finiquito;
  const autorizadasPagadas = estimaciones.filter((e) => e.estado === 'autorizada' || e.estado === 'pagada');
  const q = contratoId ? `?contrato=${contratoId}` : '';

  return (
    <div className="space-y-4">
      <HeaderVista
        huId="HU-24"
        titulo="Ambiente de cierre del contrato (finiquito, por bloques)"
        sprint="Sprint 10"
        rolAcademico="Dependencia / Residencia"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Contrato' }, { label: 'Cierre' }]}
      />

      <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-r-md text-sm text-slate-700" data-testid="ambiente-cierre-aviso">
        <strong>Cierre del contrato por bloques.</strong> Recorre los prerrequisitos del finiquito
        (bitácora, estimaciones, pagos, saldo) y <strong>delega el cierre</strong> a la pantalla de finiquito
        (HU-24). No reemplaza ninguna vista; el saldo y el cierre los hace el sistema en HU-24.
      </div>

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Inicia sesión para preparar el cierre de un contrato.
        </div>
      )}

      {/* BLOQUE 1 — Contrato a cerrar. */}
      <Bloque n={1} titulo="Contrato a cerrar" estado={prep ? 'listo' : 'activo'}>
        <div className="max-w-2xl">
          <label className="sg-label">Contrato</label>
          <select className="sg-input" value={contratoId} onChange={(e) => seleccionarContrato(e.target.value)} disabled={sinSesion} data-testid="select-contrato">
            <option value="">— Selecciona un contrato —</option>
            {contratos.map((ct) => <option key={ct.id} value={ct.id}>{ct.folio} · {ct.objeto}</option>)}
          </select>
        </div>
        {cerrado && <p className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2" data-testid="ya-cerrado">Este contrato ya está <strong>cerrado</strong> (finiquito elaborado). Consulta el documento en el bloque 7.</p>}
      </Bloque>

      {/* BLOQUE 2 — Prerrequisito: bitácora abierta (el finiquito ES una nota, art. 64). */}
      <Bloque n={2} titulo="Prerrequisito: bitácora abierta (HU-08)" estado={tieneBitacora ? 'listo' : 'activo'} candado={!!prep && !tieneBitacora}>
        {!prep ? (
          <p className="text-sm text-slate-400 italic">Selecciona un contrato.</p>
        ) : tieneBitacora ? (
          <p className="text-sm text-emerald-800">✓ La bitácora está abierta: el finiquito puede asentarse como nota (art. 64 LOPSRM).</p>
        ) : (
          <div>
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3" data-testid="falta-bitacora">El finiquito se asienta como <strong>nota de bitácora</strong> (art. 64); este contrato aún no tiene bitácora abierta. Ábrela primero.</p>
            <Link to={`/bitacora/apertura${q}`} className="sg-btn-secondary" data-testid="link-apertura">Abrir la bitácora (HU-08) →</Link>
          </div>
        )}
      </Bloque>

      {/* BLOQUE 3 — Estimaciones que entran al saldo. */}
      <Bloque n={3} titulo="Estimaciones que entran al saldo (HU-12/13/15)">
        {contratoId && (
          <p className="text-sm mb-3" data-testid="estimaciones-saldo">
            <strong>{autorizadasPagadas.length}</strong> estimación(es) autorizada(s)/pagada(s) suman al importe del finiquito.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link to={`/estimaciones/integracion${q}`} className="sg-btn-secondary" data-testid="link-integracion">Integración (HU-12) →</Link>
          <Link to={`/estimaciones/envio${q}`} className="sg-btn-secondary" data-testid="link-envio">Presentación (HU-13) →</Link>
          <Link to={`/estimaciones/revision${q}`} className="sg-btn-secondary" data-testid="link-revision">Revisión (HU-15) →</Link>
        </div>
      </Bloque>

      {/* BLOQUE 4 — Pagos aplicados. */}
      <Bloque n={4} titulo="Pagos aplicados (HU-21)">
        {contratoId && (
          <p className="text-sm mb-3" data-testid="pagos-aplicados"><strong>{pagos.length}</strong> pago(s) aplicado(s); se descuentan del saldo final.</p>
        )}
        <Link to={`/pagos/registro${q}`} className="sg-btn-secondary" data-testid="link-registro">Registro de pagos (HU-21) →</Link>
      </Bloque>

      {/* BLOQUE 5 — Carátula del finiquito: saldo en vivo (read-only, lo calcula HU-24). */}
      <Bloque n={5} titulo="Saldo del finiquito (lo calcula el sistema)" estado={prep ? 'listo' : 'activo'}>
        {!prep ? (
          <p className="text-sm text-slate-400 italic">Selecciona un contrato para ver el saldo.</p>
        ) : (
          <div data-testid="saldo-finiquito">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><div className="text-xs text-slate-500">Importe neto aprobado</div><div className="font-semibold">{moneda(d.importe_neto_aprobado)}</div></div>
              <div><div className="text-xs text-slate-500">Total pagado</div><div className="font-semibold">{moneda(d.total_pagado)}</div></div>
              <div><div className="text-xs text-slate-500">Anticipo no amortizado</div><div className="font-semibold">{moneda(d.anticipo_no_amortizado)}</div></div>
              <div className="md:col-span-3 pt-2 border-t border-borde"><div className="text-xs text-slate-500">Saldo resultante</div><div className="text-lg font-bold text-guinda">{moneda(d.saldo)} {d.a_favor_de ? <span className="text-xs font-normal text-slate-500">a favor de {d.a_favor_de}</span> : null}</div></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">El saldo lo deriva el sistema (Σ neto autorizado/pagado − pagos − anticipo no amortizado ± ajustes). El detalle completo y los ajustes finales se editan en la pantalla del finiquito (HU-24).</p>
          </div>
        )}
      </Bloque>

      {/* BLOQUE 6 — Cierre formal (candado): DELEGA a HU-24. */}
      <Bloque n={6} titulo="Cierre formal del contrato (se elabora en HU-24)" candado={!!prep && !tieneBitacora && !cerrado}>
        <p className="text-sm text-slate-700 mb-3">
          El cierre formal (nota de finiquito + estado <strong>cerrado</strong>, inmutable y una sola vez) se
          realiza en la pantalla del finiquito. Este ambiente solo prepara el recorrido; no cierra por su
          cuenta.
        </p>
        {cerrado ? (
          <p className="text-sm text-emerald-800" data-testid="cierre-hecho">✓ El contrato ya fue cerrado.</p>
        ) : (
          <Link to={`/contratos/finiquito${q}`} className={`sg-btn-primary ${tieneBitacora ? '' : 'pointer-events-none opacity-50'}`} data-testid="link-cerrar">
            🔒 Ir a elaborar el finiquito y cerrar (HU-24) →
          </Link>
        )}
        {!!prep && !tieneBitacora && !cerrado && (
          <p className="text-xs text-amber-800 mt-2" data-testid="cierre-bloqueado">Falta abrir la bitácora (bloque 2) antes de poder cerrar.</p>
        )}
      </Bloque>

      {/* BLOQUE 7 — Documento art. 170 + constancia (si cerrado). */}
      <Bloque n={7} titulo="Documento del finiquito y constancia (art. 170)" estado={cerrado ? 'listo' : 'activo'}>
        <p className="text-sm text-slate-700 mb-3">
          Una vez cerrado, el finiquito vive como documento (art. 170 RLOPSRM: relación de estimaciones,
          importes y saldo) y como nota de bitácora; el expediente ya refleja el contrato como cerrado.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to={`/contratos/finiquito${q}`} className="sg-btn-secondary" data-testid="link-documento">Ver el documento del finiquito (HU-24) →</Link>
          <Link to={`/bitacora/consulta${q}`} className="sg-btn-secondary" data-testid="link-consulta">Nota de finiquito en la bitácora (HU-10) →</Link>
          <Link to={`/contratos/expediente${q}`} className="sg-btn-secondary" data-testid="link-expediente">Expediente del contrato (HU-04) →</Link>
        </div>
      </Bloque>
    </div>
  );
}
