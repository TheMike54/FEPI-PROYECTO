import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
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

const moneda = (n) =>
  `$ ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

// Descarga un .xlsx con SheetJS a partir de filas {col: valor}.
function descargarExcel(filas, nombreHoja, nombreArchivo) {
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  XLSX.writeFile(wb, nombreArchivo);
}

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

function BloqueConfiguracion() {
  return (
    <div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {bloquesExpedienteDummy[0].contenido.map((c) => (
          <div key={c.label}>
            <dt className="text-xs uppercase font-semibold text-slate-500">{c.label}</dt>
            <dd className="text-sm text-slate-800 mt-0.5">{c.valor}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex justify-end gap-2">
        <BtnDescargar
          etiqueta="Contrato firmado (PDF)"
          onClick={() => descargarPDFPlaceholder('Contrato firmado', contratoDummy.folio)}
          testid="btn-descargar-configuracion-0"
        />
      </div>
    </div>
  );
}

function BloqueCatalogo() {
  const handleExcel = () => {
    const filas = conceptosDummy.map((c) => ({
      Concepto: c.concepto,
      Unidad: c.unidad,
      Cantidad: c.cantidad,
      'Precio unitario': c.pu,
      Importe: c.cantidad * c.pu
    }));
    descargarExcel(filas, 'Catálogo', `catalogo_${contratoDummy.folio}.xlsx`);
  };
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

function BloquePrograma() {
  const handleExcel = () => {
    const filas = programaObraDummy.map((p) => ({
      Actividad: p.actividad,
      Inicio: p.inicio,
      Término: p.termino,
      '% peso': p.peso
    }));
    descargarExcel(filas, 'Programa', `programa_${contratoDummy.folio}.xlsx`);
  };
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
      <div className="mt-4 flex justify-end gap-2">
        <BtnDescargar
          etiqueta="Programa (Excel)"
          onClick={handleExcel}
          testid="btn-descargar-programa-0"
        />
      </div>
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
            <th className="text-center px-3 py-2 w-44">Descargar</th>
          </tr>
        </thead>
        <tbody>
          {fianzasListadoDummy.map((f, i) => (
            <tr key={f.folio} className="border-t border-slate-200 hover:bg-slate-50">
              <td className="px-3 py-2 font-medium">{f.tipo}</td>
              <td className="px-3 py-2">{f.afianzadora}</td>
              <td className="px-3 py-2 font-mono text-xs">{f.folio}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{moneda(f.monto)}</td>
              <td className="px-3 py-2 text-center">
                <BtnDescargar
                  etiqueta="PDF"
                  onClick={() =>
                    descargarPDFPlaceholder(`Póliza ${f.tipo} ${f.folio}`, contratoDummy.folio)
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

function BloqueJuridicos() {
  return (
    <div className="space-y-4 text-sm text-slate-800">
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">
          Firmante autorizado (dependencia)
        </div>
        <div>Lic. María Pérez García — Directora de Obras</div>
      </div>
      <div>
        <div className="text-xs uppercase font-semibold text-slate-500 mb-1">
          Representante legal (contratista)
        </div>
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
      <div className="border-t border-slate-200 pt-3">
        <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
          Documentos jurídicos descargables
        </div>
        <div className="flex flex-wrap gap-2">
          {JURIDICOS_DOCS.map((d, i) => (
            <BtnDescargar
              key={d.id}
              etiqueta={`${d.label} (PDF)`}
              onClick={() => descargarPDFPlaceholder(d.label, contratoDummy.folio)}
              testid={`btn-descargar-juridicos-${i}`}
            />
          ))}
        </div>
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
  const [query, setQuery] = useState('');
  const [campo, setCampo] = useState('folio');

  const bloquesFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOQUES;
    return BLOQUES.filter((b) => b.haceMatch(q, campo));
  }, [query, campo]);

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

      <BannerContexto
        variant="slate"
        titulo="Contrato"
        folio={contratoDummy.folio}
        extra={[{ value: contratoDummy.contratista }]}
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
          className="sg-btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
          disabled
          title="Disponible en SRV-06-03"
        >
          ⬇ Exportar expediente
        </button>
      </div>

      <SeccionCriterios
        huId="HU-04"
        criterios={[
          { numero: 1, texto: 'El expediente muestra en una sola vista los 5 bloques del contrato: configuración, catálogo, programa, fianzas y documentos jurídicos.' },
          { numero: 2, texto: 'El buscador filtra los bloques por folio, contratista, objeto, periodo o tipo de documento, con lógica Y.' },
          { numero: 3, texto: 'Cada documento del expediente puede descargarse individualmente desde su bloque.' }
        ]}
      />
    </div>
  );
}
