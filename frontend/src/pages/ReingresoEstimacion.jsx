import { useState } from 'react';
import jsPDF from 'jspdf';
import { descargarExcelHoja } from '../services/excelExport.js';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  observacionesRechazoDummy,
  historicoVersionesDummy,
  reingresoBannerDummy
} from '../data/dummy.js';

function SeveridadBadge({ severidad }) {
  const colors = {
    'Alta':  'bg-red-100 text-red-700',
    'Media': 'bg-amber-100 text-sigecop-amber-attention',
    'Baja':  'bg-slate-200 text-slate-700'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[severidad] || 'bg-slate-200 text-slate-600'}`}>
      {severidad}
    </span>
  );
}

function EstadoVersionBadge({ estado }) {
  const colors = {
    'Aceptada':   'bg-green-100 text-sigecop-green-validation',
    'Rechazada':  'bg-red-100 text-red-700',
    'Borrador':   'bg-slate-200 text-slate-600',
    'En proceso': 'bg-sigecop-blue-light text-sigecop-blue'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[estado] || 'bg-slate-200 text-slate-600'}`}>
      {estado}
    </span>
  );
}

// Genera el PDF de observaciones de la version rechazada y dispara la descarga.
function exportarObservacionesPdf(observaciones, folioContrato, numEstimacion) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Observaciones de la version rechazada', 14, 20);
  doc.setFontSize(10);
  doc.text(`Contrato: ${folioContrato}`, 14, 28);
  doc.text(`Estimacion: ${numEstimacion} (version rechazada)`, 14, 34);
  doc.text(`Fecha de descarga: ${new Date().toLocaleDateString('es-MX')}`, 14, 40);

  let y = 52;
  doc.setFontSize(11);
  doc.text('# | Concepto | Observacion | Severidad', 14, y);
  y += 4;
  doc.setDrawColor(180);
  doc.line(14, y, 196, y);
  y += 6;
  doc.setFontSize(10);
  observaciones.forEach((o, i) => {
    const lineas = doc.splitTextToSize(
      `${i + 1}. [${o.severidad}] ${o.concepto}: ${o.observacion}`,
      180
    );
    if (y + lineas.length * 5 > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(lineas, 14, y);
    y += lineas.length * 5 + 2;
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`observaciones_EST-${numEstimacion}_${folioContrato}_${stamp}.pdf`);
}

// Genera el Excel de observaciones de la version rechazada con exceljs.
function exportarObservacionesExcel(observaciones, folioContrato, numEstimacion) {
  const datos = observaciones.map((o, i) => ({
    '#': i + 1,
    Concepto: o.concepto,
    Observacion: o.observacion,
    Severidad: o.severidad
  }));
  const stamp = new Date().toISOString().slice(0, 10);
  descargarExcelHoja(
    `observaciones_EST-${numEstimacion}_${folioContrato}_${stamp}.xlsx`,
    'Observaciones',
    datos
  );
}

export default function ReingresoEstimacion() {
  const { soloLectura } = useVistaHU('HU-16');
  const [nota, setNota] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [reingresada, setReingresada] = useState(false);

  const puedeReingresar = nota.trim().length > 0 && confirmado && !reingresada;

  // Numero de version: la rechazada es v1 en el dummy; al reingresar pasa a v2.
  const versionRechazada = 'v1';
  const nuevaVersion = 'v2';

  // Trazabilidad: tras reingresar, sustituimos la fila "Borrador" del dummy por
  // la nueva version "En proceso" vinculada a la rechazada.
  const trazabilidad = reingresada
    ? [
        { version: versionRechazada, fecha: '02/06/2026', estado: 'Rechazada', vinculadaA: null },
        { version: nuevaVersion,     fecha: new Date().toLocaleDateString('es-MX'), estado: 'En proceso', vinculadaA: versionRechazada }
      ]
    : historicoVersionesDummy;

  const handleReingresar = () => {
    setReingresada(true);
  };

  return (
    <div>
      <HeaderVista
        huId="HU-16"
        titulo="Reingreso de estimación tras rechazo"
        sprint="Sprint 8"
        rolAcademico="Contratista"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Reingreso' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { value: contratoDummy.contratista },
          {
            value: (
              <>
                Estimación {reingresoBannerDummy.numero} · {reingresoBannerDummy.periodo} ·{' '}
                <span className="text-red-700 font-bold">RECHAZADA</span>
              </>
            )
          }
        ]}
      />

      {reingresada && (
        <div
          className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-3 mb-6 text-sm text-slate-800 rounded-r-md"
          data-testid="aviso-reingreso"
        >
          <strong>
            ✓ Nueva versión {nuevaVersion} creada y vinculada a la versión rechazada {versionRechazada}.
          </strong>{' '}
          El plazo de presentación NO se reinicia.
        </div>
      )}

      {/* Observaciones de la version rechazada — display, fuera de RegionEditable. */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden mb-6">
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Observaciones de la versión rechazada
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="sg-btn-secondary"
              data-testid="btn-descargar-obs-pdf"
              onClick={() => exportarObservacionesPdf(observacionesRechazoDummy, contratoDummy.folio, reingresoBannerDummy.numero)}
            >
              ⬇ Descargar PDF
            </button>
            <button
              type="button"
              className="sg-btn-secondary"
              data-testid="btn-descargar-obs-excel"
              onClick={() => exportarObservacionesExcel(observacionesRechazoDummy, contratoDummy.folio, reingresoBannerDummy.numero)}
            >
              ⬇ Descargar Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold w-10">#</th>
                <th className="text-left p-3 font-semibold">Concepto</th>
                <th className="text-left p-3 font-semibold">Observación</th>
                <th className="text-left p-3 font-semibold w-28">Severidad</th>
              </tr>
            </thead>
            <tbody>
              {observacionesRechazoDummy.map((o, i) => (
                <tr key={o.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">{i + 1}</td>
                  <td className="p-3 font-semibold">{o.concepto}</td>
                  <td className="p-3 text-slate-700">{o.observacion}</td>
                  <td className="p-3"><SeveridadBadge severidad={o.severidad} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nueva version — captura, en RegionEditable. */}
      <RegionEditable disabled={soloLectura}>
        <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Nueva versión
          </h2>
          <div className="mb-4">
            <label className="sg-label">Nota de atención a observaciones</label>
            <textarea
              className="sg-input"
              rows="4"
              placeholder="Describe cómo se atendieron las observaciones de la versión rechazada."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              disabled={reingresada}
              data-testid="textarea-nota"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              disabled={reingresada}
              data-testid="chk-confirmado"
            />
            Confirmo que atendí las observaciones de la versión rechazada.
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!puedeReingresar}
              onClick={handleReingresar}
              data-testid="btn-reingresar"
            >
              Reingresar estimación (nueva versión)
            </button>
          </div>
        </div>
      </RegionEditable>

      {/* Trazabilidad de versiones — visible tras reingresar (CA-3). */}
      {reingresada && (
        <div
          className="bg-white border border-slate-200 rounded-md overflow-hidden mb-6"
          data-testid="tabla-trazabilidad"
        >
          <div className="px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Trazabilidad de versiones
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              La nueva versión queda vinculada con la rechazada; el plazo de
              presentación no se reinicia.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left p-3 font-semibold w-24">Versión</th>
                  <th className="text-left p-3 font-semibold">Fecha</th>
                  <th className="text-left p-3 font-semibold">Estado</th>
                  <th className="text-left p-3 font-semibold">Vinculada a</th>
                </tr>
              </thead>
              <tbody>
                {trazabilidad.map((v) => (
                  <tr key={v.version} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-3 font-mono font-semibold">{v.version}</td>
                    <td className="p-3 text-slate-700">{v.fecha}</td>
                    <td className="p-3"><EstadoVersionBadge estado={v.estado} /></td>
                    <td className="p-3 font-mono text-xs text-slate-700">
                      {v.vinculadaA ?? <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historico de versiones — display original, evidencia CA-1. */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Histórico de versiones
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            La nueva versión se trata como bloque completo independiente; la rechazada
            queda como histórico vinculado.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold w-24">Versión</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {historicoVersionesDummy.map((v) => (
                <tr key={v.version} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-mono font-semibold">{v.version}</td>
                  <td className="p-3 text-slate-700">{v.fecha}</td>
                  <td className="p-3"><EstadoVersionBadge estado={v.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-16"
        criterios={[
          { numero: 1, texto: 'La nueva versión se trata como bloque completo independiente y la versión rechazada queda como histórico vinculado.' },
          { numero: 2, texto: 'El listado de observaciones de la versión rechazada está disponible para descarga en PDF o Excel.' },
          { numero: 3, texto: 'La nueva versión queda vinculada con la rechazada para trazabilidad, sin reiniciar el plazo de presentación.' }
        ]}
      />
    </div>
  );
}
