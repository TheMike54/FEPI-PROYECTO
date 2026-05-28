import { useState, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU, useSesion } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  tiposConvenioModificatorio,
  historicoVersionesContratoDummy,
  contratoBaseModificatorios,
  fianzasListadoDummy,
  firmantePorRol
} from '../data/dummy.js';

const formatoMoneda = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0
});

// Próxima versión del contrato: lee el máximo "vN" en el histórico.
function siguienteVersion(historico) {
  let max = 0;
  for (const v of historico) {
    const m = (v.version || '').match(/v(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `v${max + 1}`;
}

const hoyLabel = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function ConveniosModificatorios() {
  const { soloLectura } = useVistaHU('HU-03');
  const { rol } = useSesion();

  const [tipo, setTipo] = useState(tiposConvenioModificatorio[0]);
  const [descripcion, setDescripcion] = useState('Incorporación de partidas adicionales en cimentación del eje 8-A.');
  const [oficio, setOficio] = useState('');
  const [monto, setMonto] = useState(0);
  const [dias, setDias] = useState(0);
  const [motivo, setMotivo] = useState('');

  // Histórico local: las versiones nuevas suben encima del dummy.
  const [historicoLocal, setHistoricoLocal] = useState([]);
  const [avisoModificatorio, setAvisoModificatorio] = useState(null); // { version, tipoRegimen } o null

  const {
    montoOriginal,
    plazoOriginalDias,
    umbralMontoExtraordinario,
    umbralPlazoExtraordinario
  } = contratoBaseModificatorios;
  const supera50 = monto > umbralMontoExtraordinario || dias > umbralPlazoExtraordinario;

  const requiereMonto = tipo === 'Monto' || tipo === 'Mixto' || tipo === 'Conceptos';
  const requierePlazo = tipo === 'Plazo' || tipo === 'Mixto';

  // Validación: descripción + motivo + oficio + algún cambio concreto
  // (monto>0 o dias>0 o tipo=Conceptos).
  const hayCambioConcreto =
    (requiereMonto && monto > 0) ||
    (requierePlazo && dias > 0) ||
    tipo === 'Conceptos';

  const datosOk =
    descripcion.trim().length > 0 &&
    motivo.trim().length > 0 &&
    oficio.trim().length > 0 &&
    hayCambioConcreto;

  const formCongelado = avisoModificatorio !== null; // tras registrar, lectura

  const puedeRegistrar = !soloLectura && datosOk && !formCongelado;

  const historicoCompleto = useMemo(
    () => [...historicoLocal, ...historicoVersionesContratoDummy],
    [historicoLocal]
  );

  const versionProxima = useMemo(
    () => siguienteVersion(historicoCompleto),
    [historicoCompleto]
  );

  // Endosos a fianzas que dispara el modificatorio actual.
  //   · Cumplimiento: siempre (la fianza principal cubre el contrato modificado).
  //   · Anticipo: cuando hay cambio de monto.
  //   · Vicios ocultos: cuando hay cambio de plazo.
  const endosos = useMemo(() => {
    const lista = [];
    for (const p of fianzasListadoDummy) {
      if (p.tipo === 'Cumplimiento') {
        lista.push({ ...p, motivoEndoso: 'Modificatorio del contrato base' });
      }
    }
    if (requiereMonto && monto > 0) {
      for (const p of fianzasListadoDummy) {
        if (p.tipo === 'Anticipo') {
          lista.push({ ...p, motivoEndoso: 'Cambio de monto (afecta anticipo)' });
        }
      }
    }
    if (requierePlazo && dias > 0) {
      for (const p of fianzasListadoDummy) {
        if (p.tipo === 'Vicios ocultos') {
          lista.push({ ...p, motivoEndoso: 'Cambio de plazo (afecta vicios ocultos)' });
        }
      }
    }
    return lista;
  }, [tipo, monto, dias, requiereMonto, requierePlazo]);

  const autorActivo = (rol && firmantePorRol[rol]) || 'Dependencia';

  const handleRegistrar = () => {
    if (!puedeRegistrar) return;
    const tipoRegimen = supera50 ? 'art. 59 Bis' : 'art. 59';
    const nuevaVersion = {
      version: versionProxima,
      fecha: hoyLabel(),
      autor: autorActivo,
      tipo: tipoRegimen,
      motivo: motivo.trim()
    };
    setHistoricoLocal((prev) => [nuevaVersion, ...prev]);
    setAvisoModificatorio({ version: versionProxima, tipoRegimen });
  };

  return (
    <div>
      <HeaderVista
        huId="HU-03"
        titulo="Trámite de convenios modificatorios"
        sprint="Sprint 6"
        rolAcademico="Dependencia"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Contratos' },
          { label: 'Convenios modificatorios' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { value: contratoDummy.contratista },
          { label: 'Monto original:', value: formatoMoneda.format(montoOriginal), resaltado: true },
          { label: 'Plazo:', value: `${plazoOriginalDias} días`, resaltado: true }
        ]}
      />

      {avisoModificatorio && (
        <div
          className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md"
          data-testid="aviso-modificatorio-registrado"
        >
          <div className="text-sm font-semibold text-sigecop-green-validation">
            ✓ Modificatorio registrado en versión {avisoModificatorio.version}
          </div>
          <p className="text-sm text-slate-800 mt-1">
            Catálogo y programa actualizados ({avisoModificatorio.tipoRegimen} LOPSRM).
            Endosos pendientes en SRV-01-02.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal: formulario */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md p-6">
          <h2 className="text-lg font-bold text-sigecop-blue mb-4">
            Nuevo convenio modificatorio
          </h2>

          <RegionEditable disabled={soloLectura || formCongelado}>
            <div className="space-y-4">
              <div>
                <label className="sg-label">Tipo de cambio *</label>
                <select
                  className="sg-input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  data-testid="cm-tipo"
                >
                  {tiposConvenioModificatorio.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Mixto cubre cambios combinados de monto y plazo.
                </p>
              </div>

              <div>
                <label className="sg-label">Descripción del cambio *</label>
                <textarea
                  className="sg-input"
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  data-testid="cm-descripcion"
                />
              </div>

              <div>
                <label className="sg-label">Oficio que respalda el modificatorio *</label>
                <input
                  className="sg-input"
                  value={oficio}
                  onChange={(e) => setOficio(e.target.value)}
                  placeholder="Ej.: OFICIO-SOP-2026-0142"
                  data-testid="cm-oficio"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="sg-label">
                    Monto del cambio ($)
                    {!requiereMonto && <span className="text-slate-400"> · opcional</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="sg-input"
                    value={monto}
                    onChange={(e) => setMonto(Number(e.target.value) || 0)}
                    data-testid="cm-monto"
                  />
                </div>
                <div>
                  <label className="sg-label">
                    Días de cambio
                    {!requierePlazo && <span className="text-slate-400"> · opcional</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="sg-input"
                    value={dias}
                    onChange={(e) => setDias(Number(e.target.value) || 0)}
                    data-testid="cm-dias"
                  />
                </div>
              </div>

              <div>
                <label className="sg-label">Motivo / justificación *</label>
                <textarea
                  className="sg-input"
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Fundamento técnico o legal del modificatorio…"
                  data-testid="cm-motivo"
                />
              </div>

              {supera50 ? (
                <div
                  className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 rounded-r-md"
                  data-testid="cm-regimen-59bis"
                >
                  ⚠️ <strong>Esta modificación supera el 50%.</strong> Aplica el art. 59 Bis
                  LOPSRM: el contratista puede solicitar ajuste de costos indirectos y
                  financiamiento dentro de los 15 días siguientes a la formalización del
                  modificatorio.
                </div>
              ) : (
                <div
                  className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-3 text-sm text-slate-800 rounded-r-md"
                  data-testid="cm-regimen-59"
                >
                  ✅ Modificación conforme al art. 59 LOPSRM. Al no superar el 50% del contrato
                  original (≤ {formatoMoneda.format(umbralMontoExtraordinario)} y{' '}
                  ≤ {umbralPlazoExtraordinario} días), no se activa el ajuste de costos del art. 59 Bis.
                </div>
              )}
            </div>
          </RegionEditable>

          {!soloLectura && !formCongelado && (
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
                disabled={!puedeRegistrar}
                onClick={handleRegistrar}
                data-testid="btn-registrar-modificatorio"
              >
                Registrar convenio modificatorio
              </button>
            </div>
          )}
        </div>

        {/* Columna lateral: resumen del umbral */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Referencia del 50%
          </h2>
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm space-y-2">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Monto original</div>
              <div className="font-mono">{formatoMoneda.format(montoOriginal)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Umbral 50% (monto)</div>
              <div className="font-mono text-sigecop-amber-attention">
                {formatoMoneda.format(umbralMontoExtraordinario)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Plazo original</div>
              <div className="font-mono">{plazoOriginalDias} días</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Umbral 50% (plazo)</div>
              <div className="font-mono text-sigecop-amber-attention">{umbralPlazoExtraordinario} días</div>
            </div>
          </div>
        </div>
      </div>

      {/* Endosos a fianzas requeridos */}
      <div className="mt-8 bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Endosos a fianzas requeridos ({endosos.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-endosos">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold">Tipo</th>
                <th className="text-left p-3 font-semibold">Folio</th>
                <th className="text-left p-3 font-semibold">Afianzadora</th>
                <th className="text-left p-3 font-semibold">Motivo del endoso</th>
                <th className="text-center p-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {endosos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-400 italic">
                    Ninguna fianza requiere endoso con el alcance actual del modificatorio.
                  </td>
                </tr>
              ) : (
                endosos.map((e) => (
                  <tr
                    key={`${e.folio}-${e.motivoEndoso}`}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="p-3 font-medium">{e.tipo}</td>
                    <td className="p-3 font-mono text-xs">{e.folio}</td>
                    <td className="p-3">{e.afianzadora}</td>
                    <td className="p-3 text-slate-700 text-xs">{e.motivoEndoso}</td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-sigecop-amber-attention border border-amber-300">
                        Endoso pendiente
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico de versiones */}
      <div className="mt-8 bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Histórico de versiones del contrato
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-historico">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold">Versión</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Autor</th>
                <th className="text-left p-3 font-semibold">Tipo</th>
                <th className="text-left p-3 font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {historicoCompleto.map((v, i) => {
                const esLocal = i < historicoLocal.length;
                return (
                  <tr
                    key={`${v.version}-${i}`}
                    className={`border-t border-slate-200 ${esLocal ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                    data-testid={esLocal ? `historico-nueva-${v.version}` : undefined}
                  >
                    <td className="p-3 font-semibold">{v.version}</td>
                    <td className="p-3">{v.fecha}</td>
                    <td className="p-3">{v.autor}</td>
                    <td className="p-3">{v.tipo}</td>
                    <td className="p-3 text-slate-700">{v.motivo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-03"
        criterios={[
          { numero: 1, texto: 'Al registrarse el modificatorio se genera una nueva versión del catálogo y del programa, sin alterar la versión anterior.' },
          { numero: 2, texto: 'El sistema indica si el modificatorio se rige por el art. 59 LOPSRM (modificatorio ordinario) o por el art. 59 Bis (ajuste de costos cuando se supera 50% del monto o 50% del plazo).' },
          { numero: 3, texto: 'El histórico de versiones registra fecha, autor y motivo del cambio, y los endosos correspondientes a las fianzas asociadas al modificatorio.' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: arts. 59 y 59 Bis LOPSRM.
      </p>
    </div>
  );
}
