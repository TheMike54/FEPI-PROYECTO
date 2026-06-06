import { useState, useEffect, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import { descargarExcelHoja } from '../services/excelExport.js';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';
import MatrizProgramaLectura, { periodoQueContiene } from '../components/programa/MatrizProgramaLectura.jsx';

// HU-04 cableado al backend. El expediente sale de GET /api/contratos/:id, que
// devuelve la cabecera + los bloques hijos (conceptos, actividades, garantias) +
// datos_juridicos. El acotamiento por participación es server-side; el front solo
// manda el token (igual que HU-10) y muestra lo que el endpoint autorice.

const CAMPOS_BUSQUEDA = [
  { id: 'folio',       label: 'Folio' },
  { id: 'contratista', label: 'Contratista' },
  { id: 'objeto',      label: 'Objeto' },
  { id: 'periodo',     label: 'Periodo' },
  { id: 'documento',   label: 'Tipo de documento' }
];

// pg devuelve NUMERIC y DATE como strings; coercemos al mostrar/calcular.
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const soloFecha = (f) => (f || '').slice(0, 10);

const moneda = (v) =>
  `$ ${num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Genera un PDF placeholder de 1 página con jsPDF y dispara la descarga.
function descargarPDFPlaceholder(documento, folio) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(documento, 20, 30);
  doc.setFontSize(12);
  doc.text(`Contrato: ${folio}`, 20, 50);
  doc.text(`Fecha de descarga: ${new Date().toLocaleDateString('es-MX')}`, 20, 60);
  doc.setFontSize(10);
  doc.text('— Placeholder PDF generado en cliente —', 20, 80);
  doc.text('SIGECOP — prototipo de descarga real (sin backend).', 20, 88);
  const slug = documento
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  doc.save(`${slug}_${folio}.pdf`);
}

// Descarga un .xlsx con exceljs a partir de filas {col: valor}. Mantiene la
// firma del helper local previo para no romper los call sites del componente.
function descargarExcel(filas, nombreHoja, nombreArchivo) {
  // El componente no espera promesa; lanzamos sin await porque la salida es
  // un download del navegador y los errores se muestran en consola.
  descargarExcelHoja(nombreArchivo, nombreHoja, filas);
}

const JURIDICOS_DOCS = [
  { id: 'representacion', label: 'Escritura de representación legal' },
  { id: 'designacion',    label: 'Oficio de designación de firmante' },
  { id: 'clausulas',      label: 'Clausulado vigente del contrato' }
];

// Botón pequeño de descarga, reutilizable en todos los bloques.
function BtnDescargar({ etiqueta, onClick, testid }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-sigecop-blue-light text-sigecop-blue rounded hover:bg-sigecop-blue hover:text-white transition-colors"
      onClick={onClick}
      data-testid={testid}
    >
      ⬇ {etiqueta}
    </button>
  );
}

function BloqueExpediente({ bloque, children, abiertoDefault = true }) {
  const [abierto, setAbierto] = useState(abiertoDefault);
  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setAbierto((a) => !a)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{bloque.icono}</span>
          <h2 className="text-base font-bold text-sigecop-blue">{bloque.titulo}</h2>
        </div>
        <span className="text-slate-500 text-sm">{abierto ? '▾ ocultar' : '▸ ver'}</span>
      </button>
      {abierto && <div className="p-5">{children}</div>}
    </div>
  );
}

function BloqueConfiguracion({ contrato }) {
  const contenido = [
    { label: 'Folio',        valor: contrato.folio },
    { label: 'Objeto',       valor: contrato.objeto },
    { label: 'Contratista',  valor: contrato.contratista },
    { label: 'Dependencia',  valor: contrato.dependencia },
    { label: 'Monto',        valor: `${moneda(contrato.monto)} MXN` },
    { label: 'Plazo',        valor: `${num(contrato.plazo_dias)} días naturales` },
    { label: 'Modalidad',    valor: contrato.tipo },
    { label: 'Vigencia',     valor: `${soloFecha(contrato.fecha_inicio)} — ${soloFecha(contrato.fecha_termino)}` }
  ];
  return (
    <div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contenido.map((c) => (
          <div key={c.label}>
            <dt className="text-xs uppercase font-semibold text-slate-500">{c.label}</dt>
            <dd className="text-sm text-slate-800 mt-0.5">{c.valor || '—'}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex justify-end gap-2">
        <BtnDescargar
          etiqueta="Contrato firmado (PDF)"
          onClick={() => descargarPDFPlaceholder('Contrato firmado', contrato.folio)}
          testid="btn-descargar-configuracion-0"
        />
      </div>
    </div>
  );
}

function BloqueCatalogo({ conceptos, folio }) {
  const handleExcel = () => {
    const filas = conceptos.map((c) => ({
      Clave: c.clave || '',
      Concepto: c.concepto,
      Unidad: c.unidad,
      Cantidad: num(c.cantidad),
      'Precio unitario': num(c.pu),
      Importe: Math.round(num(c.cantidad) * num(c.pu) * 100) / 100
    }));
    descargarExcel(filas, 'Catálogo', `catalogo_${folio}.xlsx`);
  };
  if (conceptos.length === 0) {
    return <p className="text-sm text-slate-400 italic">Este contrato no tiene catálogo de conceptos (precio alzado).</p>;
  }
  return (
    <div>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
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
      <div className="mt-4 flex justify-end gap-2">
        <BtnDescargar
          etiqueta="Catálogo (Excel)"
          onClick={handleExcel}
          testid="btn-descargar-catalogo-0"
        />
      </div>
    </div>
  );
}

// Pase 1 (Plan 2): el expediente mostraba "no registrado" porque solo leía contrato_actividades
// (A1, deprecated) y nunca la matriz A2 (programa_obra + contrato_periodos). Ahora, si el contrato
// tiene la matriz, se pinta MES POR MES (vía leerProgramaObra); si solo tiene actividades viejas,
// se muestra la tabla A1; si no tiene ninguna, "no registrado".
function BloquePrograma({ programa, actividades, folio }) {
  const periodos = Array.isArray(programa?.periodos) ? programa.periodos : [];
  const tieneMatriz = periodos.length > 0 && Array.isArray(programa?.conceptos) && programa.conceptos.length > 0;

  // Excel de la matriz: una fila por concepto, una columna por periodo.
  const handleExcelMatriz = () => {
    const celdaMap = new Map();
    (programa.celdas || []).forEach((c) => celdaMap.set(`${c.contrato_concepto_id}:${c.contrato_periodo_id}`, c.cantidad));
    const filas = programa.conceptos.map((c) => {
      const fila = { Clave: c.clave || '', Concepto: c.concepto };
      periodos.forEach((p) => { fila[`P${p.numero}`] = num(celdaMap.get(`${c.id}:${p.id}`)); });
      return fila;
    });
    descargarExcel(filas, 'Programa', `programa_${folio}.xlsx`);
  };
  // Excel de las actividades viejas (A1).
  const handleExcelActividades = () => {
    const filas = actividades.map((p) => ({
      Actividad: p.actividad,
      Inicio: soloFecha(p.inicio),
      Término: soloFecha(p.termino),
      '% peso': num(p.peso)
    }));
    descargarExcel(filas, 'Programa', `programa_${folio}.xlsx`);
  };

  if (tieneMatriz) {
    return (
      <div>
        <MatrizProgramaLectura
          programa={programa}
          periodoResaltadoNumero={periodoQueContiene(periodos, new Date().toISOString().slice(0, 10))}
        />
        <div className="mt-4 flex justify-end gap-2">
          <BtnDescargar etiqueta="Programa (Excel)" onClick={handleExcelMatriz} testid="btn-descargar-programa-0" />
        </div>
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
      <div className="mt-4 flex justify-end gap-2">
        <BtnDescargar
          etiqueta="Programa (Excel)"
          onClick={handleExcelActividades}
          testid="btn-descargar-programa-0"
        />
      </div>
    </div>
  );
}

function BloqueFianzas({ garantias, folio }) {
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
            <th className="text-center px-3 py-2 w-44">Descargar</th>
          </tr>
        </thead>
        <tbody>
          {garantias.map((f, i) => (
            <tr key={f.id ?? i} className="border-t border-slate-200 hover:bg-slate-50">
              <td className="px-3 py-2 font-medium">{f.tipo}</td>
              <td className="px-3 py-2">{f.afianzadora || '—'}</td>
              <td className="px-3 py-2 font-mono text-xs">{f.poliza || '—'}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{moneda(f.monto)}</td>
              <td className="px-3 py-2 text-center">
                <BtnDescargar
                  etiqueta="PDF"
                  onClick={() =>
                    descargarPDFPlaceholder(`Póliza ${f.tipo} ${f.poliza || ''}`.trim(), folio)
                  }
                  testid={`btn-descargar-fianzas-${i}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BloqueJuridicos({ juridicos, equipo, folio }) {
  const j = juridicos || {};
  return (
    <div className="space-y-4 text-sm text-slate-800">
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">
          Firmante autorizado (dependencia)
        </div>
        <div>
          {j.firmanteDependencia || '—'}
          {j.cargoFirmante ? ` — ${j.cargoFirmante}` : ''}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">
          Representante legal (contratista)
        </div>
        <div>
          {j.representanteLegal || '—'}
          {j.cedulaProfesional ? ` — Cédula ${j.cedulaProfesional}` : ''}
        </div>
        {(j.poderNotarial || j.notaria) && (
          <div className="text-slate-600 mt-0.5">
            {[j.poderNotarial, j.notaria].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">Equipo del contrato</div>
        <ul className="list-disc list-inside text-slate-700 space-y-0.5">
          <li>Residente: {equipo.residente || '—'}</li>
          <li>Superintendente (contratista): {equipo.superintendente || '—'}</li>
          <li>Supervisión: {equipo.supervision || '— (no aplica)'}</li>
        </ul>
      </div>
      <div className="border-t border-slate-200 pt-3">
        <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
          Documentos jurídicos descargables
        </div>
        <div className="flex flex-wrap gap-2">
          {JURIDICOS_DOCS.map((d, i) => (
            <BtnDescargar
              key={d.id}
              etiqueta={`${d.label} (PDF)`}
              onClick={() => descargarPDFPlaceholder(d.label, folio)}
              testid={`btn-descargar-juridicos-${i}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Pase 2.3 — Roster histórico / sustituciones de personas (art. 125 RLOPSRM). Lee el endpoint
// propio GET /api/roster/contrato/:id (NO detalleContrato, que es zona congelada). El histórico es
// append-only por (contrato, rol): la fila con vigencia_hasta NULL es la VIGENTE; las cerradas son
// personas pasadas; cada sustitución (sustituye_a != null) asienta su nota en la bitácora.
const ROL_LABEL_ROSTER = { residente: 'Residente', superintendente: 'Superintendente', supervision: 'Supervisión' };

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
              <th className="text-left px-3 py-2">Motivo</th>
              <th className="text-center px-3 py-2 w-28">Bitácora</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((h) => {
              const vigente = h.vigencia_hasta == null;
              return (
                <tr
                  key={h.id}
                  className={`border-t border-slate-200 ${vigente ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                  data-testid={`roster-fila-${h.id}`}
                >
                  <td className="px-3 py-2">{ROL_LABEL_ROSTER[h.rol] || h.rol}</td>
                  <td className="px-3 py-2 font-medium">{h.usuario_nombre || `Usuario #${h.usuario_id}`}</td>
                  <td className="px-3 py-2">{soloFecha(h.vigencia_desde)}</td>
                  <td className="px-3 py-2">
                    {vigente
                      ? <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-sigecop-green-validation">Vigente</span>
                      : soloFecha(h.vigencia_hasta)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{h.motivo || '—'}</td>
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

export default function ConsultaExpediente() {
  // soloLectura no bloquea la consulta (todos los roles con acceso consultan); el
  // hook se mantiene por la metadata académica y el aviso del HeaderVista.
  const { token } = useSesion();
  useVistaHU('HU-04');
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [expediente, setExpediente] = useState(null);
  const [programa, setPrograma] = useState(null); // Pase 1: matriz A2 (leerProgramaObra)
  const [roster, setRoster] = useState(null);     // Pase 2.3: roster histórico / sustituciones
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [campo, setCampo] = useState('folio');

  // Carga inicial: contratos del usuario (acotados server-side por participación).
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
    setError('');
    setQuery('');
    if (!id) return;
    setCargando(true);
    try {
      const data = await api.detalleContrato(id);
      setExpediente(data);
      // Pase 1: la matriz A2 vive en otro endpoint (programa_obra + contrato_periodos). 404/sin
      // programa → null y el bloque cae al fallback (actividades viejas o "no registrado").
      try { setPrograma(await api.leerProgramaObra(id)); } catch (_) { setPrograma(null); }
      // Pase 2.3: el roster histórico/sustituciones sale de su PROPIO endpoint (no de detalleContrato,
      // que es zona congelada). Acotado por participación server-side; 403/404 → null.
      try { setRoster(await api.rosterContrato(id)); } catch (_) { setRoster(null); }
    } catch (e) {
      // El acotamiento es server-side: 403 = sin acceso a este contrato.
      setError(
        e.status === 403 ? 'No tienes acceso a este contrato.'
          : e.status === 404 ? 'Contrato no encontrado.'
            : 'No se pudo cargar el expediente.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  // Los 5 bloques del expediente, derivados del contrato real. Cada bloque expone
  // qué campos hace match con el buscador (mismos campos que filtraba el dummy).
  const bloques = useMemo(() => {
    if (!expediente) return [];
    const c = expediente;
    const conceptos = Array.isArray(c.conceptos) ? c.conceptos : [];
    const actividades = Array.isArray(c.actividades) ? c.actividades : [];
    const periodosProg = Array.isArray(programa?.periodos) ? programa.periodos : [];
    const garantias = Array.isArray(c.garantias) ? c.garantias : [];
    const jur = c.datos_juridicos || null;
    const equipo = {
      residente: c.residente_nombre,
      superintendente: c.superintendente_nombre,
      supervision: c.supervision_nombre
    };
    return [
      {
        id: 'configuracion',
        titulo: 'Configuración del contrato',
        icono: '⚙️',
        haceMatch: (q, campo) => {
          const blob = `${c.folio} ${c.contratista} ${c.objeto} ${c.dependencia} ${c.tipo}`.toLowerCase();
          if (campo === 'folio')       return (c.folio || '').toLowerCase().includes(q);
          if (campo === 'contratista') return (c.contratista || '').toLowerCase().includes(q);
          if (campo === 'objeto')      return (c.objeto || '').toLowerCase().includes(q);
          if (campo === 'documento')   return 'configuración contrato'.includes(q);
          return blob.includes(q);
        },
        body: <BloqueConfiguracion contrato={c} />
      },
      {
        id: 'catalogo',
        titulo: 'Catálogo de conceptos',
        icono: '📐',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'catálogo conceptos'.includes(q);
          const blob = conceptos.map((x) => x.concepto).join(' ').toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueCatalogo conceptos={conceptos} folio={c.folio} />
      },
      {
        id: 'programa',
        titulo: 'Programa de obra',
        icono: '📅',
        haceMatch: (q, campo) => {
          // El periodo puede venir de la matriz A2 (periodos del ciclo) o de las actividades A1.
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
        body: <BloquePrograma programa={programa} actividades={actividades} folio={c.folio} />
      },
      {
        id: 'fianzas',
        titulo: 'Fianzas y garantías',
        icono: '🛡️',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'fianzas garantías pólizas'.includes(q);
          const blob = garantias.map((f) => `${f.tipo} ${f.afianzadora || ''} ${f.poliza || ''}`).join(' ').toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueFianzas garantias={garantias} folio={c.folio} />
      },
      {
        id: 'juridicos',
        titulo: 'Documentos jurídicos',
        icono: '⚖️',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'jurídicos cláusulas representación firmante'.includes(q);
          const blob = `${jur ? `${jur.firmanteDependencia || ''} ${jur.cargoFirmante || ''} ${jur.representanteLegal || ''} ${jur.cedulaProfesional || ''} ${jur.poderNotarial || ''} ${jur.notaria || ''}` : ''} ${equipo.residente || ''} ${equipo.superintendente || ''} ${equipo.supervision || ''}`.toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueJuridicos juridicos={jur} equipo={equipo} folio={c.folio} />
      },
      {
        id: 'roster',
        titulo: 'Roster y sustituciones de personas',
        icono: '👥',
        haceMatch: (q, campo) => {
          if (campo === 'documento') return 'roster sustitución personas equipo'.includes(q);
          const blob = (roster?.historial || []).map((h) => `${h.usuario_nombre || ''} ${h.rol} ${h.motivo || ''}`).join(' ').toLowerCase();
          return blob.includes(q);
        },
        body: <BloqueRoster roster={roster} />
      }
    ];
  }, [expediente, programa, roster]);

  // Buscador con semántica AND: un bloque coincide si TODOS los términos de la
  // búsqueda hacen match sobre el campo seleccionado (criterio 2, art. lógica Y).
  const bloquesFiltrados = useMemo(() => {
    const terminos = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terminos.length === 0) return bloques;
    return bloques.filter((b) => terminos.every((t) => b.haceMatch(t, campo)));
  }, [bloques, query, campo]);

  return (
    <div>
      <HeaderVista
        huId="HU-04"
        titulo="Consulta integrada del expediente contractual"
        sprint="Sprint 4"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Contratos' },
          { label: 'Expediente' }
        ]}
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

      {expediente && (
        <>
          <BannerContexto
            variant="slate"
            titulo="Contrato"
            folio={expediente.folio}
            extra={[{ value: expediente.contratista }]}
          />

          <div className="bg-white border border-slate-200 rounded-md p-4 mb-6">
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
                Mostrando {bloquesFiltrados.length} de {bloques.length} bloques que coinciden con "{query}".
                {' '}
                <button type="button" className="text-sigecop-accent hover:underline" onClick={() => setQuery('')}>
                  Limpiar
                </button>
              </p>
            )}
          </div>

          <div className="space-y-4">
            {bloquesFiltrados.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-400 italic">
                Ningún bloque del expediente coincide con la búsqueda.
              </div>
            ) : (
              bloquesFiltrados.map((b) => (
                <BloqueExpediente key={b.id} bloque={b}>
                  {b.body}
                </BloqueExpediente>
              ))
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="sg-btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
              disabled
              title="Disponible en SRV-06-03"
            >
              ⬇ Exportar expediente
            </button>
          </div>
        </>
      )}

      <SeccionCriterios
        huId="HU-04"
        criterios={[
          { numero: 1, texto: 'El expediente muestra en una sola vista los bloques del contrato: configuración, catálogo, programa, fianzas, documentos jurídicos y el roster/sustituciones de personas (art. 125 RLOPSRM).' },
          { numero: 2, texto: 'El buscador filtra los bloques por folio, contratista, objeto, periodo o tipo de documento, con lógica Y.' },
          { numero: 3, texto: 'Cada documento del expediente puede descargarse individualmente desde su bloque.' }
        ]}
      />
    </div>
  );
}
