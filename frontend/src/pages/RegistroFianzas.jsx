import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import BadgeSprint from '../components/ui/BadgeSprint.jsx';
import CardCriterioAceptacion from '../components/ui/CardCriterioAceptacion.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import AvisoSoloLectura from '../components/ui/AvisoSoloLectura.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { fianzasListadoDummy, contratoDummy } from '../data/dummy.js';

function EstadoBadge({ estado, color }) {
  const colors = {
    green: 'bg-green-100 text-sigecop-green-validation',
    amber: 'bg-amber-100 text-sigecop-amber-attention',
    gray: 'bg-slate-200 text-slate-600'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[color] || colors.gray}`}>
      {estado}
    </span>
  );
}

export default function RegistroFianzas() {
  const { showToast } = useToast();
  const { soloLectura, mostrarMeta } = useVistaHU('HU-02');

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Contratos' },
          { label: 'Registro de fianzas' }
        ]}
      />

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-sigecop-blue">Registro de fianzas y garantías</h1>
        <BadgeSprint codigo="HU-02" sprint="Sprint 6" />
      </div>

      {soloLectura && <AvisoSoloLectura />}

      <div className="bg-blue-50 border-l-4 border-sigecop-blue px-4 py-3 mb-6 rounded-r-md">
        <div className="text-xs font-semibold text-sigecop-blue uppercase">Contrato</div>
        <div className="font-bold text-slate-900 mt-1">{contratoDummy.folio} · {contratoDummy.objeto}</div>
        <div className="text-xs text-slate-600 mt-0.5">{contratoDummy.contratista}</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sigecop-blue">Pólizas de fianza del contrato</h2>
          {!soloLectura && (
            <button
              type="button"
              className="sg-btn-primary"
              onClick={() => showToast('Pendiente para Sprint siguiente.')}
            >
              + Agregar nueva póliza
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-slate-700">
                <th className="text-left p-3 font-semibold">Tipo</th>
                <th className="text-left p-3 font-semibold">Folio de póliza</th>
                <th className="text-left p-3 font-semibold">Afianzadora</th>
                <th className="text-right p-3 font-semibold">Monto afianzado</th>
                <th className="text-center p-3 font-semibold">Vigencia</th>
                <th className="text-center p-3 font-semibold">Estado</th>
                <th className="text-center p-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fianzasListadoDummy.map((f, i) => (
                <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold rounded">
                      {f.tipo}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {f.folio === 'Por registrar' ? (
                      <span className="italic text-slate-400">{f.folio}</span>
                    ) : (
                      f.folio
                    )}
                  </td>
                  <td className="p-3">
                    {f.afianzadora === '—' ? <span className="italic text-slate-400">—</span> : f.afianzadora}
                  </td>
                  <td className="p-3 text-right">
                    {f.monto === '—' ? <span className="italic text-slate-400">—</span> : f.monto}
                  </td>
                  <td className="p-3 text-center text-xs">
                    {f.vigenciaInicio ? (
                      <>
                        {f.vigenciaInicio}
                        <br />
                        al {f.vigenciaFin}
                      </>
                    ) : (
                      <span className="italic text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <EstadoBadge estado={f.estado} color={f.estadoColor} />
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {f.tienePdf ? (
                        <>
                          <button
                            type="button"
                            title="Ver PDF de la póliza"
                            className="text-sigecop-accent hover:text-sigecop-blue text-lg"
                            onClick={() => showToast('Aún sin lógica de backend.')}
                          >
                            👁
                          </button>
                          {!soloLectura && (
                            <button
                              type="button"
                              title="Editar póliza"
                              className="text-slate-500 hover:text-sigecop-blue"
                              onClick={() => showToast('Pendiente para Sprint siguiente.')}
                            >
                              ✏️
                            </button>
                          )}
                        </>
                      ) : (
                        !soloLectura ? (
                          <button
                            type="button"
                            className="text-xs px-2 py-1 bg-sigecop-blue-light text-sigecop-blue rounded hover:bg-sigecop-blue hover:text-white transition-colors"
                            onClick={() => showToast('Pendiente para Sprint siguiente.')}
                          >
                            📤 Cargar póliza
                          </button>
                        ) : (
                          <span className="text-xs italic text-slate-400">—</span>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-blue-50 border-t border-slate-200">
          <div className="font-semibold text-sigecop-blue mb-3 text-sm">⏰ Alertas de vencimiento configuradas</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { dias: '30 días', nota: 'de vencer la póliza' },
              { dias: '15 días', nota: 'de vencer la póliza' },
              { dias: '5 días', nota: 'de vencer (urgente)' }
            ].map((a, i) => (
              <div key={i} className="bg-white p-3 rounded shadow-sm">
                <div className="text-xs text-slate-500">A los</div>
                <div className="text-xl font-bold text-sigecop-blue">{a.dias}</div>
                <div className="text-xs text-slate-600">{a.nota}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        <strong>⚖️ Fundamento:</strong> Art. 48 LOPSRM — las fianzas se otorgan dentro de los 15 días naturales siguientes a la notificación del fallo.
      </p>

      {mostrarMeta && (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Criterios de aceptación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CardCriterioAceptacion
              numero={1}
              texto="La póliza queda ligada al contrato con afianzadora, vigencia y monto registrados."
            />
            <CardCriterioAceptacion
              numero={2}
              texto="El sistema emite alerta cuando faltan N días configurables para el vencimiento."
            />
            <CardCriterioAceptacion
              numero={3}
              texto="La póliza registrada puede consultarse en formato PDF desde el listado de fianzas del contrato."
            />
          </div>
        </section>
      )}
    </div>
  );
}
