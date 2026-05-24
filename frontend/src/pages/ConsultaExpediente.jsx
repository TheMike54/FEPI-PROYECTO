import { useState, useMemo } from 'react';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import BadgeSprint from '../components/ui/BadgeSprint.jsx';
import CardCriterioAceptacion from '../components/ui/CardCriterioAceptacion.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import AvisoSoloLectura from '../components/ui/AvisoSoloLectura.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  conceptosDummy,
  programaObraDummy,
  fianzasListadoDummy,
  bloquesExpedienteDummy
} from '../data/dummy.js';

const CAMPOS_BUSQUEDA = [
  { id: 'folio',       label: 'Folio' },
  { id: 'contratista', label: 'Contratista' },
  { id: 'objeto',      label: 'Objeto' },
  { id: 'periodo',     label: 'Periodo' },
  { id: 'documento',   label: 'Tipo de documento' }
];

// Cada bloque expone qué campos hace match con el buscador.
const BLOQUES = [
  {
    id: 'configuracion',
    titulo: 'Configuración del contrato',
    icono: '⚙️',
    haceMatch: (q, campo) => {
      const blob = `${contratoDummy.folio} ${contratoDummy.contratista} ${contratoDummy.objeto} ${contratoDummy.dependencia} ${contratoDummy.tipo}`.toLowerCase();
      if (campo === 'folio')       return contratoDummy.folio.toLowerCase().includes(q);
      if (campo === 'contratista') return contratoDummy.contratista.toLowerCase().includes(q);
      if (campo === 'objeto')      return contratoDummy.objeto.toLowerCase().includes(q);
      if (campo === 'documento')   return 'configuración contrato'.includes(q);
      return blob.includes(q);
    }
  },
  {
    id: 'catalogo',
    titulo: 'Catálogo de conceptos',
    icono: '📐',
    haceMatch: (q, campo) => {
      if (campo === 'documento') return 'catálogo conceptos'.includes(q);
      const blob = conceptosDummy.map((c) => c.concepto).join(' ').toLowerCase();
      return blob.includes(q);
    }
  },
  {
    id: 'programa',
    titulo: 'Programa de obra',
    icono: '📅',
    haceMatch: (q, campo) => {
      if (campo === 'periodo') {
        return programaObraDummy.some((p) => `${p.inicio} ${p.termino}`.toLowerCase().includes(q));
      }
      if (campo === 'documento') return 'programa obra'.includes(q);
      const blob = programaObraDummy.map((p) => `${p.actividad} ${p.inicio} ${p.termino}`).join(' ').toLowerCase();
      return blob.includes(q);
    }
  },
  {
    id: 'fianzas',
    titulo: 'Fianzas y garantías',
    icono: '🛡️',
    haceMatch: (q, campo) => {
      if (campo === 'documento') return 'fianzas garantías pólizas'.includes(q);
      const blob = fianzasListadoDummy.map((f) => `${f.tipo} ${f.afianzadora} ${f.folio}`).join(' ').toLowerCase();
      return blob.includes(q);
    }
  },
  {
    id: 'juridicos',
    titulo: 'Documentos jurídicos',
    icono: '⚖️',
    haceMatch: (q, campo) => {
      if (campo === 'documento') return 'jurídicos cláusulas representación'.includes(q);
      const blob = 'lic maría pérez garcía juan ramírez soto escritura 12345 notaría 47 acapulco cláusula penal vigencia obligaciones'.toLowerCase();
      return blob.includes(q);
    }
  }
];

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

function BloqueConfiguracion() {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {bloquesExpedienteDummy[0].contenido.map((c) => (
        <div key={c.label}>
          <dt className="text-xs uppercase font-semibold text-slate-500">{c.label}</dt>
          <dd className="text-sm text-slate-800 mt-0.5">{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function BloqueCatalogo() {
  return (
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
          {conceptosDummy.map((c, i) => (
            <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
              <td className="px-3 py-2">{c.concepto}</td>
              <td className="px-3 py-2 text-slate-600">{c.unidad}</td>
              <td className="px-3 py-2 text-right">{c.cantidad.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">${c.pu.toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-semibold">
                ${(c.cantidad * c.pu).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BloquePrograma() {
  return (
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
          {programaObraDummy.map((p, i) => (
            <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
              <td className="px-3 py-2">{p.actividad}</td>
              <td className="px-3 py-2">{p.inicio}</td>
              <td className="px-3 py-2">{p.termino}</td>
              <td className="px-3 py-2 text-right font-semibold">{p.peso}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BloqueFianzas() {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-sigecop-blue-light text-sigecop-blue">
          <tr>
            <th className="text-left px-3 py-2">Tipo</th>
            <th className="text-left px-3 py-2">Afianzadora</th>
            <th className="text-left px-3 py-2 w-36">Folio</th>
            <th className="text-right px-3 py-2 w-36">Monto</th>
            <th className="text-center px-3 py-2 w-32">Estado</th>
          </tr>
        </thead>
        <tbody>
          {fianzasListadoDummy.map((f, i) => (
            <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
              <td className="px-3 py-2 font-medium">{f.tipo}</td>
              <td className="px-3 py-2">{f.afianzadora === '—' ? <span className="italic text-slate-400">—</span> : f.afianzadora}</td>
              <td className="px-3 py-2 font-mono text-xs">{f.folio}</td>
              <td className="px-3 py-2 text-right">{f.monto}</td>
              <td className="px-3 py-2 text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                  f.estadoColor === 'green' ? 'bg-green-100 text-sigecop-green-validation'
                  : f.estadoColor === 'amber' ? 'bg-amber-100 text-sigecop-amber-attention'
                  : 'bg-slate-200 text-slate-600'
                }`}>{f.estado}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BloqueJuridicos() {
  return (
    <div className="space-y-3 text-sm text-slate-800">
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">Firmante autorizado (dependencia)</div>
        <div>Lic. María Pérez García — Directora de Obras</div>
      </div>
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">Representante legal (contratista)</div>
        <div>Lic. Juan Ramírez Soto — Escritura Núm. 12,345, Notaría Pública Núm. 47, Acapulco, Gro.</div>
      </div>
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">Cláusulas vigentes</div>
        <ul className="list-disc list-inside text-slate-700 space-y-0.5">
          <li>Cláusula primera — Objeto del contrato</li>
          <li>Cláusula tercera — Monto y forma de pago</li>
          <li>Cláusula sexta — Plazo de ejecución</li>
          <li>Cláusula décima — Penas convencionales (art. 46 Bis LOPSRM)</li>
          <li>Cláusula décima cuarta — Convenios modificatorios</li>
        </ul>
      </div>
    </div>
  );
}

const BLOQUE_BODY = {
  configuracion: <BloqueConfiguracion />,
  catalogo:      <BloqueCatalogo />,
  programa:      <BloquePrograma />,
  fianzas:       <BloqueFianzas />,
  juridicos:     <BloqueJuridicos />
};

export default function ConsultaExpediente() {
  const { showToast } = useToast();
  const { soloLectura, mostrarMeta } = useVistaHU('HU-04');
  const [query, setQuery] = useState('');
  const [campo, setCampo] = useState('folio');

  const bloquesFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOQUES;
    return BLOQUES.filter((b) => b.haceMatch(q, campo));
  }, [query, campo]);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Contratos' },
          { label: 'Expediente' }
        ]}
      />

      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-sigecop-blue">
          Consulta integrada del expediente contractual
        </h1>
        <BadgeSprint codigo="HU-04" sprint="Sprint 4" />
      </div>
      <p className="text-sm text-slate-600 mb-6">Rol: Residente</p>

      {soloLectura && <AvisoSoloLectura />}

      <div className="bg-slate-100 border-l-4 border-slate-400 px-4 py-3 mb-6 rounded-r-md">
        <div className="text-xs font-semibold text-slate-600 uppercase">Contrato</div>
        <div className="text-sm text-slate-800 mt-1">
          <strong>{contratoDummy.folio}</strong> · {contratoDummy.contratista}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="sg-label">Buscar en el expediente</label>
            <input
              className="sg-input"
              placeholder="Folio, palabra del objeto, contratista, fecha..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
            Mostrando {bloquesFiltrados.length} de {BLOQUES.length} bloques que coinciden con "{query}".
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
              {BLOQUE_BODY[b.id]}
            </BloqueExpediente>
          ))
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="sg-btn-secondary"
          onClick={() => showToast('Pendiente para Sprint siguiente.')}
        >
          ⬇ Exportar expediente
        </button>
      </div>

      {mostrarMeta && (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Criterios de aceptación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CardCriterioAceptacion
              numero={1}
              texto="El expediente muestra en una sola vista los 5 bloques: configuración, catálogo, programa, fianzas y documentos jurídicos."
            />
            <CardCriterioAceptacion
              numero={2}
              texto="El buscador filtra los bloques por folio, contratista, objeto, periodo o tipo de documento."
            />
          </div>
        </section>
      )}
    </div>
  );
}
