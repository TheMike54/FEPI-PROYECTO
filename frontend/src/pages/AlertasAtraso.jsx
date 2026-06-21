import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';

// HU-07 v2 (O5, 10-jun) — ATRASO POR CONCEPTO, automático y en UNIDADES (rediseño del profe, P15).
// Ya NO se configuran umbrales ni canales: para el contrato elegido el backend lista TODOS los
// conceptos con DÉFICIT = programado_acumulado(al periodo vigente, programa VIGENTE) − ejecutado_
// acumulado, solo los > 0, en las unidades del concepto. Se recalcula al consultar (sin cron).
// El residente puede "Asentar en bitácora" cada atraso (genera una nota; exige bitácora abierta).
// Este panel es DISTINTO del "Avance de obra" ponderado (curva/estimación) — el profe insistió en
// no mezclarlos (P15).

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });
const fmtFecha = (f) => (f ? new Date(`${String(f).slice(0, 10)}T00:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—');

export default function AlertasAtraso() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-07');
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [data, setData] = useState(null); // { periodo_actual, atrasos, total_atrasos, total_conceptos }
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [asentandoId, setAsentandoId] = useState(null);

  // Carga inicial: contratos del usuario (acotados server-side por participación).
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos()
      .then((l) => setContratos(Array.isArray(l) ? l : []))
      .catch(() => setContratos([]));
  }, [sinSesion]);

  const cargarAtrasos = useCallback(async (id) => {
    if (!id) return;
    setCargando(true);
    setError('');
    try {
      const d = await api.alertasDeContrato(id);
      setData(d && typeof d === 'object' ? d : null);
    } catch (e) {
      setError(e.status === 403 ? 'No tienes acceso al atraso de este contrato.' : 'No se pudo cargar el atraso del contrato.');
      setData(null);
    } finally {
      setCargando(false);
    }
  }, []);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setData(null);
    setError('');
    setMensaje('');
    if (!id) return;
    await cargarAtrasos(id);
  }, [cargarAtrasos]);

  // Pase 4: acceso directo desde el detalle del contrato (?contrato=ID) — preselecciona en cuanto la
  // lista esté cargada y mientras el usuario no haya elegido otro a mano.
  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  const conceptoQuery = searchParams.get('concepto'); // BLOQUE D — deep-link de la campana: resalta el concepto exacto
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

  const atrasos = Array.isArray(data?.atrasos) ? data.atrasos : [];

  const asentar = async (fila) => {
    if (soloLectura) return;
    setError('');
    setMensaje('');
    setAsentandoId(fila.contrato_concepto_id);
    try {
      const r = await api.asentarAtraso(contratoId, { contrato_concepto_id: fila.contrato_concepto_id });
      setMensaje(`Atraso de "${fila.concepto}" asentado en la bitácora (nota #${r?.nota?.numero ?? '—'}).`);
    } catch (e) {
      setError(e.message || 'No se pudo asentar el atraso en la bitácora.');
    } finally {
      setAsentandoId(null);
    }
  };

  return (
    <div>
      <HeaderVista
        huId="HU-07"
        titulo="Atraso por concepto"
        sprint="Sprint 6"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Seguimiento' },
          { label: 'Atraso por concepto' }
        ]}
      />

      <PestanasCiclo ciclo="avance" activo="alertas" />

      {sinSesion && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para cargar tus contratos y consultar su atraso por concepto.
        </div>
      )}

      {/* P15: separar explícitamente este panel del "Avance de obra" ponderado (curva/estimación). */}
      <div className="bg-sigecop-blue-light/40 border border-borde rounded-md px-4 py-3 mb-6 text-sm text-slate-700">
        <strong>Atraso por concepto</strong> — déficit en <strong>unidades del concepto</strong> entre lo
        programado acumulado (programa vigente, al periodo en curso) y lo ejecutado acumulado. Se calcula
        automáticamente; no usa umbrales ni porcentajes. Es distinto del{' '}
        <Link to="/seguimiento/curva-avance" className="text-sigecop-accent hover:underline">Avance de obra</Link>{' '}
        ponderado (curva y estimaciones).
      </div>

      {/* 3A · P3 — hereda el contrato activo global en vez de re-seleccionarlo aquí. */}
      <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para consultar su atraso por concepto.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando…</p>}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 mb-4 text-sm text-red-800 rounded-r-md" data-testid="aviso-error">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="bg-exito-bg border-l-4 border-exito px-4 py-3 mb-4 text-sm text-exito rounded-r-md" data-testid="aviso-ok">
          {mensaje}
        </div>
      )}

      {contratoId && !cargando && data && (
        <>
          {contratoSel && (
            <EncabezadoContrato
              titulo="Contrato"
              folio={contratoSel.folio}
              items={[{ value: contratoSel.contratista }]}
            />
          )}

          <div className="mb-4 text-sm text-slate-600" data-testid="periodo-actual">
            {data.periodo_actual
              ? <>Atraso medido al <strong>periodo {data.periodo_actual.numero}</strong> ({fmtFecha(data.periodo_actual.inicio)} – {fmtFecha(data.periodo_actual.fin)}).</>
              : <>El contrato aún no inicia su primer periodo del programa: no hay atraso que medir todavía.</>}
          </div>

          <div className="bg-white border border-borde rounded-lg overflow-hidden">
            <div className="px-6 py-3 border-b border-borde flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Conceptos en atraso ({atrasos.length})
              </h2>
              <span className="text-xs text-slate-500">{data.total_conceptos} concepto(s) en el catálogo</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-atrasos">
                <thead className="bg-pagina text-tinta-sec">
                  <tr>
                    <th className="text-left p-3 font-semibold">Concepto</th>
                    <th className="text-center p-3 font-semibold">Unidad</th>
                    <th className="text-right p-3 font-semibold">Programado acum.</th>
                    <th className="text-right p-3 font-semibold">Ejecutado acum.</th>
                    <th className="text-right p-3 font-semibold">Déficit</th>
                    {!soloLectura && <th className="text-right p-3 font-semibold">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {atrasos.length === 0 ? (
                    <tr>
                      <td colSpan={soloLectura ? 5 : 6} className="p-8 text-center text-slate-500" data-testid="sin-atrasos">
                        {data.periodo_actual
                          ? <span className="font-medium text-exito">Sin atrasos: lo ejecutado va al día con el programa al periodo vigente.</span>
                          : <span className="italic text-slate-400">El contrato aún no inicia su primer periodo; no hay atraso que medir todavía.</span>}
                      </td>
                    </tr>
                  ) : (
                    atrasos.map((a) => (
                      <tr
                        key={a.contrato_concepto_id}
                        className={`border-t border-borde ${String(a.contrato_concepto_id) === conceptoQuery ? 'bg-amber-100 ring-2 ring-inset ring-sigecop-amber-attention' : 'bg-amber-50'}`}
                        data-testid={`fila-atraso-${a.contrato_concepto_id}`}
                      >
                        <td className="p-3 font-semibold">{a.concepto_label}</td>
                        <td className="p-3 text-center">{a.unidad || '—'}</td>
                        <td className="p-3 text-right font-mono">{fmt(a.programado_acumulado)}</td>
                        <td className="p-3 text-right font-mono">{fmt(a.ejecutado_acumulado)}</td>
                        <td className="p-3 text-right font-mono font-bold text-sigecop-amber-attention" data-testid={`deficit-${a.contrato_concepto_id}`}>
                          {fmt(a.deficit)} {a.unidad || ''}
                        </td>
                        {!soloLectura && (
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              className="text-xs text-sigecop-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => asentar(a)}
                              disabled={asentandoId === a.contrato_concepto_id}
                              data-testid={`btn-asentar-${a.contrato_concepto_id}`}
                            >
                              {asentandoId === a.contrato_concepto_id ? 'Asentando…' : 'Asentar en bitácora'}
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
        </>
      )}

      <SeccionCriterios
        huId="HU-07"
        criterios={[
          { numero: 1, texto: 'El panel lista automáticamente los conceptos con déficit (programado − ejecutado) en unidades, al periodo vigente, sin umbrales ni porcentajes.' },
          { numero: 2, texto: 'Un concepto sin déficit no aparece; el cálculo usa el programa vigente (lo reescriben los convenios).' },
          { numero: 3, texto: 'El residente puede asentar cada atraso como nota de bitácora (requiere bitácora abierta).' }
        ]}
      />
    </div>
  );
}
