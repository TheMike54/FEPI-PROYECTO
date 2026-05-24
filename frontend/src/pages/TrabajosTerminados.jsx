import { useState, useMemo } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  conceptosTrabajosDummy,
  notasEntregaDummy
} from '../data/dummy.js';

// Estado por concepto: { capturado: Number, nota: String }. La validación de
// exceso (acumPrevio + capturado > contratada) se evalúa por fila y se agrega
// para mostrar un aviso global cuando alguna excede.
function estadoInicial(conceptos) {
  const obj = {};
  for (const c of conceptos) {
    obj[c.id] = { capturado: 0, nota: notasEntregaDummy[0] };
  }
  return obj;
}

export default function TrabajosTerminados() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-06');
  const [valores, setValores] = useState(() => estadoInicial(conceptosTrabajosDummy));

  const actualizar = (id, campo, valor) => {
    setValores((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  };

  // Cálculo derivado: cada fila lleva el acumulado nuevo y si excede el
  // contrato. La fila completa cambia de tono cuando excede para que el bloqueo
  // sea visible antes de presionar el botón.
  const filas = useMemo(() => {
    return conceptosTrabajosDummy.map((c) => {
      const cap = Number(valores[c.id]?.capturado) || 0;
      const acumNuevo = c.acumPrevio + cap;
      const excede = acumNuevo > c.contratada;
      return { ...c, capturado: cap, acumNuevo, excede, nota: valores[c.id]?.nota };
    });
  }, [valores]);

  const hayExceso = filas.some((f) => f.excede);

  return (
    <div>
      <HeaderVista
        huId="HU-06"
        titulo="Registro de trabajos terminados"
        sprint="Sprint 7"
        rolAcademico="Contratista"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Seguimiento' },
          { label: 'Trabajos terminados' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { value: contratoDummy.contratista },
          { label: 'Periodo:', value: 'Mayo 2026', resaltado: true }
        ]}
      />

      <RegionEditable disabled={soloLectura}>
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Avance del periodo por concepto del catálogo
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left p-3 font-semibold">Concepto</th>
                  <th className="text-center p-3 font-semibold">Unidad</th>
                  <th className="text-right p-3 font-semibold">Cant. contratada</th>
                  <th className="text-right p-3 font-semibold">Acum. previo</th>
                  <th className="text-right p-3 font-semibold">Este periodo</th>
                  <th className="text-right p-3 font-semibold">Acum. nuevo</th>
                  <th className="text-left p-3 font-semibold">Nota de bitácora</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr
                    key={f.id}
                    className={`border-t border-slate-200 ${f.excede ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-3 font-semibold">{f.concepto}</td>
                    <td className="p-3 text-center text-slate-500">{f.unidad}</td>
                    <td className="p-3 text-right font-mono">{f.contratada}</td>
                    <td className="p-3 text-right font-mono">{f.acumPrevio}</td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className={`sg-input text-right font-mono w-28 ${f.excede ? 'border-red-400' : ''}`}
                        value={f.capturado}
                        onChange={(e) => actualizar(f.id, 'capturado', Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${f.excede ? 'text-red-700' : 'text-slate-900'}`}>
                      {f.acumNuevo}
                    </td>
                    <td className="p-3">
                      <select
                        className="sg-input"
                        value={f.nota}
                        onChange={(e) => actualizar(f.id, 'nota', e.target.value)}
                      >
                        {notasEntregaDummy.map((n) => <option key={n}>{n}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </RegionEditable>

      {hayExceso && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-slate-800 rounded-r-md">
          ⛔ <strong>La cantidad acumulada excede la contratada</strong> en al menos un
          concepto. El sistema no permite registrar cantidades por encima del catálogo
          (CA-2). Corrige los renglones marcados en rojo o tramita un convenio
          modificatorio (HU-03).
        </div>
      )}

      {!soloLectura && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={() => showToast('Pendiente para Sprint siguiente.')}
          >
            Guardar borrador
          </button>
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={hayExceso}
            onClick={() => showToast('Pendiente para Sprint siguiente.')}
          >
            Guardar avance del periodo
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-06"
        criterios={[
          { numero: 1, texto: 'Cada cantidad capturada queda ligada al concepto del catálogo correspondiente y a una nota de bitácora del periodo.' },
          { numero: 2, texto: 'El sistema bloquea el registro cuando la cantidad acumulada excede la contratada.' }
        ]}
      />
    </div>
  );
}
