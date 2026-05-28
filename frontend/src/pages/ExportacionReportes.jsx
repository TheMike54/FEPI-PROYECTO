import { useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  reportesCatalogoDummy,
  periodosReportesDummy,
  curvaAvanceDummy,
  catalogoConceptosCurvaDummy,
  programaObraGanttDummy,
  historialEstimacionesDummy,
  observacionesRechazoDummy,
  notasBitacoraDummy,
  historicoVersionesContratoDummy,
  portafolioContratosDummy
} from '../data/dummy.js';

const stamp = () => new Date().toISOString().slice(0, 10);
const baseName = (id, tipo, periodo) =>
  `reporte_${id}_${tipo}_${periodo.toLowerCase()}_${stamp()}`;

// Acota los meses incluidos segun el periodo elegido.
function recortarMeses(meses, periodo) {
  if (periodo === 'Acumulado') return meses;
  if (periodo === 'Trimestral') return meses.slice(-3);
  return meses.slice(-1); // Mensual
}

// ---------------------------------------------------------------------------
// 1) Avance fisico vs programado  (PDF + Excel)
// ---------------------------------------------------------------------------
function generarAvanceFisicoPDF(periodo) {
  const meses = recortarMeses(curvaAvanceDummy.map((c) => c.mes), periodo);
  const curva = curvaAvanceDummy.filter((c) => meses.includes(c.mes));

  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Reporte 1 — Avance físico vs programado', 14, 18);
  doc.setFontSize(10);
  doc.text(`Contrato: ${contratoDummy.folio} · ${contratoDummy.contratista}`, 14, 25);
  doc.text(`Periodo: ${periodo} · Generado: ${new Date().toLocaleDateString('es-MX')}`, 14, 31);

  // Curva S resumida (tabla mes x serie).
  doc.setFontSize(11);
  doc.text('Curva S (% acumulado)', 14, 42);
  doc.setFontSize(9);
  let y = 50;
  doc.text('Mes | Programado | Ejecutado | Financiero', 14, y); y += 5;
  doc.setDrawColor(200); doc.line(14, y, 196, y); y += 4;
  curva.forEach((c) => {
    doc.text(`${c.mes}  |   ${c.programado}%   |   ${c.ejecutado}%   |   ${c.financiero}%`, 14, y);
    y += 5;
  });

  // Tabla concepto x periodo (programaObraGanttDummy).
  y += 8;
  doc.setFontSize(11);
  doc.text('Concepto × periodo', 14, y); y += 6;
  doc.setFontSize(9);
  doc.text(['Concepto', ...meses].join(' | '), 14, y); y += 4;
  doc.line(14, y, 196, y); y += 4;
  programaObraGanttDummy.forEach((p) => {
    const fila = [p.concepto, ...meses.map((m) => p.porMes[m] ?? '-')].join(' | ');
    doc.text(fila, 14, y);
    y += 5;
    if (y > 280) { doc.addPage(); y = 20; }
  });

  doc.save(`${baseName(1, 'avance-fisico', periodo)}.pdf`);
}

function generarAvanceFisicoExcel(periodo) {
  const meses = recortarMeses(curvaAvanceDummy.map((c) => c.mes), periodo);
  const curva = curvaAvanceDummy.filter((c) => meses.includes(c.mes));

  const wsCurva = XLSX.utils.json_to_sheet(curva);
  const wsGantt = XLSX.utils.json_to_sheet(
    programaObraGanttDummy.map((p) => {
      const row = { Concepto: p.concepto };
      meses.forEach((m) => { row[m] = p.porMes[m] ?? ''; });
      return row;
    })
  );
  const wsCatalogo = XLSX.utils.json_to_sheet(catalogoConceptosCurvaDummy);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsCurva,    'Curva S');
  XLSX.utils.book_append_sheet(wb, wsGantt,    'Concepto x periodo');
  XLSX.utils.book_append_sheet(wb, wsCatalogo, 'Catalogo conceptos');
  XLSX.writeFile(wb, `${baseName(1, 'avance-fisico', periodo)}.xlsx`);
}

// ---------------------------------------------------------------------------
// 2) Avance financiero  (Excel)
// ---------------------------------------------------------------------------
function generarAvanceFinancieroExcel(periodo) {
  const meses = recortarMeses(curvaAvanceDummy.map((c) => c.mes), periodo);
  // Deriva importes ficticios a partir del % financiero por mes y del monto del
  // contrato. Es un placeholder consistente, no un cálculo real.
  const montoContrato = 12450000;
  const filas = curvaAvanceDummy
    .filter((c) => meses.includes(c.mes))
    .map((c) => {
      const comprometido = Math.round(montoContrato * (c.programado / 100));
      const autorizado   = Math.round(montoContrato * (c.ejecutado / 100));
      const pagado       = Math.round(montoContrato * (c.financiero / 100));
      return {
        Periodo: c.mes,
        Comprometido: comprometido,
        Autorizado: autorizado,
        Pagado: pagado,
        Disponible: montoContrato - comprometido
      };
    });
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Avance financiero');
  XLSX.writeFile(wb, `${baseName(2, 'avance-financiero', periodo)}.xlsx`);
}

// ---------------------------------------------------------------------------
// 3) Listado de estimaciones  (Excel)
// ---------------------------------------------------------------------------
function generarListadoEstimacionesExcel(periodo) {
  // El periodo aqui es informativo (etiqueta del archivo); no recorta. El CA-2
  // dice que el contenido predefinido del reporte no se altera por el periodo.
  const filas = historialEstimacionesDummy.map((h) => ({
    Estimacion: h.estimacion,
    Version: h.version,
    Periodo: h.periodo,
    Estado: h.estado,
    Importe: h.importe,
    'Fecha presentacion': h.fechaPresentacion ?? '',
    'Fecha revision':     h.fechaRevision     ?? '',
    'Fecha pago':         h.fechaPago         ?? '',
    Observaciones: (h.observaciones || []).join(' · ')
  }));
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estimaciones');
  XLSX.writeFile(wb, `${baseName(3, 'estimaciones', periodo)}.xlsx`);
}

// ---------------------------------------------------------------------------
// 4) Listado de observaciones  (Excel y/o PDF)
// ---------------------------------------------------------------------------
function generarObservacionesExcel(periodo) {
  const filas = observacionesRechazoDummy.map((o, i) => ({
    '#': i + 1,
    Concepto: o.concepto,
    Observacion: o.observacion,
    Severidad: o.severidad
  }));
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Observaciones');
  XLSX.writeFile(wb, `${baseName(4, 'observaciones', periodo)}.xlsx`);
}

// ---------------------------------------------------------------------------
// 5) Bitacora completa  (PDF cronologico)
// ---------------------------------------------------------------------------
function generarBitacoraPDF(periodo) {
  // Orden cronologico ya garantizado por la lista; lo aseguro por si acaso.
  const notas = [...notasBitacoraDummy].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Reporte 5 — Bitácora completa', 14, 18);
  doc.setFontSize(10);
  doc.text(`Contrato: ${contratoDummy.folio} · ${contratoDummy.contratista}`, 14, 25);
  doc.text(`Periodo: ${periodo} · ${notas.length} notas`, 14, 31);
  let y = 42;
  notas.forEach((n) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.text(`${n.folio} · ${n.fecha} · ${n.tipo}`, 14, y); y += 6;
    doc.setFontSize(9);
    doc.text(`Firmante: ${n.firmante} (${n.rol})`, 14, y); y += 5;
    const asunto = doc.splitTextToSize(`Asunto: ${n.asunto}`, 180);
    doc.text(asunto, 14, y); y += asunto.length * 4 + 1;
    const contenido = doc.splitTextToSize(n.contenido, 180);
    if (y + contenido.length * 4 > 280) { doc.addPage(); y = 20; }
    doc.text(contenido, 14, y); y += contenido.length * 4 + 1;
    doc.text(`Firmas: ${n.firmante}`, 14, y); y += 6;
    doc.setDrawColor(220); doc.line(14, y, 196, y); y += 4;
  });
  doc.save(`${baseName(5, 'bitacora', periodo)}.pdf`);
}

// ---------------------------------------------------------------------------
// 6) Histórico de modificatorios  (Excel)
// ---------------------------------------------------------------------------
function generarModificatoriosExcel(periodo) {
  const filas = historicoVersionesContratoDummy.map((v) => ({
    Version: v.version,
    Fecha: v.fecha,
    Autor: v.autor,
    Tipo: v.tipo,
    Motivo: v.motivo
  }));
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modificatorios');
  XLSX.writeFile(wb, `${baseName(6, 'modificatorios', periodo)}.xlsx`);
}

// ---------------------------------------------------------------------------
// 7) Penalizaciones y deductivas  (Excel)
// ---------------------------------------------------------------------------
function generarPenalizacionesExcel(periodo) {
  const filas = portafolioContratosDummy.map((c) => ({
    Folio: c.folio,
    Contratista: c.contratista,
    'Dias vencidos': c.factores.diasVencidos,
    'Pendientes sin atender': c.factores.pendientesSinAtender,
    'Penalizacion ($MXN)': c.indicadores.penalizaciones
  }));
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Penalizaciones');
  XLSX.writeFile(wb, `${baseName(7, 'penalizaciones', periodo)}.xlsx`);
}

// Mapa id reporte -> handler por formato.
const HANDLERS = {
  1: { PDF: generarAvanceFisicoPDF,        Excel: generarAvanceFisicoExcel        },
  2: { PDF: null,                          Excel: generarAvanceFinancieroExcel    },
  3: { PDF: null,                          Excel: generarListadoEstimacionesExcel },
  4: { PDF: null,                          Excel: generarObservacionesExcel       },
  5: { PDF: generarBitacoraPDF,            Excel: null                            },
  6: { PDF: null,                          Excel: generarModificatoriosExcel      },
  7: { PDF: null,                          Excel: generarPenalizacionesExcel      }
};

function BotonFormato({ reporteId, formato, periodo }) {
  const handler = HANDLERS[reporteId]?.[formato];
  const onClick = () => handler && handler(periodo);
  return (
    <button
      type="button"
      className="sg-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
      data-testid={`btn-exportar-${reporteId}-${formato.toLowerCase()}`}
    >
      ⬇ {formato}
    </button>
  );
}

export default function ExportacionReportes() {
  const { soloLectura } = useVistaHU('HU-19');
  const [periodo, setPeriodo] = useState(periodosReportesDummy[0]);

  return (
    <div>
      <HeaderVista
        huId="HU-19"
        titulo="Exportación de reportes"
        sprint="Sprint 9"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Reportes' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[{ value: contratoDummy.contratista }]}
      />

      {/* Selector de periodo — consultativo. */}
      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Periodo del reporte
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="sg-label">Periodo</label>
            <select
              className="sg-input"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              data-testid="select-periodo-reporte"
            >
              {periodosReportesDummy.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <p className="text-xs text-slate-500">
              El periodo acota los datos incluidos cuando aplica (avance físico,
              financiero, bitácora), pero no cambia el contenido predefinido del
              reporte (CA-2).
            </p>
          </div>
        </div>
      </div>

      {/* Lista de reportes — los botones de exportar viven en RegionEditable. */}
      <RegionEditable disabled={soloLectura}>
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Reportes disponibles
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              7 reportes definidos por el alcance del proyecto. Cada botón genera
              el archivo real (PDF con jsPDF, Excel con SheetJS).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left p-3 font-semibold w-10">#</th>
                  <th className="text-left p-3 font-semibold">Reporte</th>
                  <th className="text-left p-3 font-semibold">Descripción</th>
                  <th className="text-left p-3 font-semibold w-56">Exportar</th>
                </tr>
              </thead>
              <tbody>
                {reportesCatalogoDummy.map((r, i) => (
                  <tr key={r.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{i + 1}</td>
                    <td className="p-3 font-semibold text-slate-900">{r.nombre}</td>
                    <td className="p-3 text-slate-700">{r.descripcion}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {r.formatos.map((f) => (
                          <BotonFormato
                            key={f}
                            reporteId={r.id}
                            formato={f}
                            periodo={periodo}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </RegionEditable>

      <SeccionCriterios
        huId="HU-19"
        criterios={[
          { numero: 1, texto: 'Cada uno de los 7 reportes definidos genera un archivo descargable en el formato establecido (PDF, Excel o ambos según el reporte).' },
          { numero: 2, texto: 'El usuario puede seleccionar el periodo (mensual, trimestral, acumulado) sin alterar el contenido predefinido del reporte.' }
        ]}
      />
    </div>
  );
}
