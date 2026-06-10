import { useState, useEffect, useCallback, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSearchParams } from 'react-router-dom';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';

// HU-07 cableado al backend (recurso /api/alertas). Una alerta se configura por
// CONCEPTO del catálogo (contrato_concepto_id) con un umbral_pct y canal 'sistema'.
// El disparo lo evalúa el backend a partir del avance físico (concepto_avance):
// una alerta está "disparada" si hay avance registrado Y está activa Y el % < umbral.
// Sin avance registrado => estado neutro ("sin avance registrado"), nunca 0% disparado.

function EstadoBadge({ activa }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        activa ? 'bg-exito-bg text-exito' : 'bg-slate-200 text-slate-600'
      }`}
    >
      {activa ? 'Activa' : 'Pausada'}
    </span>
  );
}

export default function AlertasAtraso() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-07');
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [conceptos, setConceptos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Formulario de nueva alerta. canal fijo 'sistema' en Etapa 1 (correo no disponible).
  const [conceptoId, setConceptoId] = useState('');
  const [umbral, setUmbral] = useState('');

  // Carga inicial: contratos del usuario (acotados server-side por participación).
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos()
      .then((l) => setContratos(Array.isArray(l) ? l : []))
      .catch(() => setContratos([]));
  }, [sinSesion]);

  const cargarAlertas = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await api.alertasDeContrato(id);
      setAlertas(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.status === 403 ? 'No tienes acceso a las alertas de este contrato.' : 'No se pudieron cargar las alertas.');
      setAlertas([]);
    }
  }, []);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setConceptos([]);
    setAlertas([]);
    setError('');
    setConceptoId('');
    setUmbral('');
    if (!id) return;
    setCargando(true);
    try {
      // Conceptos reales para el selector (value = contrato_concepto_id).
      const det = await api.detalleContrato(id);
      setConceptos(Array.isArray(det?.conceptos) ? det.conceptos : []);
      await cargarAlertas(id);
    } catch (e) {
      setError(e.status === 403 ? 'No tienes acceso a este contrato.' : 'No se pudo cargar el contrato.');
    } finally {
      setCargando(false);
    }
  }, [cargarAlertas]);

  // Pase 4: si llegamos con ?contrato=ID (acceso directo desde el detalle del contrato), preselecciona
  // ese contrato en cuanto la lista esté cargada y mientras el usuario no haya elegido otro a mano.
  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  useEffect(() => {
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) {
      seleccionarContrato(String(contratoQuery));
    }
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionarContrato]);

  const contratoSel = useMemo(
    () => contratos.find((c) => String(c.id) === String(contratoId)) || null,
    [contratos, contratoId]
  );

  const umbralNum = Number(umbral);
  const umbralOk = Number.isFinite(umbralNum) && umbralNum >= 1 && umbralNum <= 100;
  const formOk = !!conceptoId && umbralOk;
  const puedeCrear = !soloLectura && formOk;

  const handleCrear = async () => {
    if (!puedeCrear) return;
    setError('');
    try {
      await api.crearAlerta({
        contrato_concepto_id: Number(conceptoId),
        umbral_pct: umbralNum,
        canal: 'sistema'
      });
      setConceptoId('');
      setUmbral('');
      await cargarAlertas(contratoId);
    } catch (e) {
      setError(e.message || 'No se pudo crear la alerta.');
    }
  };

  const cambiarEstado = async (id, nuevaActiva) => {
    setError('');
    try {
      await api.toggleAlerta(id, { activa: nuevaActiva });
      await cargarAlertas(contratoId);
    } catch (e) {
      setError(e.message || 'No se pudo actualizar la alerta.');
    }
  };

  const eliminar = async (id, label) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`¿Eliminar la alerta de "${label}"? Esta acción no se puede deshacer.`)) return;
    setError('');
    try {
      await api.eliminarAlerta(id);
      await cargarAlertas(contratoId);
    } catch (e) {
      setError(e.message || 'No se pudo eliminar la alerta.');
    }
  };

  const disparadas = useMemo(() => alertas.filter((a) => a.disparada), [alertas]);

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

      {sinSesion && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para cargar tus contratos y configurar sus alertas de atraso.
        </div>
      )}

      <div className="bg-white border border-borde rounded-lg p-4 mb-6 max-w-2xl">
        <label className="sg-label">Contrato</label>
        <select
          className="sg-input"
          value={contratoId}
          onChange={(e) => seleccionarContrato(e.target.value)}
          disabled={sinSesion}
          data-testid="select-contrato"
        >
          <option value="">— Selecciona un contrato —</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
        </select>
      </div>

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para configurar y consultar sus alertas.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando…</p>}
      {error && (
        <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 mb-4 text-sm text-amber-800 rounded-r-md" data-testid="aviso-error">
          {error}
        </div>
      )}

      {contratoId && !cargando && (
        <>
          {contratoSel && (
            <EncabezadoContrato
              titulo="Contrato"
              folio={contratoSel.folio}
              items={[{ value: contratoSel.contratista }]}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario de nueva alerta */}
            <div className="lg:col-span-1 bg-white border border-borde rounded-lg p-6">
              <h2 className="text-lg font-bold text-sigecop-blue mb-4">Nueva alerta</h2>

              <RegionEditable disabled={soloLectura}>
                <div className="space-y-4">
                  <div>
                    <label className="sg-label">Concepto a vigilar *</label>
                    <select
                      className="sg-input"
                      value={conceptoId}
                      onChange={(e) => setConceptoId(e.target.value)}
                      data-testid="al-concepto"
                    >
                      <option value="">— Selecciona concepto —</option>
                      {conceptos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.clave ? `${c.clave} · ${c.concepto}` : c.concepto}
                        </option>
                      ))}
                    </select>
                    {conceptos.length === 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Este contrato no tiene conceptos de catálogo para vigilar.
                      </p>
                    )}
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
                      Notificar si el avance físico real es menor a este porcentaje.
                    </p>
                  </div>

                  <div>
                    <span className="sg-label block">Canal de notificación *</span>
                    <div className="mt-1 space-y-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="al-canal"
                          value="sistema"
                          checked
                          readOnly
                          data-testid="al-canal-sistema"
                        />
                        Sistema
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-400">
                        <input
                          type="radio"
                          name="al-canal"
                          value="correo"
                          disabled
                          data-testid="al-canal-correo"
                        />
                        Correo <span className="text-xs">(no disponible en Etapa 1)</span>
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
            <div className="lg:col-span-2 bg-white border border-borde rounded-lg overflow-hidden">
              <div className="px-6 py-3 border-b border-borde">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Alertas configuradas ({alertas.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="tabla-alertas">
                  <thead className="bg-pagina text-tinta-sec">
                    <tr>
                      <th className="text-left p-3 font-semibold">Concepto</th>
                      <th className="text-center p-3 font-semibold">Umbral</th>
                      <th className="text-center p-3 font-semibold">Avance</th>
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
                          key={a.id}
                          className={`border-t border-borde ${a.disparada ? 'bg-amber-50' : 'hover:bg-pagina'}`}
                          data-testid={`alerta-${a.id}`}
                        >
                          <td className="p-3 font-semibold">{a.concepto_label}</td>
                          <td className="p-3 text-center font-mono">&lt; {a.umbral_pct}%</td>
                          <td className="p-3 text-center font-mono">
                            {a.avance_registrado
                              ? `${a.avance_pct}%`
                              : <span className="text-slate-400 italic text-xs">sin avance registrado</span>}
                          </td>
                          <td className="p-3 capitalize">{a.canal}</td>
                          <td className="p-3 text-center"><EstadoBadge activa={a.activa} /></td>
                          {!soloLectura && (
                            <td className="p-3 text-right whitespace-nowrap">
                              {a.activa ? (
                                <button
                                  type="button"
                                  className="text-xs text-sigecop-accent hover:underline mr-3"
                                  onClick={() => cambiarEstado(a.id, false)}
                                  data-testid={`btn-pausar-${a.id}`}
                                >
                                  Pausar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="text-xs text-sigecop-accent hover:underline mr-3"
                                  onClick={() => cambiarEstado(a.id, true)}
                                  data-testid={`btn-reanudar-${a.id}`}
                                >
                                  Reanudar
                                </button>
                              )}
                              <button
                                type="button"
                                className="text-xs text-red-600 hover:underline"
                                onClick={() => eliminar(a.id, a.concepto_label)}
                                data-testid={`btn-eliminar-${a.id}`}
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

          {/* Alertas disparadas — evaluadas por el backend (avance físico). */}
          <div className="mt-8 bg-white border border-borde rounded-lg overflow-hidden">
            <div className="px-6 py-3 border-b border-borde">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Alertas disparadas ({disparadas.length})
              </h2>
            </div>
            <div className="p-6">
              {disparadas.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  Sin disparos pendientes. Las alertas activas con avance registrado están al o
                  por encima de su umbral; las que no tienen avance registrado no disparan.
                </p>
              ) : (
                <ul className="space-y-3" data-testid="lista-disparadas">
                  {disparadas.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start gap-3 border-l-4 border-sigecop-amber-attention bg-amber-50 px-4 py-3 rounded-r-md"
                      data-testid={`disparada-${a.id}`}
                    >
                      <span className="text-xl leading-none">⚠</span>
                      <div className="text-sm text-slate-800">
                        <strong>{a.concepto_label}</strong> en <strong>{a.avance_pct}%</strong>
                        {' '}(umbral {a.umbral_pct}%) — notificación por{' '}
                        <strong>{a.canal}</strong>.
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

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
