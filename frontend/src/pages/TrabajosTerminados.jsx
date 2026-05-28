import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  conceptosTrabajosDummy,
  notasBitacoraDummy
} from '../data/dummy.js';

const PERIODO_LABEL = 'Mayo 2026';
const PERIODO_DESDE = '2026-05-01';
const PERIODO_HASTA = '2026-05-31';
const TIPOS_NOTA_PERIODO = ['Avance', 'Entrega de obra'];
const SIN_NOTA = '— Selecciona nota —';

// Estado por concepto: { capturado, nota }. La nota arranca en el placeholder
// "Selecciona nota" para forzar al usuario a elegirla cuando captura cantidad.
function estadoInicial(conceptos) {
  const obj = {};
  for (const c of conceptos) {
    obj[c.id] = { capturado: 0, nota: SIN_NOTA };
  }
  return obj;
}

export default function TrabajosTerminados() {
  const { soloLectura } = useVistaHU('HU-06');
  const [valores, setValores] = useState(() => estadoInicial(conceptosTrabajosDummy));
  const [avance, setAvance] = useState(null); // { periodo, totalConceptos } o null

  // Notas del periodo disponibles para vincular: tipo Avance o Entrega de obra,
  // fecha dentro del periodo en curso. Si no hay ninguna, mostramos un aviso
  // con link a HU-09 para que el usuario emita una primero.
  const notasPeriodo = useMemo(() => {
    return notasBitacoraDummy.filter(
      (n) =>
        TIPOS_NOTA_PERIODO.includes(n.tipo) &&
        n.fecha >= PERIODO_DESDE &&
        n.fecha <= PERIODO_HASTA
    );
  }, []);

  // Opciones del select: el placeholder "Selecciona nota" + las notas válidas
  // del periodo (folio · tipo · fecha legible).
  const opcionesNota = useMemo(() => {
    const opciones = [SIN_NOTA];
    for (const n of notasPeriodo) {
      const [, mm, dd] = n.fecha.split('-');
      opciones.push(`${n.folio} · ${n.tipo} · ${dd}/${mm}`);
    }
    return opciones;
  }, [notasPeriodo]);

  const actualizar = (id, campo, valor) => {
    setValores((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  };

  // Filas con cálculo: acumNuevo, excede y validez por fila.
  const filas = useMemo(() => {
    return conceptosTrabajosDummy.map((c) => {
      const cap = Number(valores[c.id]?.capturado) || 0;
      const acumNuevo = c.acumPrevio + cap;
      const excede = acumNuevo > c.contratada;
      const nota = valores[c.id]?.nota ?? SIN_NOTA;
      const requiereNota = cap > 0 && nota === SIN_NOTA;
      return { ...c, capturado: cap, acumNuevo, excede, nota, requiereNota };
    });
  }, [valores]);

  const hayExceso = filas.some((f) => f.excede);
  const hayCantidad = filas.some((f) => f.capturado > 0);
  const todasConNota = filas.every((f) => !f.requiereNota);
  const datosOk = hayCantidad && todasConNota && !hayExceso;

  const guardado = avance !== null;
  const puedeGuardar = !soloLectura && datosOk && !guardado;

  const handleGuardar = () => {
    if (!puedeGuardar) return;
    const total = filas.filter((f) => f.capturado > 0).length;
    setAvance({ periodo: PERIODO_LABEL, totalConceptos: total });
  };

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
          { label: 'Periodo:', value: PERIODO_LABEL, resaltado: true }
        ]}
      />

      {guardado && (
        <div
          className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md"
          data-testid="aviso-avance-guardado"
        >
          <div className="text-sm font-semibold text-sigecop-green-validation">
            ✓ Avance del periodo {avance.periodo} guardado
          </div>
          <p className="text-sm text-slate-800 mt-1">
            {avance.totalConceptos} concepto(s) actualizado(s). Vinculación a notas de
            bitácora registrada.
          </p>
        </div>
      )}

      {notasPeriodo.length === 0 && (
        <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 mb-4 text-sm text-slate-800 rounded-r-md">
          ⚠️ No hay notas del periodo —{' '}
          <Link to="/bitacora/notas" className="text-sigecop-blue underline">
            emitir una en HU-09 primero
          </Link>
          .
        </div>
      )}

      <RegionEditable disabled={soloLectura || guardado}>
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
                  <th className="text-right p-3 font-semibold">% avance</th>
                  <th className="text-left p-3 font-semibold">Nota de bitácora</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const avancePct = Math.round((f.acumNuevo / f.contratada) * 100);
                  const filaRoja = f.excede ? 'bg-red-50' : f.requiereNota ? 'bg-yellow-50' : '';
                  return (
                    <tr
                      key={f.id}
                      className={`border-t border-slate-200 ${filaRoja || 'hover:bg-slate-50'}`}
                      data-fila-id={f.id}
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
                          onChange={(e) =>
                            actualizar(f.id, 'capturado', Number(e.target.value) || 0)
                          }
                          data-testid={`cap-${f.id}`}
                        />
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-bold ${f.excede ? 'text-red-700' : 'text-slate-900'}`}
                      >
                        {f.acumNuevo}
                      </td>
                      <td
                        className={`p-3 text-right font-mono ${f.excede ? 'text-red-700' : 'text-sigecop-blue'}`}
                      >
                        {avancePct}%
                      </td>
                      <td className="p-3">
                        <select
                          className={`sg-input ${f.requiereNota ? 'border-amber-400' : ''}`}
                          value={f.nota}
                          onChange={(e) => actualizar(f.id, 'nota', e.target.value)}
                          disabled={notasPeriodo.length === 0}
                          data-testid={`nota-${f.id}`}
                        >
                          {opcionesNota.map((n) => <option key={n}>{n}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </RegionEditable>

      {hayExceso && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-slate-800 rounded-r-md">
          ⛔ <strong>La cantidad acumulada excede la contratada</strong> en al menos un
          concepto. El sistema no permite registrar cantidades por encima del catálogo
          (art. 118 RLOPSRM). Corrige los renglones marcados en rojo o tramita un convenio
          modificatorio (HU-03).
        </div>
      )}

      {!hayExceso && hayCantidad && !todasConNota && (
        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 px-4 py-3 text-sm text-slate-800 rounded-r-md">
          ⚠️ Falta seleccionar la nota de bitácora para los conceptos con cantidad capturada.
        </div>
      )}

      {!soloLectura && !guardado && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!puedeGuardar}
            onClick={handleGuardar}
            data-testid="btn-guardar-avance"
          >
            Guardar avance del periodo
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-06"
        criterios={[
          { numero: 1, texto: 'Cada cantidad capturada queda ligada al concepto del catálogo correspondiente y a una nota de bitácora del periodo (tipo entrega de obra o avance).' },
          { numero: 2, texto: 'El sistema acumula el avance ejecutado por concepto y muestra el porcentaje de avance contra lo contratado en vivo, periodo a periodo.' },
          { numero: 3, texto: 'El sistema bloquea el registro cuando la cantidad acumulada excede la contratada (art. 118 RLOPSRM).' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 118 RLOPSRM (cantidad sobre contratada sin orden no es pagable).
      </p>
    </div>
  );
}
