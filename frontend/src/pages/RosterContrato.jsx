import { useState, useEffect, useCallback } from 'react';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';

// Pasada F (Fundación) — Sustitución de personas del roster del contrato.
// Fundamento Nivel 1 (literal, RLOPSRM art. 125 fr. I inciso g): al residente le corresponde
// registrar "La SUSTITUCIÓN del superintendente, del anterior residente y de la supervisión".
// Se SUSTITUYE, NO se borra: aquí se ve el roster vigente, el histórico de quién ocupó cada rol,
// y se ejecuta la sustitución (el backend cierra la anterior + crea la nueva + sincroniza el caché).

const ROL_LABEL = {
  residente: 'Residente de obra',
  superintendente: 'Superintendente (contratista)',
  supervision: 'Supervisión externa'
};
const ROLES = ['residente', 'superintendente', 'supervision'];
// rol-de-roster → rol-de-cuenta esperado (el backend lo valida).
const ROL_CUENTA = { residente: 'residente', superintendente: 'contratista', supervision: 'supervision' };

const fmtFecha = (iso) => {
  if (!iso) return '—';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
};

export default function RosterContrato() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinToken = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [data, setData] = useState(null); // { vigente, historial }
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Formulario de sustitución
  const [rolSust, setRolSust] = useState('');
  const [elegibles, setElegibles] = useState([]);
  const [elegiblesError, setElegiblesError] = useState(null);
  const [nuevoId, setNuevoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (sinToken) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinToken]);

  const cargarRoster = useCallback(async (id) => {
    if (!id) { setData(null); return; }
    setCargando(true); setError(null);
    try { setData(await api.rosterContrato(id)); }
    catch (e) { setError(e.message || 'No se pudo cargar el roster'); setData(null); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    cargarRoster(contratoId);
    setRolSust(''); setNuevoId(''); setMotivo(''); setElegibles([]);
  }, [contratoId, cargarRoster]);

  // P1 (revisión 14-jun): TODOS los slots (residente/superintendente/supervisión) leen sus candidatos por
  // /usuarios/asignables (el endpoint ya admite 'residente' y su gate permite residente Y dependencia, que
  // son justo quienes operan la sustitución). NO se silencia el error con .catch(()=>[]): antes el selector
  // quedaba vacío sin avisar (parecía "no hay candidatos") cuando en realidad era un 403 por gate cruzado.
  useEffect(() => {
    if (!rolSust) { setElegibles([]); setElegiblesError(null); return; }
    setNuevoId(''); setElegiblesError(null);
    api.listarAsignables(ROL_CUENTA[rolSust])
      .then((list) => setElegibles(Array.isArray(list) ? list : []))
      .catch((e) => {
        setElegibles([]);
        setElegiblesError(e.status === 403
          ? 'No tienes permiso para listar las cuentas elegibles de este rol.'
          : (e.message || 'No se pudieron cargar las cuentas elegibles.'));
      });
  }, [rolSust]);

  const sustituir = async () => {
    if (!rolSust || !nuevoId || !motivo.trim()) { showToast('Elige rol, nueva persona y captura el motivo.'); return; }
    setEnviando(true);
    try {
      await api.sustituirPersona(contratoId, { rol: rolSust, nuevoUsuarioId: Number(nuevoId), motivo: motivo.trim() });
      showToast('Sustitución registrada. La persona anterior queda en el histórico (no se borra).');
      setRolSust(''); setNuevoId(''); setMotivo('');
      await cargarRoster(contratoId);
    } catch (e) { showToast(e.message || 'No se pudo registrar la sustitución'); }
    finally { setEnviando(false); }
  };

  const histDeRol = (rol) => (data?.historial || []).filter((h) => h.rol === rol);

  // O1-W2 (testing del equipo, 09-jun): "Asignación inicial (alta del contrato)" NO es un motivo;
  // se separa en columna EVENTO (Alta del contrato | Sustitución) y el MOTIVO queda solo para los
  // cambios reales. Derivado en frontend (sin DDL): la fila inicial es la que no sustituye a nadie
  // (sustituye_a == null); su motivo en BD es el texto fijo del alta y aquí se oculta.
  const MOTIVO_ALTA = 'Asignación inicial (alta del contrato)';
  const eventoDe = (h) => (h.sustituye_a != null ? 'Sustitución' : (h.motivo === MOTIVO_ALTA ? 'Alta del contrato' : 'Alta del rol'));
  const motivoDe = (h) => (h.sustituye_a == null && h.motivo === MOTIVO_ALTA ? '' : (h.motivo || ''));

  return (
    <div>
      <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Roster del contrato' }]} />

      <h1 className="text-2xl font-bold text-sigecop-blue mb-2">Sustitución de personas del roster</h1>
      <p className="text-sm text-slate-600 mb-3 max-w-3xl">
        Sustituye al residente, superintendente o supervisión <strong>conservando el histórico</strong> de
        quién ocupó cada rol y desde cuándo. Una persona <strong>nunca se borra: se sustituye</strong>
        (art. 125 fr. I inciso g RLOPSRM). Las firmas ya registradas conservan a su firmante original.
      </p>
      {/* FIX 3.4 — la dependencia contratante NO es persona del roster sustituible (art. 125 fr. I g solo lista
          residente/superintendente/supervisión). Se deja explícito para no inducir a "sustituir" al contratante. */}
      <p className="text-xs text-slate-500 mb-6 max-w-3xl bg-slate-50 border border-borde rounded-md px-3 py-2" data-testid="roster-dependencia-aviso">
        La <strong>dependencia contratante</strong> no es sustituible por aquí: el contrato se liga a ella y el
        art. 125 fr. I g RLOPSRM solo prevé sustituir al residente, al superintendente y a la supervisión. Una
        dependencia mal capturada se corrige por vía administrativa, no como sustitución de roster.
      </p>

      {sinToken ? (
        <div data-testid="roster-sin-sesion" className="rounded-md border border-borde bg-pagina px-4 py-8 text-center text-sm text-slate-600">
          Inicia sesión (no en modo demostración) como Dependencia o Residente para gestionar el roster.
        </div>
      ) : (
        <>
          <div className="mb-6 max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-1">Contrato</label>
            <select
              data-testid="roster-contrato"
              className="sg-input"
              value={contratoId}
              onChange={(e) => setContratoId(e.target.value)}
            >
              <option value="">— Selecciona un contrato —</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>{c.folio} — {c.objeto || c.contratista || `Contrato ${c.id}`}</option>
              ))}
            </select>
          </div>

          {!contratoId ? (
            <p className="text-sm text-slate-500">Selecciona un contrato para ver y gestionar su roster.</p>
          ) : cargando ? (
            <p className="text-sm text-slate-500">Cargando roster…</p>
          ) : error ? (
            <div data-testid="roster-error" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : data ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Roster vigente + histórico por rol */}
              <div className="lg:col-span-2 space-y-4" data-testid="roster-vigente">
                {ROLES.map((rol) => {
                  const v = data.vigente?.[rol];
                  const hist = histDeRol(rol);
                  return (
                    <div key={rol} className="bg-white border border-borde rounded-lg p-4" data-testid={`roster-rol-${rol}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{ROL_LABEL[rol]}</div>
                          <div className="text-base font-bold text-sigecop-blue" data-testid={`vigente-${rol}`}>
                            {v ? (v.nombre || `Usuario #${v.usuario_id}`) : '— sin asignar —'}
                          </div>
                          {/* O3: empresa del vigente (catálogo del profe). */}
                          {v && v.empresa && <div className="text-xs text-slate-500" data-testid={`vigente-empresa-${rol}`}>{v.empresa}</div>}
                          {v && <div className="text-xs text-slate-500">Vigente desde {fmtFecha(v.desde)}{!v.versionado && ' · (sin versionar aún)'}</div>}
                        </div>
                      </div>
                      {hist.length > 0 && (
                        <table className="w-full text-xs mt-3 border-t border-slate-100">
                          <thead className="text-tinta-sec">
                            <tr><th className="text-left py-1">Persona</th><th className="text-left">Desde</th><th className="text-left">Hasta</th><th className="text-left">Evento</th><th className="text-left">Motivo</th></tr>
                          </thead>
                          <tbody>
                            {hist.map((h) => (
                              <tr key={h.id} className={`border-t border-slate-50 ${h.vigencia_hasta ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>
                                <td className="py-1">{h.usuario_nombre || `#${h.usuario_id}`}</td>
                                <td>{fmtFecha(h.vigencia_desde)}</td>
                                <td>{h.vigencia_hasta ? fmtFecha(h.vigencia_hasta) : <span className="text-exito font-semibold">vigente</span>}</td>
                                <td data-testid={`roster-evento-${h.id}`}>{eventoDe(h)}</td>
                                <td className="truncate max-w-[12rem]" title={motivoDe(h)}>{motivoDe(h) || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Formulario de sustitución */}
              <div className="bg-white border border-borde rounded-lg p-4 h-fit" data-testid="roster-form-sustituir">
                <h2 className="text-sm font-bold text-sigecop-blue mb-3">Registrar una sustitución</h2>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rol a sustituir</label>
                <select data-testid="sust-rol" className="sg-input mb-3" value={rolSust} onChange={(e) => setRolSust(e.target.value)}>
                  <option value="">— Elige rol —</option>
                  {ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                </select>

                <label className="block text-xs font-medium text-slate-600 mb-1">Nueva persona</label>
                {/* B-1 (auditoría selección-vs-texto libre): la nueva persona SIEMPRE se SELECCIONA de
                    cuentas reales del rol correcto. Se ELIMINA el fallback de teclear el ID a mano
                    (sust-nuevo-id): un ID tecleado rompe la trazabilidad/auditabilidad. Si no hay
                    cuentas elegibles, se avisa (no se captura). El backend valida existencia/activa/rol
                    igual (roster.controller, art. 125 fr. I g RLOPSRM) — esto solo endurece la UI. */}
                {elegibles.length > 0 ? (
                  <select data-testid="sust-nuevo" className="sg-input mb-3" value={nuevoId} onChange={(e) => setNuevoId(e.target.value)} disabled={!rolSust}>
                    <option value="">— Elige a la nueva persona —</option>
                    {elegibles.map((u) => <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>)}
                  </select>
                ) : elegiblesError ? (
                  <div data-testid="sust-elegibles-error" className="mb-3 bg-red-50 border-l-4 border-red-400 px-3 py-2 text-sm text-red-800 rounded-r-md">
                    {elegiblesError}
                  </div>
                ) : (
                  <div data-testid="sust-sin-elegibles" className="mb-3 bg-aviso-bg border-l-4 border-aviso px-3 py-2 text-sm text-aviso rounded-r-md">
                    {rolSust
                      ? 'No hay cuentas disponibles para este rol. Debe registrarse y aprobarse una cuenta con el rol correcto antes de poder sustituir.'
                      : 'Elige primero el rol a sustituir para ver las cuentas disponibles.'}
                  </div>
                )}

                <label className="block text-xs font-medium text-slate-600 mb-1">Motivo (obligatorio)</label>
                <textarea data-testid="sust-motivo" className="sg-input mb-3" rows={3} placeholder="Renuncia, cese, reasignación…" value={motivo} onChange={(e) => setMotivo(e.target.value)} />

                <button
                  type="button"
                  data-testid="btn-sustituir"
                  onClick={sustituir}
                  disabled={enviando || !rolSust || !nuevoId || !motivo.trim()}
                  className="w-full px-3 py-2 rounded-md bg-sigecop-blue text-white text-sm font-semibold hover:bg-sigecop-blue/90 disabled:opacity-50"
                >
                  {enviando ? 'Registrando…' : 'Sustituir (conserva el histórico)'}
                </button>
                <p className="text-[11px] text-slate-500 mt-2">La persona anterior NO se borra: queda cerrada en el histórico. La sustitución solo afecta firmas futuras.</p>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
