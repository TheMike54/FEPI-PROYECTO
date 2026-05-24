import { useState } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { contratoDummy, reportesCatalogoDummy, periodosReportesDummy } from '../data/dummy.js';

function BotonFormato({ formato, onClick }) {
  // Mismo estilo de boton secundario en toda la app — uniforma "PDF" y "Excel".
  return (
    <button
      type="button"
      className="sg-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
    >
      ⬇ {formato}
    </button>
  );
}

export default function ExportacionReportes() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-19');
  // Selector de periodo: vive FUERA de RegionEditable porque es consultativo
  // (mismo criterio que los filtros de HU-10 y la pestana Acuerdos de HU-11).
  const [periodo, setPeriodo] = useState(periodosReportesDummy[0]);

  const exportar = (reporte, formato) => {
    showToast(`Generando reporte ${reporte.nombre} (${periodo}) en ${formato}…`);
  };

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
            >
              {periodosReportesDummy.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <p className="text-xs text-slate-500">
              El periodo no altera el contenido predefinido del reporte (CA-2);
              solo etiqueta el archivo generado.
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
              7 reportes definidos por el alcance del proyecto. Cada uno se genera
              en el formato establecido (CA-1).
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
                            formato={f}
                            onClick={() => exportar(r, f)}
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
          { numero: 1, texto: 'Cada uno de los 7 reportes definidos genera el archivo en el formato establecido (PDF, Excel o ambos).' },
          { numero: 2, texto: 'El usuario puede seleccionar el periodo (mensual, trimestral, acumulado) sin alterar el contenido predefinido del reporte.' }
        ]}
      />
    </div>
  );
}
