import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import LinkHU from '../components/LinkHU.jsx';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// AMBIENTE DE CONVENIO MODIFICATORIO (sesión grande 18-jun, BLOQUE B) — ciclo EPISÓDICO (no siempre ocurre).
// Cascarón que ENVUELVE HU-03 (convenio) + su oficio (FASE 0C) + el reflejo en bitácora/expediente SIN
// fundir las HU. Ruta NUEVA /contratos/convenio-ambiente, fuera del catálogo (no toca permisos.js).
//
// CASCARÓN: lectura (detalleContrato/convenios/leerProgramaObra) + enlaces a las rutas reales. No recalcula
// nada (las marcas SFP/ajuste de costos las pone el backend). NOTA: /bitacora/consulta (HU-10) y
// /contratos/expediente (HU-04) NO preseleccionan contrato vía ?contrato= → el copy pide "elige el
// contrato". HU-03 (/contratos/modificatorios) SÍ lee ?contrato=.
// Umbral del 25% (CRITERIO DEL EQUIPO, parametrizable): un convenio que rebasa el 25% del monto/plazo
// original MARCA un AVISO (no bloquea — el backend lo registra con `aviso_variacion`), referido al art. 59
// LOPSRM (modificación de contratos); el % en sí es referencia administrativa de revisión (RLOPSRM art.
// 102). El convenio sembrado (+14.2% de plazo) queda por debajo → requiere_revision_sfp=false (sin aviso).
//
// Header sin HeaderVista (evita el aviso "solo lectura" de HU-03 para los roles 'C': es un ambiente de
// navegación, no la pantalla de captura).

function Bloque({ n, titulo, estado = 'activo', children }) {
  const color = estado === 'listo' ? 'border-sigecop-green-validation' : 'border-borde';
  return (
    <section className={`bg-white border ${color} rounded-lg overflow-hidden`} data-testid={`bloque-conv-${n}`}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-guinda-soft text-guinda">{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {estado === 'listo' && <span className="ml-auto text-[11px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">✓ Listo</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AmbienteConvenio() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [convenios, setConvenios] = useState([]);
  const [descargando, setDescargando] = useState(null);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setConvenios([]);
    if (!id) return;
    try {
      const c = await api.convenios(id); // OBJETO {convenios, versiones}
      setConvenios(Array.isArray(c?.convenios) ? c.convenios : []);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudieron cargar los convenios');
    }
  }, [showToast]);

  const verOficio = useCallback(async (convenioId) => {
    setDescargando(convenioId);
    try {
      const blob = await api.descargarOficioConvenio(convenioId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      showToast(e.message || 'No se pudo abrir el oficio');
    } finally { setDescargando(null); }
  }, [showToast]);

  const q = contratoId ? `?contrato=${contratoId}` : '';
  const ultimo = convenios[0] || null;

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Contrato' }, { label: 'Convenio modificatorio' }]} />
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-medium text-tinta">Ambiente de convenio modificatorio</h1>
      </div>

      {/* FRENTE 2 / NAV-G — barra de pestañas del ciclo (incluye el chip "Ciclo · HU-03"). */}
      <PestanasCiclo ciclo="convenio" activo="ambiente" />

      <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-r-md text-sm text-slate-700" data-testid="ambiente-convenio-aviso">
        <strong>Ciclo del convenio modificatorio</strong> (cuando aplica): registrar el convenio → sus
        variaciones y avisos → el oficio de aprobación → su asiento en la bitácora → su reflejo en el
        expediente. Cada bloque <strong>enlaza a su pantalla real</strong>; este ambiente solo encadena.
      </div>

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Inicia sesión para recorrer los convenios de un contrato.
        </div>
      )}

      {/* BLOQUE 1 — Contrato + estado vigente del convenio. */}
      <Bloque n={1} titulo="Contrato y convenios vigentes" estado={contratoId ? 'listo' : 'activo'}>
        {/* 3A · P3 — hereda el contrato activo global (banner read-only) en vez de re-seleccionarlo. */}
        <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />
        {contratoId && (
          <div className="mt-3 text-sm" data-testid="convenios-estado">
            {convenios.length === 0 ? (
              <p className="text-slate-500 italic">Este contrato no tiene convenios modificatorios (el ciclo es episódico: solo cuando cambia monto, plazo o alcance).</p>
            ) : (
              <p><strong>{convenios.length}</strong> convenio(s). Último: <strong>{ultimo?.folio || `#${ultimo?.numero}`}</strong> · tipo {ultimo?.tipo || '—'}.</p>
            )}
          </div>
        )}
      </Bloque>

      {/* BLOQUE 2 — Registrar convenio (HU-03, lee ?contrato=). */}
      <Bloque n={2} titulo="Registrar el convenio (HU-03)">
        <p className="text-sm text-slate-700 mb-3">El convenio (de plazo, monto o mixto) se registra en su pantalla, con su historial inmutable de versiones. Lo crea la dependencia (art. 59 LOPSRM).</p>
        <LinkHU hu="HU-03" to={`/contratos/modificatorios${q}`} className="sg-btn-primary" data-testid="link-convenio" actor="Lo registra la Dependencia o Residencia">
          Ir a convenios modificatorios (HU-03) →
        </LinkHU>
      </Bloque>

      {/* BLOQUE 3 — Variaciones y avisos (read-only, lo marca el backend). */}
      <Bloque n={3} titulo="Variaciones y avisos (lo calcula el sistema)">
        {!ultimo ? (
          <p className="text-sm text-slate-400 italic">Selecciona un contrato con convenios para ver las variaciones.</p>
        ) : (
          <div className="text-sm" data-testid="convenio-variaciones">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><div className="text-xs text-slate-500">Plazo</div><div className="font-semibold">{ultimo.plazo_anterior_dias ?? '—'} → {ultimo.plazo_nuevo_dias ?? '—'} días {ultimo.delta_plazo_pct != null && <span className="text-xs text-slate-500">({ultimo.delta_plazo_pct > 0 ? '+' : ''}{ultimo.delta_plazo_pct}%)</span>}</div></div>
              <div><div className="text-xs text-slate-500">Monto</div><div className="font-semibold">{ultimo.delta_monto_pct != null ? `${ultimo.delta_monto_pct > 0 ? '+' : ''}${ultimo.delta_monto_pct}%` : 'sin cambio'}</div></div>
              <div><div className="text-xs text-slate-500">Aviso SFP / 59 Bis</div><div className="font-semibold" data-testid="aviso-sfp">{ultimo.requiere_revision_sfp ? '⚠️ requiere revisión' : 'no aplica'}</div></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Superar el 25% de variación <strong>marca un aviso</strong> (no bloquea el convenio), referido al art. 59 LOPSRM; el umbral es parametrizable (criterio del equipo). El convenio no se recalcula aquí; solo se refleja lo que el backend determinó.</p>
          </div>
        )}
      </Bloque>

      {/* BLOQUE 4 — Oficio de aprobación (FASE 0C). */}
      <Bloque n={4} titulo="Oficio de aprobación del convenio">
        {!ultimo ? (
          <p className="text-sm text-slate-400 italic">Selecciona un contrato con convenios.</p>
        ) : (
          <div className="text-sm">
            {convenios.filter((c) => c.tiene_oficio).length === 0 ? (
              <p className="text-slate-500">Ningún convenio de este contrato tiene oficio cargado todavía.</p>
            ) : (
              <ul className="space-y-2" data-testid="oficios-convenio">
                {convenios.filter((c) => c.tiene_oficio).map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <span>{c.folio || `Convenio #${c.numero}`}</span>
                    <button type="button" className="sg-btn-secondary text-xs" disabled={descargando === c.id} onClick={() => verOficio(c.id)} data-testid={`ver-oficio-${c.id}`}>
                      {descargando === c.id ? 'Abriendo…' : '📎 Ver oficio'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Bloque>

      {/* BLOQUE 5 — Asiento automático en bitácora (informativo). */}
      <Bloque n={5} titulo="Asiento automático en la bitácora">
        <p className="text-sm text-slate-700 mb-3">
          Al registrar el convenio, el sistema asienta automáticamente su <strong>nota en la bitácora</strong>
          (art. 59 / art. 123 RLOPSRM), ligada al convenio. Consúltala en la bitácora <strong>eligiendo el
          contrato</strong> (esa pantalla no lo preselecciona).
        </p>
        <LinkHU hu="HU-10" to="/bitacora/consulta" className="sg-btn-secondary" data-testid="link-consulta" actor="La consultan Residencia, Contratista o Supervisión">
          Consultar la bitácora (HU-10) →
        </LinkHU>
      </Bloque>

      {/* BLOQUE 6 — Ver en el expediente (HU-04). */}
      <Bloque n={6} titulo="Ver el convenio en el expediente (HU-04)">
        <p className="text-sm text-slate-700 mb-3">
          El expediente del contrato muestra el convenio con su oficio y el enlace a las versiones del
          programa. Ábrelo y <strong>elige el contrato</strong> (no se preselecciona).
        </p>
        <LinkHU hu="HU-04" to="/contratos/expediente" className="sg-btn-secondary" data-testid="link-expediente" actor="No disponible para tu rol">
          Abrir el expediente (HU-04) →
        </LinkHU>
      </Bloque>
    </div>
  );
}
