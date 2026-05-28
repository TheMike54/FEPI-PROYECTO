import { useState, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  conceptosAlertaDummy,
  alertasConfiguradasDummy,
  avanceConceptoAlertaDummy
} from '../data/dummy.js';

function EstadoBadge({ estado }) {
  const map = {
    Activa:  'bg-green-100 text-sigecop-green-validation',
    Pausada: 'bg-slate-200 text-slate-600'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${map[estado] || 'bg-slate-200 text-slate-600'}`}>
      {estado}
    </span>
  );
}

// Próximo folio A-NNN a partir del máximo existente.
function siguienteFolio(alertas) {
  let max = 0;
  for (const a of alertas) {
    const m = (a.folio || '').match(/A-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `A-${String(max + 1).padStart(3, '0')}`;
}

export default function AlertasAtraso() {
  const { soloLectura } = useVistaHU('HU-07');

  // Estado local que arranca con el dummy y crece con cada "Crear alerta".
  // Las acciones de Pausar/Reanudar/Eliminar también operan sobre este estado.
  const [alertas, setAlertas] = useState(alertasConfiguradasDummy);

  const [concepto, setConcepto] = useState('');
  const [umbral, setUmbral] = useState('');
  const [canal, setCanal] = useState('');

  // "Crear alerta" sólo se habilita con concepto + umbral válido (1-100) + canal.
  const umbralNum = Number(umbral);
  const umbralOk = Number.isFinite(umbralNum) && umbralNum >= 1 && umbralNum <= 100;
  const formOk = !!concepto && umbralOk && !!canal;
  const puedeCrear = !soloLectura && formOk;

  const handleCrear = () => {
    if (!puedeCrear) return;
    const folio = siguienteFolio(alertas);
    const nueva = {
      folio,
      concepto,
      umbral: umbralNum,
      canal,
      estado: 'Activa',
      esNueva: true            // marca para fondo verde y diferenciarla en E2E
    };
    setAlertas((prev) => [nueva, ...prev]);
    // Limpiar el formulario para permitir crear otra.
    setConcepto('');
    setUmbral('');
    setCanal('');
  };

  const cambiarEstado = (folio, nuevo) => {
    setAlertas((prev) => prev.map((a) => (a.folio === folio ? { ...a, estado: nuevo } : a)));
  };

  const eliminar = (folio, concepto) => {
    // Confirm nativo del navegador — placeholder consciente del prototipo, sin
    // modal custom (en producción iría un diálogo accesible).
    // eslint-disable-next-line no-alert
    if (!window.confirm(`¿Eliminar la alerta de "${concepto}"? Esta acción no se puede deshacer.`)) return;
    setAlertas((prev) => prev.filter((a) => a.folio !== folio));
  };

  // Timeline simulado: para cada alerta Activa, leemos su % de avance del
  // catálogo (avanceConceptoAlertaDummy) y comparamos contra el umbral.
  // Si avance < umbral → entra al timeline como "disparada".
  const disparadas = useMemo(() => {
    return alertas
      .filter((a) => a.estado === 'Activa')
      .map((a) => {
        const avance = avanceConceptoAlertaDummy[a.concepto] ?? null;
        return { ...a, avance };
      })
      .filter((a) => a.avance !== null && a.avance < a.umbral);
  }, [alertas]);

  return (
    <div>
      <HeaderVista
        huId="HU-07"
        titulo="Configuración de alertas de atraso"
        sprint="Sprint 6"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Seguimiento' },
          { label: 'Alertas de atraso' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[{ value: contratoDummy.contratista }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de nueva alerta */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-md p-6">
          <h2 className="text-lg font-bold text-sigecop-blue mb-4">Nueva alerta</h2>

          <RegionEditable disabled={soloLectura}>
            <div className="space-y-4">
              <div>
                <label className="sg-label">Concepto a vigilar *</label>
                <select
                  className="sg-input"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  data-testid="al-concepto"
                >
                  <option value="">— Selecciona concepto —</option>
                  {conceptosAlertaDummy.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="sg-label">Umbral de atraso (%) *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  className="sg-input"
                  value={umbral}
                  onChange={(e) => setUmbral(e.target.value)}
                  placeholder="1 a 100"
                  data-testid="al-umbral"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Notificar si el avance real es menor a este porcentaje.
                </p>
              </div>

              <div>
                <span className="sg-label block">Canal de notificación *</span>
                <div className="mt-1 space-y-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="al-canal"
                      value="Sistema"
                      checked={canal === 'Sistema'}
                      onChange={(e) => setCanal(e.target.value)}
                      data-testid="al-canal-sistema"
                    />
                    Sistema
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="al-canal"
                      value="Correo"
                      checked={canal === 'Correo'}
                      onChange={(e) => setCanal(e.target.value)}
                      data-testid="al-canal-correo"
                    />
                    Correo
                  </label>
                </div>
              </div>
            </div>
          </RegionEditable>

          {!soloLectura && (
            <div className="mt-6">
              <button
                type="button"
                className="sg-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!puedeCrear}
                onClick={handleCrear}
                data-testid="btn-crear-alerta"
              >
                Crear alerta
              </button>
            </div>
          )}
        </div>

        {/* Tabla de alertas configuradas */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Alertas configuradas ({alertas.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="tabla-alertas">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left p-3 font-semibold w-20">Folio</th>
                  <th className="text-left p-3 font-semibold">Concepto</th>
                  <th className="text-center p-3 font-semibold">Umbral</th>
                  <th className="text-left p-3 font-semibold">Canal</th>
                  <th className="text-center p-3 font-semibold">Estado</th>
                  {!soloLectura && (
                    <th className="text-right p-3 font-semibold">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {alertas.length === 0 ? (
                  <tr>
                    <td colSpan={soloLectura ? 5 : 6} className="p-8 text-center text-slate-400 italic">
                      Sin alertas configuradas para este contrato.
                    </td>
                  </tr>
                ) : (
                  alertas.map((a) => (
                    <tr
                      key={a.folio}
                      className={`border-t border-slate-200 ${a.esNueva ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                      data-testid={`alerta-${a.folio}`}
                    >
                      <td className="p-3 font-mono text-xs">{a.folio}</td>
                      <td className="p-3 font-semibold">{a.concepto}</td>
                      <td className="p-3 text-center font-mono">&lt; {a.umbral}%</td>
                      <td className="p-3">{a.canal}</td>
                      <td className="p-3 text-center"><EstadoBadge estado={a.estado} /></td>
                      {!soloLectura && (
                        <td className="p-3 text-right whitespace-nowrap">
                          {a.estado === 'Activa' ? (
                            <button
                              type="button"
                              className="text-xs text-sigecop-accent hover:underline mr-3"
                              onClick={() => cambiarEstado(a.folio, 'Pausada')}
                              data-testid={`btn-pausar-${a.folio}`}
                            >
                              Pausar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-xs text-sigecop-accent hover:underline mr-3"
                              onClick={() => cambiarEstado(a.folio, 'Activa')}
                              data-testid={`btn-reanudar-${a.folio}`}
                            >
                              Reanudar
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => eliminar(a.folio, a.concepto)}
                            data-testid={`btn-eliminar-${a.folio}`}
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alertas disparadas — timeline simulado */}
      <div className="mt-8 bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Alertas disparadas ({disparadas.length})
          </h2>
        </div>
        <div className="p-6">
          {disparadas.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Sin disparos pendientes. Todas las alertas activas tienen avance al
              o por encima de su umbral.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="lista-disparadas">
              {disparadas.map((a) => (
                <li
                  key={a.folio}
                  className="flex items-start gap-3 border-l-4 border-sigecop-amber-attention bg-amber-50 px-4 py-3 rounded-r-md"
                  data-testid={`disparada-${a.folio}`}
                >
                  <span className="text-xl leading-none">⚠</span>
                  <div className="text-sm text-slate-800">
                    <strong>{a.concepto}</strong> en <strong>{a.avance}%</strong>
                    {' '}(umbral {a.umbral}%) — notificación enviada por{' '}
                    <strong>{a.canal}</strong>.
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <SeccionCriterios
        huId="HU-07"
        criterios={[
          { numero: 1, texto: 'Se pueden crear, pausar y eliminar alertas por concepto sin alterar las del resto.' },
          { numero: 2, texto: 'La alerta solo dispara cuando el avance real es menor al umbral configurado por el usuario.' },
          { numero: 3, texto: 'La notificación se entrega por el canal elegido al configurar la alerta (sistema o correo).' }
        ]}
      />
    </div>
  );
}
