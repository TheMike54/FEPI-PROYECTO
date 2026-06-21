import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import LinkHU from '../components/LinkHU.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import { api } from '../services/api.js';

// AMBIENTE DE AVANCE Y SEGUIMIENTO (sesión grande 18-jun, BLOQUE B) — cascarón que ENCADENA HU-06 (trabajos
// terminados) → HU-05 (curva de avance) → HU-07 (alertas de atraso) SIN fundir las HU. Ruta NUEVA
// /seguimiento/ambiente, fuera del catálogo (no toca permisos.js).
//
// CASCARÓN: lectura (leerProgramaObra/preparacionEstimacion.avance) + enlaces a las rutas reales. Los % de
// avance salen de la MISMA fuente que la curva canónica (prep.avance de estimacion-prep), para no mostrar un
// número distinto a HU-05. /seguimiento/alertas (HU-07) SÍ preselecciona contrato vía ?contrato=.
//
// Roles: contratista/residente/supervisión (ejecutores + supervisión). El rol 'superintendente' NO existe en
// permisos.js (los 5 roles son residente/contratista/supervision/dependencia/finanzas; el superintendente ES
// el contratista). DECISIÓN DEL EQUIPO (confirmada): la DEPENDENCIA NO registra avance físico — solo consulta
// la curva (HU-05, nivel 'C'); el registro de avance (HU-06) lo capturan residente/contratista/supervisión.
// Está enforced en el backend: el router de trabajos exige `requireRole('contratista')` para POST/PATCH/DELETE
// y HU-06 es `null` para dependencia en permisos.js, así que la dependencia queda fuera de este envolvente.
// La evidencia fotográfica por periodo no existe todavía (HU-06 no sube fotos) → bloque 5 = placeholder E2.

function Bloque({ n, titulo, estado = 'activo', placeholder = false, children }) {
  const color = placeholder ? 'border-amber-300' : estado === 'listo' ? 'border-sigecop-green-validation' : 'border-borde';
  return (
    <section className={`bg-white border ${color} rounded-lg overflow-hidden`} data-testid={`bloque-avance-${n}`}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${placeholder ? 'bg-amber-100 text-amber-800' : 'bg-guinda-soft text-guinda'}`}>{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {placeholder && <span className="ml-auto text-[11px] uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded" data-testid={`placeholder-avance-${n}`}>Pendiente · Equipo 2</span>}
        {estado === 'listo' && !placeholder && <span className="ml-auto text-[11px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">✓ Listo</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const soloFecha = (s) => (s ? String(s).slice(0, 10) : '');

export default function AmbienteAvance() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [avance, setAvance] = useState(null);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setPeriodos([]); setAvance(null);
    if (!id) return;
    let pers = [];
    try {
      const pr = await api.leerProgramaObra(id);
      pers = Array.isArray(pr?.periodos) ? pr.periodos : [];
      setPeriodos(pers);
    } catch (_) { /* informativo */ }
    // KPIs de avance: MISMA fuente que la curva (prep.avance). Se toma el último periodo del programa.
    try {
      const finUltimo = pers.length ? soloFecha(pers[pers.length - 1].fin) : '';
      const prep = await api.preparacionEstimacion(id, finUltimo);
      setAvance(prep?.avance || null);
    } catch (e) {
      if (e.status === 403) showToast('No tienes acceso a este contrato');
    }
  }, [showToast]);

  const av = avance || {};
  const q = contratoId ? `?contrato=${contratoId}` : '';

  return (
    <div className="space-y-4">
      <HeaderVista
        huId="HU-06"
        titulo="Ambiente de avance físico y seguimiento"
        sprint="Sprint 7"
        rolAcademico="Contratista / Residencia"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Seguimiento' }, { label: 'Ambiente' }]}
      />

      {/* FRENTE 2 / NAV-G — barra de pestañas del ciclo (incluye el chip "Ciclo · HU 05–07"). */}
      <PestanasCiclo ciclo="avance" activo="ambiente" />

      <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-r-md text-sm text-slate-700" data-testid="ambiente-avance-aviso">
        <strong>Avance físico y seguimiento.</strong> La acción del flujo es <strong>registrar el avance</strong>
        (HU-06); la <strong>curva (HU-05)</strong> y los <strong>atrasos (HU-07)</strong> van <strong>en
        paralelo</strong> (lectura, siempre accesibles). Cada bloque enlaza a su pantalla real; el ambiente
        muestra los KPIs que ya calcula el sistema (misma fuente que la curva).
      </div>

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Inicia sesión para recorrer el avance de un contrato.
        </div>
      )}

      {/* BLOQUE 1 — Contrato + periodos del programa. */}
      <Bloque n={1} titulo="Contrato y programa" estado={contratoId ? 'listo' : 'activo'}>
        {/* 3A · P3 — hereda el contrato activo global en vez de re-seleccionarlo */}
        <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />
        {contratoId && <p className="mt-2 text-sm text-slate-600" data-testid="programa-periodos"><strong>{periodos.length}</strong> periodo(s) en el programa de obra.</p>}
      </Bloque>

      {/* BLOQUE 2 — Registrar avance (HU-06). */}
      <Bloque n={2} titulo="Registrar el avance ejecutado (HU-06)">
        <p className="text-sm text-slate-700 mb-3">El contratista registra los trabajos terminados por concepto y periodo; el acumulado no puede exceder lo contratado (art. 118 RLOPSRM).</p>
        <LinkHU hu="HU-06" to={`/seguimiento/trabajos-terminados${q}`} className="sg-btn-primary" data-testid="link-trabajos" actor="Lo registra el Contratista">
          Registrar avance (HU-06) →
        </LinkHU>
      </Bloque>

      {/* EN PARALELO (lectura): curva (HU-05) y atrasos (HU-07) — no encadenadas al registro. */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-tinta-sec pt-2">En paralelo (lectura, no se bloquean)</h3>

      {/* BLOQUE 3 — Curva y desviación (HU-05), KPIs de la misma fuente. */}
      <Bloque n={3} titulo="Curva de avance y desviación (HU-05)" estado={avance ? 'listo' : 'activo'}>
        {avance && (
          <div className="grid grid-cols-3 gap-3 text-sm mb-3" data-testid="kpis-avance">
            <div><div className="text-xs text-slate-500">Físico</div><div className="font-semibold">{av.fisico_pct == null ? '—' : `${av.fisico_pct}%`}</div></div>
            <div><div className="text-xs text-slate-500">Programado</div><div className="font-semibold">{av.planeado_pct == null ? '—' : `${av.planeado_pct}%`}</div></div>
            <div><div className="text-xs text-slate-500">Financiero</div><div className="font-semibold">{av.financiero_pct == null ? '—' : `${av.financiero_pct}%`}</div></div>
          </div>
        )}
        <p className="text-xs text-slate-500 mb-3">Los % salen de la misma fuente que la curva (no se recalculan aquí).</p>
        <LinkHU hu="HU-05" to={`/seguimiento/curva-avance${q}`} className="sg-btn-secondary" data-testid="link-curva" actor="No disponible para tu rol">
          Ver la curva de avance (HU-05) →
        </LinkHU>
      </Bloque>

      {/* BLOQUE 4 — Atrasos + asiento (HU-07, preselecciona contrato). */}
      <Bloque n={4} titulo="Atrasos y alertas (HU-07)">
        <p className="text-sm text-slate-700 mb-3">El sistema deriva el déficit por concepto (programado al periodo vigente − ejecutado) y permite asentarlo en la bitácora. Esta pantalla sí <strong>preselecciona el contrato</strong>.</p>
        <LinkHU hu="HU-07" to={`/seguimiento/alertas${q}`} className="sg-btn-secondary" data-testid="link-alertas" actor="Los atrasos los ve Residencia o Supervisión">
          Ver atrasos del contrato (HU-07) →
        </LinkHU>
      </Bloque>

      {/* BLOQUE 5 — Evidencia fotográfica: FUERA DE ALCANCE de la Etapa 1 (FASE 5, decisión de alcance). */}
      <Bloque n={5} titulo="Evidencia fotográfica por periodo">
        <p className="text-sm text-slate-700">
          El registro fotográfico del avance por periodo es <strong>opcional</strong>:
          la ley no lo exige como requisito (el avance se sustenta con los números ejecutados por concepto y la
          nota de bitácora). El acumulado contra lo contratado (art. 118 RLOPSRM) es el control vigente.
        </p>
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mt-3" data-testid="evidencia-placeholder">
          El registro fotográfico de evidencias por periodo no está disponible en esta versión del sistema.
        </p>
      </Bloque>
    </div>
  );
}
