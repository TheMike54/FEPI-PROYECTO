import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// MACRO — AMBIENTE DEL CICLO DE VIDA DEL CONTRATO (sesión grande 18-jun, BLOQUE B, AL FINAL) — el recorrido
// completo del contrato como ÍNDICE ORDENADO por ciclo de vida. ENLAZA todas las HU (y los sub-ambientes
// construidos en esta sesión) en orden, SIN fundirlas: cada bloque es un Link a la ruta real (no hay lógica
// de negocio aquí; monto/carátula/saldo/déficit los calcula el backend). Si se borra este ambiente, todas
// las HU y sub-ambientes siguen intactos.
//
// Ruta NUEVA /contratos/ciclo-vida, fuera del catálogo (no toca permisos.js). Roles:
// residente/contratista/supervisión/dependencia (Finanzas excluida: su única acción, el registro del pago,
// se muestra como bloque INFORMATIVO). Cada bloque se GATEA por los roles que realmente pueden abrir su
// destino (no se ofrece un enlace que rebota); donde no, se muestra como nota informativa.
// [validar profe: el orden del ciclo de vida y que agrupar en un índice NO funde las HU.]

// Bloques del ciclo de vida. `roles` = quién puede abrir el destino (su SoloRol, o dónde la HU no es null).
// Se enlaza a los SUB-AMBIENTES donde existen (para no duplicar): bitácora, seguimiento, convenios,
// estimación, expediente, cierre.
const BLOQUES = [
  { n: 2,  titulo: 'Alta del contrato (HU-01)',                 route: '/contratos/alta',                 roles: ['residente', 'contratista', 'supervision', 'dependencia'], desc: 'Captura del contrato: catálogo, programa, garantías, jurídicos, PDF firmado.' },
  { n: 3,  titulo: 'Apertura de la bitácora (HU-08)',           route: '/bitacora/apertura',              roles: ['residente', 'contratista', 'supervision', 'dependencia'], desc: 'Se abre la bitácora; el sistema genera la nota de apertura #1.' },
  { n: 4,  titulo: 'Bitácora en operación (HU-09/10 + firma)',  route: '/bitacora/ambiente',              roles: ['residente', 'contratista', 'supervision'], desc: 'Firma conjunta, emisión y consulta de notas — recorrido por bloques.', sub: true },
  { n: 5,  titulo: 'Ejecución y seguimiento (HU-06/07/05)',     route: '/seguimiento/ambiente',           roles: ['contratista', 'residente', 'supervision'], desc: 'Avance, curva y atrasos — recorrido por bloques.', sub: true },
  { n: 6,  titulo: 'Convenios modificatorios (HU-03, si aplica)', route: '/contratos/convenio-ambiente',  roles: ['dependencia', 'residente', 'contratista', 'supervision'], desc: 'Cuando cambia monto, plazo o alcance — recorrido por bloques.', sub: true },
  { n: 7,  titulo: 'Integración de la estimación (HU-12)',      route: '/estimaciones/ambiente',          roles: ['contratista', 'residente', 'supervision'], desc: 'Arma la estimación por bloques (carátula automática).', sub: true },
  { n: 8,  titulo: 'Presentación de la estimación (HU-13)',     route: '/estimaciones/envio',             roles: ['residente', 'contratista', 'supervision'], desc: 'El contratista presenta la estimación (art. 54).' },
  { n: 9,  titulo: 'Revisión y autorización (HU-15)',           route: '/estimaciones/revision',          roles: ['residente', 'supervision', 'dependencia'], desc: 'Supervisión observa/turna; la residencia autoriza o rechaza.' },
  { n: 10, titulo: 'Reingreso tras rechazo (HU-16, si aplica)', route: '/estimaciones/reingreso',         roles: ['residente', 'contratista'], desc: 'Una estimación rechazada se reingresa como nueva versión.' },
  // n: 11 (pago) se renderiza aparte como bloque informativo + enlace gateado al ambiente de pago.
  { n: 12, titulo: 'Coordinación: historial, tablero y portafolio (HU-14/17/18)', route: '/estimaciones/tablero', roles: ['residente', 'contratista', 'supervision', 'dependencia'], desc: 'Vista agregada del estado de las estimaciones y la cartera.' },
  { n: 13, titulo: 'Expediente integral (HU-04)',               route: '/contratos/expediente-ambiente',  roles: ['residente', 'contratista', 'supervision', 'dependencia'], desc: 'Arma el expediente y exporta el paquete — recorrido por bloques.', sub: true },
  { n: 14, titulo: 'Finiquito y cierre (HU-24)',                route: '/contratos/cierre',               roles: ['dependencia', 'residente'], desc: 'Cierre del contrato por bloques (delega en el finiquito).', sub: true },
];

function BloqueCV({ n, titulo, desc, route, accesible, sub, q }) {
  return (
    <section className={`bg-white border ${accesible ? 'border-borde' : 'border-slate-200'} rounded-lg overflow-hidden`} data-testid={`bloque-cv-${n}`}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-guinda-soft text-guinda">{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {sub && <span className="text-[10px] uppercase tracking-wider bg-sigecop-blue-light text-sigecop-blue px-2 py-0.5 rounded">ambiente</span>}
      </div>
      <div className="p-5">
        <p className="text-sm text-slate-700 mb-3">{desc}</p>
        {accesible ? (
          <Link to={`${route}${q}`} className="sg-btn-secondary" data-testid={`link-cv-${n}`}>Ir →</Link>
        ) : (
          <p className="text-xs text-slate-500" data-testid={`info-cv-${n}`}>No disponible para tu rol en este paso.</p>
        )}
      </div>
    </section>
  );
}

export default function CicloVidaContrato() {
  const { token, rol } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setDetalle(null);
    if (!id) return;
    try { setDetalle(await api.detalleContrato(id)); }
    catch (e) { showToast(e.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudo cargar el contrato'); }
  }, [showToast]);

  const c = detalle?.contrato || detalle || {};
  const q = contratoId ? `?contrato=${contratoId}` : '';
  const puedePago = ['contratista', 'residente', 'dependencia'].includes(rol); // /pagos/ambiente (supervisión fuera)

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Contrato' }, { label: 'Ciclo de vida' }]} />
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-medium text-tinta">Ciclo de vida del contrato (recorrido por bloques)</h1>
      </div>

      <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-r-md text-sm text-slate-700" data-testid="ciclo-vida-aviso">
        <strong>El contrato de principio a fin, en orden.</strong> Cada bloque es un <strong>enlace a la
        pantalla o al ambiente real</strong> de su etapa; este índice solo los ordena por ciclo de vida. No
        reemplaza ninguna vista: si se quita, todas las HU siguen funcionando.
      </div>

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Inicia sesión para recorrer el ciclo de vida de un contrato.
        </div>
      )}

      {/* BLOQUE 1 — Selección del contrato (ancla, pasa ?contrato=ID a los demás). */}
      <section className="bg-white border border-borde rounded-lg overflow-hidden" data-testid="bloque-cv-1">
        <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-guinda-soft text-guinda">1</span>
          <h2 className="text-base font-medium text-tinta">Selección del contrato</h2>
        </div>
        <div className="p-5">
          <div className="max-w-2xl">
            <label className="sg-label">Contrato</label>
            <select className="sg-input" value={contratoId} onChange={(e) => seleccionarContrato(e.target.value)} disabled={sinSesion} data-testid="select-contrato">
              <option value="">— Selecciona un contrato —</option>
              {contratos.map((ct) => <option key={ct.id} value={ct.id}>{ct.folio} · {ct.objeto}</option>)}
            </select>
          </div>
          {detalle && <p className="mt-2 text-sm text-slate-600" data-testid="contrato-ancla">{c.folio} — {c.objeto}. El recorrido lleva este contrato a cada etapa.</p>}
        </div>
      </section>

      {/* BLOQUES 2-10 (antes del pago). */}
      {BLOQUES.filter((b) => b.n <= 10).map((b) => (
        <BloqueCV key={b.n} {...b} accesible={b.roles.includes(rol)} q={q} />
      ))}

      {/* BLOQUE 11 — Registro de pago (HU-21): lo EJECUTA Finanzas (fuera de este recorrido) → informativo. */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="bloque-cv-11">
        <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-guinda-soft text-guinda">11</span>
          <h2 className="text-base font-medium text-tinta">Registro del pago (HU-21)</h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-700 mb-3">El pago de la estimación autorizada lo <strong>registra Finanzas</strong> (importe = neto, art. 54). Aquí se muestra como referencia del ciclo.</p>
          {puedePago ? (
            <Link to={`/pagos/ambiente${q}`} className="sg-btn-secondary" data-testid="link-cv-11">Ver el ciclo de pago (ambiente) →</Link>
          ) : (
            <p className="text-xs text-slate-500" data-testid="info-cv-11">Lo registra Finanzas; no está disponible para tu rol.</p>
          )}
        </div>
      </section>

      {/* BLOQUES 12-14 (coordinación, expediente, finiquito). */}
      {BLOQUES.filter((b) => b.n >= 12).map((b) => (
        <BloqueCV key={b.n} {...b} accesible={b.roles.includes(rol)} q={q} />
      ))}
    </div>
  );
}
