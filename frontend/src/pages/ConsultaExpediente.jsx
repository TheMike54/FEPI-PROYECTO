import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';
import { labelEstadoEstimacion } from '../data/estadoEstimacion.js';
import MatrizProgramaLectura, { periodoQueContiene } from '../components/programa/MatrizProgramaLectura.jsx';

// HU-04 cableado al backend. El expediente sale de GET /api/contratos/:id + los endpoints propios
// (programa, roster, plan de amortización, convenios, estimaciones). El acotamiento por participación
// es server-side; el front solo manda el token y muestra lo que el endpoint autorice.
//
// O9 (10-jun, W4c) — Se RETIRARON los "descargables" prototipo (PDF placeholder con jsPDF + Excel por
// bloque) y se reemplazaron por UN solo PDF REAL del expediente: una vista de impresión consolidada
// (print CSS) con TODOS los bloques, exportada con window.print desde un botón único. Es solo
// presentación: NO cambia la lógica de datos (consolida lo que ya se consulta).

const CAMPOS_BUSQUEDA = [
  { id: 'folio',       label: 'Folio' },
  { id: 'contratista', label: 'Contratista' },
  { id: 'empresa',     label: 'Empresa' }, // O3: búsqueda por empresa (catálogo del profe)
  { id: 'objeto',      label: 'Objeto' },
  { id: 'periodo',     label: 'Periodo' },
  { id: 'documento',   label: 'Tipo de documento' }
];

// pg devuelve NUMERIC y DATE como strings; coercemos al mostrar/calcular.
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const soloFecha = (f) => (f || '').slice(0, 10);

const moneda = (v) =>
  `$ ${num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Bloque colapsable. O9: el cuerpo SIEMPRE está en el DOM (se oculta en pantalla al colapsar) y al
// IMPRIMIR se fuerza visible (print:block) → el PDF consolidado incluye todos los bloques abiertos.
// `oculto` (filtro de búsqueda) esconde el bloque en pantalla pero también lo muestra al imprimir.
function BloqueExpediente({ bloque, children, oculto = false, abiertoDefault = true }) {
  const [abierto, setAbierto] = useState(abiertoDefault);
  // UI-1: tarjeta blanca con encabezado claro.
  return (
    <div
      className={`bg-white border border-borde rounded-lg overflow-hidden ${oculto ? 'hidden print:block' : ''}`}
      data-testid={`bloque-${bloque.id}`}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3 bg-pagina hover:bg-guinda-soft/60 transition-colors print:cursor-default"
        onClick={() => setAbierto((a) => !a)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{bloque.icono}</span>
          <h2 className="text-base font-medium text-tinta">{bloque.titulo}</h2>
        </div>
        <span className="text-tinta-sec text-sm print:hidden">{abierto ? '▾ ocultar' : '▸ ver'}</span>
      </button>
      <div className={`p-5 ${abierto ? '' : 'hidden print:block'}`}>{children}</div>
    </div>
  );
}

// O9: datos generales con el SUPERINTENDENTE VIGENTE del roster (art. 125: se sustituye, no se borra).
// El snapshot de texto del alta (contrato.contratista) queda como fallback.
function BloqueConfiguracion({ contrato, superVigente }) {
  const contenido = [
    { label: 'Folio',                   valor: contrato.folio },
    { label: 'Objeto',                  valor: contrato.objeto },
    { label: 'Superintendente vigente', valor: superVigente || contrato.contratista, testid: 'config-super-vigente' },
    { label: 'Dependencia',             valor: contrato.dependencia },
    { label: 'Monto',                   valor: `${moneda(contrato.monto)} MXN` },
    { label: 'Plazo',                   valor: `${num(contrato.plazo_dias)} días naturales` },
    { label: 'Modalidad',               valor: contrato.tipo },
    { label: 'Vigencia',                valor: `${soloFecha(contrato.fecha_inicio)} — ${soloFecha(contrato.fecha_termino)}` }
  ];
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="config-expediente">
      {contenido.map((c) => (
        <div key={c.label}>
          <dt className="text-xs uppercase font-semibold text-slate-500">{c.label}</dt>
          <dd className="text-sm text-slate-800 mt-0.5" data-testid={c.testid}>{c.valor || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function BloqueCatalogo({ conceptos }) {
  if (conceptos.length === 0) {
    return <p className="text-sm text-slate-400 italic">Este contrato no tiene catálogo de conceptos (precio alzado).</p>;
  }
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-sigecop-blue-light text-sigecop-blue">
          <tr>
            {/* O1-P12b (revisión profe, 09-jun): mostrar la CLAVE del concepto (art. 45 fr. IX RLOPSRM). */}
            <th className="text-left px-3 py-2 w-28">Clave</th>
            <th className="text-left px-3 py-2">Concepto</th>
            <th className="text-left px-3 py-2 w-20">Unidad</th>
            <th className="text-right px-3 py-2 w-28">Cantidad</th>
            <th className="text-right px-3 py-2 w-32">P.U.</th>
            <th className="text-right px-3 py-2 w-36">Importe</th>
          </tr>
        </thead>
        <tbody>
          {conceptos.map((c, i) => (
            <tr key={c.id ?? i} className="border-t border-slate-200 hover:bg-slate-50">
              <td className="px-3 py-2 font-mono text-xs text-slate-600" data-testid={`exp-concepto-clave-${i}`}>{c.clave || '—'}</td>
              <td className="px-3 py-2">{c.concepto}</td>
              <td className="px-3 py-2 text-slate-600">{c.unidad}</td>
              <td className="px-3 py-2 text-right">{num(c.cantidad).toLocaleString()}</td>
              <td className="px-3 py-2 text-right">${num(c.pu).toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-semibold">
                ${(Math.round(num(c.cantidad) * num(c.pu) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pase 1 (Plan 2): si el contrato tiene la matriz A2 (programa_obra + contrato_periodos) se pinta MES
// POR MES; si solo tiene actividades viejas (A1), su tabla; si nada, "no registrado".
// O9: + referencia a las versiones del programa (los snapshots viven en Convenios modificatorios).
function BloquePrograma({ programa, actividades, versiones }) {
  const periodos = Array.isArray(programa?.periodos) ? programa.periodos : [];
  const tieneMatriz = periodos.length > 0 && Array.isArray(programa?.conceptos) && programa.conceptos.length > 0;
  const refVersiones = Array.isArray(versiones) && versiones.length > 0
    ? (() => { const vig = versiones.find((v) => v.vigente); return `Programa VIGENTE — ${versiones.length} versión(es) registrada(s)${vig ? ` (vigente: v${vig.numero})` : ''}. El detalle de cada versión está en Convenios modificatorios.`; })()
    : null;
  const RefVersiones = () => (refVersiones
    ? <p className="text-xs text-slate-500 mt-3" data-testid="programa-versiones-ref">{refVersiones}</p>
    : null);

  if (tieneMatriz) {
    return (
      <div>
        <MatrizProgramaLectura
          programa={programa}
          periodoResaltadoNumero={periodoQueContiene(periodos, new Date().toISOString().slice(0, 10))}
        />
        <RefVersiones />
      </div>
    );
  }
  if (actividades.length === 0) {
    return <p className="text-sm text-slate-400 italic">Este contrato no tiene programa de obra registrado.</p>;
  }
  return (
    <div>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Actividad</th>
              <th className="text-left px-3 py-2 w-36">Inicio</th>
              <th className="text-left px-3 py-2 w-36">Término</th>
              <th className="text-right px-3 py-2 w-24">% peso</th>
            </tr>
          </thead>
          <tbody>
            {actividades.map((p, i) => (
              <tr key={p.id ?? i} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2">{p.actividad}</td>
                <td className="px-3 py-2">{soloFecha(p.inicio)}</td>
                <td className="px-3 py-2">{soloFecha(p.termino)}</td>
                <td className="px-3 py-2 text-right font-semibold">{num(p.peso)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RefVersiones />
    </div>
  );
}

function BloqueFianzas({ garantias }) {
  if (garantias.length === 0) {
    return <p className="text-sm text-slate-400 italic">Este contrato no tiene garantías capturadas.</p>;
  }
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-sigecop-blue-light text-sigecop-blue">
          <tr>
            <th className="text-left px-3 py-2">Tipo</th>
            <th className="text-left px-3 py-2">Afianzadora</th>
            <th className="text-left px-3 py-2 w-36">Póliza</th>
            <th className="text-right px-3 py-2 w-36">Monto</th>
            <th className="text-left px-3 py-2 w-36">Vigencia</th>
          </tr>
        </thead>
        <tbody>
          {garantias.map((f, i) => (
            <tr key={f.id ?? i} className="border-t border-slate-200 hover:bg-slate-50">
              <td className="px-3 py-2 font-medium">{f.tipo}</td>
              <td className="px-3 py-2">{f.afianzadora || '—'}</td>
              <td className="px-3 py-2 font-mono text-xs">{f.poliza || '—'}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{moneda(f.monto)}</td>
              <td className="px-3 py-2 text-slate-600 text-xs">{f.vigencia ? soloFecha(f.vigencia) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BloqueJuridicos({ juridicos, equipo }) {
  const j = juridicos || {};
  return (
    <div className="space-y-4 text-sm text-slate-800">
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">Firmante autorizado (dependencia)</div>
        <div>
          {j.firmanteDependencia || '—'}
          {j.cargoFirmante ? ` — ${j.cargoFirmante}` : ''}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">Representante legal (contratista)</div>
        <div>
          {j.representanteLegal || '—'}
          {j.cedulaProfesional ? ` — Cédula ${j.cedulaProfesional}` : ''}
        </div>
        {(j.poderNotarial || j.notaria) && (
          <div className="text-slate-600 mt-0.5">{[j.poderNotarial, j.notaria].filter(Boolean).join(' · ')}</div>
        )}
      </div>
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">Equipo del contrato</div>
        {/* O3: empresa de cada persona junto a su nombre (catálogo del profe). */}
        <ul className="list-disc list-inside text-slate-700 space-y-0.5">
          <li>Residente: {equipo.residente || '—'}{equipo.residenteEmpresa ? <span className="text-slate-500"> · {equipo.residenteEmpresa}</span> : ''}</li>
          <li>Superintendente (contratista): {equipo.superintendente || '—'}{equipo.superintendenteEmpresa ? <span className="text-slate-500"> · {equipo.superintendenteEmpresa}</span> : ''}</li>
          <li>Supervisión: {equipo.supervision || '— (no aplica)'}{equipo.supervisionEmpresa ? <span className="text-slate-500"> · {equipo.supervisionEmpresa}</span> : ''}</li>
        </ul>
      </div>
    </div>
  );
}

// O2 (10-jun) — PLAN DE AMORTIZACIÓN del anticipo (Fase A, lectura).
function BloquePlanAmortizacion({ data }) {
  const filas = Array.isArray(data?.plan) ? data.plan : [];
  if (filas.length === 0) {
    return <p className="text-sm text-slate-400 italic">Este contrato no tiene plan de amortización (sin anticipo o sin periodos).</p>;
  }
  const total = filas.reduce((s, f) => s + (Number(f.monto) || 0), 0);
  return (
    <div data-testid="plan-amortizacion-expediente">
      <p className="text-xs text-slate-500 mb-3">
        Anticipo del {Number(data.anticipo_pct) || 0}% — se amortiza con cargo a las estimaciones
        (art. 138 fr. I RLOPSRM). Plan capturado en el alta (editable, default proporcional).
      </p>
      <div className="overflow-x-auto border border-borde rounded-lg max-w-2xl">
        <table className="w-full text-sm">
          <thead className="bg-pagina text-tinta-sec">
            <tr>
              <th className="text-left px-3 py-2 w-24">Periodo</th>
              <th className="text-left px-3 py-2">Del — al</th>
              <th className="text-right px-3 py-2 w-44">Monto a amortizar</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.periodo_numero} className="border-t border-borde">
                <td className="px-3 py-2 font-medium">#{f.periodo_numero}</td>
                <td className="px-3 py-2 text-slate-600 text-xs">{soloFecha(f.inicio)} — {soloFecha(f.fin)}</td>
                <td className="px-3 py-2 text-right font-mono" data-testid={`plan-exp-monto-${f.periodo_numero}`}>
                  ${Number(f.monto).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr className="border-t border-borde-fuerte bg-pagina font-semibold">
              <td className="px-3 py-2" colSpan={2}>Total (= anticipo)</td>
              <td className="px-3 py-2 text-right font-mono" data-testid="plan-exp-total">
                ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pase 2.3 — Roster histórico / sustituciones de personas (art. 125 RLOPSRM).
const ROL_LABEL_ROSTER = { residente: 'Residente', superintendente: 'Superintendente', supervision: 'Supervisión' };
const MOTIVO_ALTA_ROSTER = 'Asignación inicial (alta del contrato)';
const eventoRoster = (h) => (h.sustituye_a != null ? 'Sustitución' : (h.motivo === MOTIVO_ALTA_ROSTER ? 'Alta del contrato' : 'Alta del rol'));
const motivoRoster = (h) => (h.sustituye_a == null && h.motivo === MOTIVO_ALTA_ROSTER ? '' : (h.motivo || ''));

function BloqueRoster({ roster }) {
  const historial = Array.isArray(roster?.historial) ? roster.historial : [];
  if (historial.length === 0) {
    return <p className="text-sm text-slate-400 italic">Este contrato no tiene roster versionado ni sustituciones registradas.</p>;
  }
  const sustituciones = historial.filter((h) => h.sustituye_a != null).length;
  return (
    <div data-testid="roster-expediente">
      <p className="text-xs text-slate-500 mb-3">
        Histórico de personas por rol (art. 125 RLOPSRM): {sustituciones} sustitución(es) registrada(s).
        Cada sustitución asienta su nota en la bitácora del contrato (art. 123 fr. III).
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2 w-36">Rol</th>
              <th className="text-left px-3 py-2">Persona</th>
              <th className="text-left px-3 py-2 w-28">Desde</th>
              <th className="text-left px-3 py-2 w-28">Hasta</th>
              <th className="text-left px-3 py-2 w-32">Evento</th>
              <th className="text-left px-3 py-2">Motivo</th>
              <th className="text-center px-3 py-2 w-28">Bitácora</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((h) => {
              const vigente = h.vigencia_hasta == null;
              return (
                <tr key={h.id} className={`border-t border-slate-200 ${vigente ? 'bg-green-50' : 'hover:bg-slate-50'}`} data-testid={`roster-fila-${h.id}`}>
                  <td className="px-3 py-2">{ROL_LABEL_ROSTER[h.rol] || h.rol}</td>
                  <td className="px-3 py-2 font-medium">
                    {h.usuario_nombre || `Usuario #${h.usuario_id}`}
                    {h.usuario_empresa && <span className="block text-xs font-normal text-slate-500" data-testid={`roster-exp-empresa-${h.id}`}>{h.usuario_empresa}</span>}
                  </td>
                  <td className="px-3 py-2">{soloFecha(h.vigencia_desde)}</td>
                  <td className="px-3 py-2">
                    {vigente
                      ? <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-sigecop-green-validation">Vigente</span>
                      : soloFecha(h.vigencia_hasta)}
                  </td>
                  <td className="px-3 py-2 text-slate-600" data-testid={`roster-exp-evento-${h.id}`}>{eventoRoster(h)}</td>
                  <td className="px-3 py-2 text-slate-700">{motivoRoster(h) || '—'}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    {h.sustituye_a == null
                      ? <span className="text-slate-400">—</span>
                      : h.nota_id
                        ? <span className="text-sigecop-green-validation" title={`Nota de bitácora #${h.nota_id}`}>📝 asentada</span>
                        : <span className="text-sigecop-amber-attention">pendiente al abrir</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// O6 (10-jun) — Convenios modificatorios (art. 59 LOPSRM). Historial INMUTABLE + estado de su NOTA de
// bitácora + link a las versiones del programa (su visor vive en HU-03).
const TIPO_CONVENIO_LABEL = { monto: 'Monto', plazo: 'Plazo', programa: 'Programa', mixto: 'Mixto' };
const pctConv = (n) => (n == null ? null : `${Number(n) >= 0 ? '+' : ''}${Number(n)}%`);

function BloqueConvenios({ data, contratoId }) {
  const convenios = Array.isArray(data?.convenios) ? data.convenios : [];
  const versiones = Array.isArray(data?.versiones) ? data.versiones : [];
  if (convenios.length === 0) {
    return <p className="text-sm text-slate-400 italic">Este contrato no tiene convenios modificatorios registrados.</p>;
  }
  return (
    <div data-testid="convenios-expediente">
      <p className="text-xs text-slate-500 mb-3">
        Historial inmutable de convenios (art. 59 LOPSRM / art. 99 RLOPSRM): {convenios.length} registrado(s).
        Cada convenio asienta su nota en la bitácora del contrato (art. 123 fr. III). Corregir = convenio nuevo.
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2 w-32">N.º / folio</th>
              <th className="text-left px-3 py-2 w-24">Tipo</th>
              <th className="text-left px-3 py-2">Cambio</th>
              <th className="text-left px-3 py-2">Motivo</th>
              <th className="text-left px-3 py-2 w-28">Fecha</th>
              <th className="text-center px-3 py-2 w-28">Bitácora</th>
            </tr>
          </thead>
          <tbody>
            {convenios.map((c) => (
              <tr key={c.id} className="border-t border-slate-200 align-top hover:bg-slate-50" data-testid={`convenio-fila-${c.id}`}>
                <td className="px-3 py-2 font-mono text-xs">{c.folio || `CM-${String(c.numero).padStart(3, '0')}`}</td>
                <td className="px-3 py-2">{TIPO_CONVENIO_LABEL[c.tipo] || c.tipo}</td>
                <td className="px-3 py-2 text-xs">
                  {(c.monto_anterior != null || c.monto_nuevo != null) && (
                    <div>Monto: {moneda(c.monto_anterior)} → {moneda(c.monto_nuevo)}{pctConv(c.delta_monto_pct) ? <span className="text-slate-400"> ({pctConv(c.delta_monto_pct)})</span> : null}</div>
                  )}
                  {(c.plazo_anterior_dias != null || c.plazo_nuevo_dias != null) && (
                    <div>Plazo: {c.plazo_anterior_dias ?? '—'} → {c.plazo_nuevo_dias ?? '—'} días{pctConv(c.delta_plazo_pct) ? <span className="text-slate-400"> ({pctConv(c.delta_plazo_pct)})</span> : null}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-700 max-w-xs">{c.motivo}</td>
                <td className="px-3 py-2 text-slate-600 text-xs">{soloFecha(c.fecha)}</td>
                <td className="px-3 py-2 text-center text-xs">
                  {c.nota_id
                    ? <span className="text-sigecop-green-validation" title={`Nota de bitácora #${c.nota_id}`} data-testid={`convenio-nota-${c.id}`}>📝 asentada</span>
                    : <span className="text-sigecop-amber-attention" data-testid={`convenio-nota-${c.id}`}>pendiente al abrir</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {versiones.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>Versiones del programa: {versiones.map((v) => `v${v.numero}${v.vigente ? ' (vigente)' : ''}`).join(' · ')}.</span>
          <Link
            to={`/contratos/modificatorios?contrato=${contratoId}`}
            className="font-semibold text-sigecop-accent hover:underline whitespace-nowrap print:hidden"
            data-testid="convenios-link-versiones"
          >
            Ver versiones del programa →
          </Link>
        </div>
      )}
    </div>
  );
}

// O9 — Resumen de estimaciones (ciclo de cobro). Números y estados; el detalle vive en sus HU (12–21).
// O7: las etiquetas del ciclo salen del util compartido (integrada→"Presentada", enviada→"Autorizada").
function BloqueEstimaciones({ estimaciones }) {
  const filas = Array.isArray(estimaciones) ? estimaciones : [];
  if (filas.length === 0) {
    return <p className="text-sm text-slate-400 italic">Este contrato no tiene estimaciones registradas.</p>;
  }
  const totalNeto = filas.reduce((s, e) => s + num(e.neto), 0);
  return (
    <div data-testid="estimaciones-expediente">
      <p className="text-xs text-slate-500 mb-3">
        Resumen del ciclo de cobro: {filas.length} estimación(es). El detalle (carátula, generadores) vive en sus HU (12–21).
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2 w-20">N.º</th>
              <th className="text-left px-3 py-2">Periodo</th>
              <th className="text-left px-3 py-2 w-40">Estado</th>
              <th className="text-right px-3 py-2 w-40">Neto</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => (
              <tr key={e.id} className="border-t border-slate-200 hover:bg-slate-50" data-testid={`estimacion-fila-${e.id}`}>
                <td className="px-3 py-2 font-medium">#{e.numero}</td>
                <td className="px-3 py-2 text-slate-600 text-xs">{soloFecha(e.periodo_inicio)} — {soloFecha(e.periodo_fin)}</td>
                <td className="px-3 py-2">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-pagina text-tinta-sec border border-borde" data-testid={`estimacion-estado-${e.id}`}>
                    {labelEstadoEstimacion(e.estado)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{moneda(e.neto)}</td>
              </tr>
            ))}
            <tr className="border-t border-borde-fuerte bg-pagina font-semibold">
              <td className="px-3 py-2" colSpan={3}>Total neto estimado</td>
              <td className="px-3 py-2 text-right font-mono" data-testid="estimaciones-total-neto">{moneda(totalNeto)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ConsultaExpediente() {
  const { token } = useSesion();
  useVistaHU('HU-04');
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [expediente, setExpediente] = useState(null);
  const [programa, setPrograma] = useState(null);     // Pase 1: matriz A2 (leerProgramaObra)
  const [roster, setRoster] = useState(null);         // Pase 2.3: roster histórico / sustituciones
  const [planAmort, setPlanAmort] = useState(null);   // O2: plan de amortización (Fase A, lectura)
  const [convenios, setConvenios] = useState(null);   // O6: convenios + versiones del programa
  const [estimaciones, setEstimaciones] = useState(null); // O9: resumen de estimaciones (ciclo de cobro)
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [campo, setCampo] = useState('folio');

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos()
      .then((l) => setContratos(Array.isArray(l) ? l : []))
      .catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setExpediente(null);
    setPrograma(null);
    setRoster(null);
    setPlanAmort(null);
    setConvenios(null);
    setEstimaciones(null);
    setError('');
    setQuery('');
    if (!id) return;
    setCargando(true);
    try {
      const data = await api.detalleContrato(id);
      setExpediente(data);
      try { setPrograma(await api.leerProgramaObra(id)); } catch (_) { setPrograma(null); }
      try { setRoster(await api.rosterContrato(id)); } catch (_) { setRoster(null); }
      try { setPlanAmort(await api.planAmortizacion(id)); } catch (_) { setPlanAmort(null); }
      try { setConvenios(await api.convenios(id)); } catch (_) { setConvenios(null); }
      // O9: resumen de estimaciones (endpoint propio, acotado por participación). 403/404/[] → [].
      try { setEstimaciones(await api.estimacionesDeContrato(id)); } catch (_) { setEstimaciones([]); }
    } catch (e) {
      setError(
        e.status === 403 ? 'No tienes acceso a este contrato.'
          : e.status === 404 ? 'Contrato no encontrado.'
            : 'No se pudo cargar el expediente.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  // Los bloques del expediente, derivados del contrato real. Cada bloque expone qué campos hace match
  // con el buscador. O9: + resumen de estimaciones; el orden es el del documento consolidado.
  const bloques = useMemo(() => {
    if (!expediente) return [];
    const c = expediente;
    const conceptos = Array.isArray(c.conceptos) ? c.conceptos : [];
    const actividades = Array.isArray(c.actividades) ? c.actividades : [];
    const periodosProg = Array.isArray(programa?.periodos) ? programa.periodos : [];
    const garantias = Array.isArray(c.garantias) ? c.garantias : [];
    const versiones = Array.isArray(convenios?.versiones) ? convenios.versiones : [];
    const jur = c.datos_juridicos || null;
    const superVigente = roster?.vigente?.superintendente?.nombre || null;
    const equipo = {
      residente: c.residente_nombre,
      superintendente: c.superintendente_nombre,
      supervision: c.supervision_nombre,
      residenteEmpresa: c.residente_empresa,
      superintendenteEmpresa: c.superintendente_empresa,
      supervisionEmpresa: c.supervision_empresa
    };
    return [
      {
        id: 'configuracion', titulo: 'Configuración del contrato', icono: '⚙️',
        haceMatch: (q, campo) => {
          const blob = `${c.folio} ${c.contratista} ${c.objeto} ${c.dependencia} ${c.tipo}`.toLowerCase();
          if (campo === 'folio')       return (c.folio || '').toLowerCase().includes(q);
          if (campo === 'contratista') return (c.contratista || '').toLowerCase().includes(q);
          if (campo === 'objeto')      return (c.objeto || '').toLowerCase().includes(q);
          if (campo === 'documento')   return 'configuración contrato'.includes(q);
          return blob.includes(q);
        },
        body: <BloqueConfiguracion contrato={c} superVigente={superVigente} />
      },
      {
        id: 'catalogo', titulo: 'Catálogo de conceptos', icono: '📐',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'catálogo conceptos'.includes(q);
          const blob = conceptos.map((x) => x.concepto).join(' ').toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueCatalogo conceptos={conceptos} />
      },
      {
        id: 'programa', titulo: 'Programa de obra', icono: '📅',
        haceMatch: (q, campo) => {
          if (campo === 'periodo') {
            return periodosProg.some((p) => `${soloFecha(p.inicio)} ${soloFecha(p.fin)}`.toLowerCase().includes(q))
              || actividades.some((p) => `${soloFecha(p.inicio)} ${soloFecha(p.termino)}`.toLowerCase().includes(q));
          }
          if (campo === 'documento') return 'programa obra'.includes(q);
          const blob = (`${programa?.ciclo || ''} `
            + periodosProg.map((p) => `${soloFecha(p.inicio)} ${soloFecha(p.fin)}`).join(' ') + ' '
            + actividades.map((p) => `${p.actividad} ${soloFecha(p.inicio)} ${soloFecha(p.termino)}`).join(' ')).toLowerCase();
          return blob.includes(q);
        },
        body: <BloquePrograma programa={programa} actividades={actividades} versiones={versiones} />
      },
      {
        id: 'fianzas', titulo: 'Fianzas y garantías', icono: '🛡️',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'fianzas garantías pólizas'.includes(q);
          const blob = garantias.map((f) => `${f.tipo} ${f.afianzadora || ''} ${f.poliza || ''}`).join(' ').toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueFianzas garantias={garantias} />
      },
      {
        id: 'amortizacion', titulo: 'Plan de amortización del anticipo', icono: '💰',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'plan amortización anticipo'.includes(q);
          const blob = ('plan amortización anticipo ' + (planAmort?.plan || []).map((f) => `${soloFecha(f.inicio)} ${soloFecha(f.fin)} ${f.monto}`).join(' ')).toLowerCase();
          return blob.includes(q);
        },
        body: <BloquePlanAmortizacion data={planAmort} />
      },
      {
        id: 'juridicos', titulo: 'Documentos jurídicos', icono: '⚖️',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'jurídicos cláusulas representación firmante'.includes(q);
          const empresasBlob = `${equipo.residenteEmpresa || ''} ${equipo.superintendenteEmpresa || ''} ${equipo.supervisionEmpresa || ''}`.toLowerCase();
          if (campo === 'empresa') return empresasBlob.includes(q);
          const blob = `${jur ? `${jur.firmanteDependencia || ''} ${jur.cargoFirmante || ''} ${jur.representanteLegal || ''} ${jur.cedulaProfesional || ''} ${jur.poderNotarial || ''} ${jur.notaria || ''}` : ''} ${equipo.residente || ''} ${equipo.superintendente || ''} ${equipo.supervision || ''} ${empresasBlob}`.toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueJuridicos juridicos={jur} equipo={equipo} />
      },
      {
        id: 'roster', titulo: 'Roster y sustituciones de personas', icono: '👥',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'roster sustitución personas equipo'.includes(q);
          const empresasRoster = (roster?.historial || []).map((h) => h.usuario_empresa || '').join(' ').toLowerCase();
          if (campo === 'empresa') return empresasRoster.includes(q);
          const blob = (roster?.historial || []).map((h) => `${h.usuario_nombre || ''} ${h.rol} ${h.motivo || ''} ${h.usuario_empresa || ''}`).join(' ').toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueRoster roster={roster} />
      },
      {
        id: 'convenios', titulo: 'Convenios modificatorios', icono: '📝',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'convenios modificatorios versiones programa'.includes(q);
          const blob = (convenios?.convenios || []).map((cv) => `${cv.folio || ''} ${cv.tipo} ${cv.motivo || ''}`).join(' ').toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueConvenios data={convenios} contratoId={c.id} />
      },
      {
        id: 'estimaciones', titulo: 'Resumen de estimaciones', icono: '🧾',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'estimaciones resumen ciclo cobro'.includes(q);
          const blob = (Array.isArray(estimaciones) ? estimaciones : []).map((e) => `#${e.numero} ${e.estado} ${soloFecha(e.periodo_inicio)}`).join(' ').toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueEstimaciones estimaciones={estimaciones} />
      }
    ];
  }, [expediente, programa, roster, planAmort, convenios, estimaciones]);

  const bloquesFiltrados = useMemo(() => {
    const terminos = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terminos.length === 0) return bloques;
    return bloques.filter((b) => terminos.every((t) => b.haceMatch(t, campo)));
  }, [bloques, query, campo]);
  const setFiltrados = useMemo(() => new Set(bloquesFiltrados), [bloquesFiltrados]);

  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Chrome de PANTALLA (selector, búsqueda, encabezado de vista) — oculto al imprimir. */}
      <div className="print:hidden">
        <HeaderVista
          huId="HU-04"
          titulo="Consulta integrada del expediente contractual"
          sprint="Sprint 4"
          rolAcademico="Residente"
          breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Contratos' }, { label: 'Expediente' }]}
        />

        {sinSesion && (
          <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
            Inicia sesión en modo aplicación para cargar tus contratos y consultar su expediente.
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
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

        {!sinSesion && !contratoId && (
          <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para ver su expediente integrado.</p>
        )}
        {cargando && <p className="text-sm text-slate-500 mb-4">Cargando expediente…</p>}
        {error && (
          <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 mb-4 text-sm text-amber-800 rounded-r-md" data-testid="aviso-error">
            {error}
          </div>
        )}
      </div>

      {expediente && (
        <>
          {/* Encabezado + búsqueda + botón Exportar — todo SOLO pantalla. */}
          <div className="print:hidden">
            <EncabezadoContrato
              titulo="Contrato"
              folio={expediente.folio}
              items={[{ value: roster?.vigente?.superintendente?.nombre || expediente.contratista }]}
              testid="banner-expediente"
            />

            <div className="bg-white border border-slate-200 rounded-md p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="sg-label">Buscar en el expediente</label>
                  <input
                    className="sg-input"
                    placeholder="Folio, palabra del objeto, contratista, fecha..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    data-testid="input-busqueda"
                  />
                </div>
                <div>
                  <label className="sg-label">Buscar por</label>
                  <select className="sg-input" value={campo} onChange={(e) => setCampo(e.target.value)}>
                    {CAMPOS_BUSQUEDA.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              {query && (
                <p className="text-xs text-slate-500 mt-2">
                  Mostrando {bloquesFiltrados.length} de {bloques.length} bloques que coinciden con "{query}".{' '}
                  <button type="button" className="text-sigecop-accent hover:underline" onClick={() => setQuery('')}>Limpiar</button>
                </p>
              )}
            </div>

            <div className="flex justify-end mb-6">
              <button
                type="button"
                className="sg-btn-primary"
                onClick={() => window.print()}
                data-testid="btn-exportar-pdf"
                title="Genera un PDF consolidado del expediente con la impresión del navegador"
              >
                🖨 Exportar expediente (PDF)
              </button>
            </div>
          </div>

          {/* Membrete SOLO impresión: encabeza el documento consolidado. */}
          <div className="hidden print:block mb-6" data-testid="print-header">
            <h1 className="text-xl font-bold text-tinta">Expediente del contrato {expediente.folio}</h1>
            <p className="text-sm text-slate-600">{expediente.objeto} · {expediente.dependencia || '—'}</p>
            <p className="text-xs text-slate-500">SIGECOP — Sistema de Gestión de Contratos de Obra Pública · Generado el {fechaHoy}</p>
          </div>

          {/* Bloques: TODOS en el DOM. La búsqueda oculta en pantalla los que no casan; la impresión los
              muestra todos y fuerza sus cuerpos abiertos → el PDF es el expediente consolidado completo. */}
          <div className="space-y-4">
            {bloques.map((b) => (
              <BloqueExpediente key={b.id} bloque={b} oculto={!setFiltrados.has(b)}>
                {b.body}
              </BloqueExpediente>
            ))}
            {bloquesFiltrados.length === 0 && (
              <div className="print:hidden bg-white border border-slate-200 rounded-md p-8 text-center text-slate-400 italic">
                Ningún bloque del expediente coincide con la búsqueda.
              </div>
            )}
          </div>
        </>
      )}

      <div className="print:hidden">
        <SeccionCriterios
          huId="HU-04"
          criterios={[
            { numero: 1, texto: 'El expediente muestra en una sola vista los bloques del contrato: configuración (con superintendente vigente), catálogo, programa, fianzas, plan de amortización, jurídicos, roster/sustituciones, convenios y resumen de estimaciones.' },
            { numero: 2, texto: 'El buscador filtra los bloques por folio, contratista, objeto, periodo o tipo de documento, con lógica Y.' },
            { numero: 3, texto: 'El expediente completo se exporta como un solo PDF (Exportar expediente → impresión consolidada del navegador), sin descargas sueltas por bloque.' }
          ]}
        />
      </div>
    </div>
  );
}
