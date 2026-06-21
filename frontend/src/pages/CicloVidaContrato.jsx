import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';

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
// Criterio del equipo (default conservador): agrupar en un índice ORDENA por ciclo de vida sin fundir las HU
// (cada bloque es un Link a la ruta real; si se borra, todo sigue intacto).

// Bloques del ciclo de vida. `roles` = quién puede abrir el destino (su SoloRol, o dónde la HU no es null).
// Se enlaza a los SUB-AMBIENTES donde existen (para no duplicar): bitácora, seguimiento, convenios,
// estimación, expediente, cierre.
const BLOQUES = [
  { n: 2,  titulo: 'Alta del contrato (HU-01)',                 route: '/contratos/alta',                 roles: ['residente', 'contratista', 'supervision', 'dependencia'], desc: 'Captura del contrato: catálogo, programa, garantías, jurídicos, PDF firmado.' },
  // NAV-A: HU-08 NO es accesible para la dependencia (permisos.js HU-08 dependencia=null). Si se le ofreciera
  // el enlace, WithLayout la rebotaría a Inicio (dead-end mudo). El array `roles` se alinea con la HU subyacente.
  { n: 3,  titulo: 'Apertura de la bitácora (HU-08)',           route: '/bitacora/apertura',              roles: ['residente', 'contratista', 'supervision'], desc: 'Se abre la bitácora; el sistema genera la nota de apertura #1.' },
  { n: 4,  titulo: 'Bitácora en operación (HU-09/10 + firma)',  route: '/bitacora/ambiente',              roles: ['residente', 'contratista', 'supervision'], desc: 'Firma conjunta, emisión y consulta de notas.', sub: true },
  { n: 5,  titulo: 'Ejecución y seguimiento (HU-06/07/05)',     route: '/seguimiento/ambiente',           roles: ['contratista', 'residente', 'supervision'], desc: 'Avance, curva y atrasos.', sub: true },
  { n: 6,  titulo: 'Convenios modificatorios (HU-03, si aplica)', route: '/contratos/convenio-ambiente',  roles: ['dependencia', 'residente', 'contratista', 'supervision'], desc: 'Cuando cambia monto, plazo o alcance.', sub: true },
  { n: 7,  titulo: 'Integración de la estimación (HU-12)',      route: '/estimaciones/ambiente',          roles: ['contratista', 'residente', 'supervision'], desc: 'Arma la estimación paso a paso (carátula automática).', sub: true },
  { n: 8,  titulo: 'Presentación de la estimación (HU-13)',     route: '/estimaciones/envio',             roles: ['residente', 'contratista', 'supervision'], desc: 'El contratista presenta la estimación (art. 54).' },
  { n: 9,  titulo: 'Revisión y autorización (HU-15)',           route: '/estimaciones/revision',          roles: ['residente', 'supervision', 'dependencia'], desc: 'Supervisión observa/turna; la residencia autoriza o rechaza.' },
  { n: 10, titulo: 'Reingreso tras rechazo (HU-16, si aplica)', route: '/estimaciones/reingreso',         roles: ['residente', 'contratista'], desc: 'Una estimación rechazada se reingresa como nueva versión.' },
  // n: 11 (pago) se renderiza aparte como bloque informativo + enlace gateado al ambiente de pago.
  { n: 12, titulo: 'Coordinación: historial, tablero y portafolio (HU-14/17/18)', route: '/estimaciones/tablero', roles: ['residente', 'contratista', 'supervision', 'dependencia'], desc: 'Vista agregada del estado de las estimaciones y la cartera.' },
  { n: 13, titulo: 'Expediente integral (HU-04)',               route: '/contratos/expediente-ambiente',  roles: ['residente', 'contratista', 'supervision', 'dependencia'], desc: 'Arma el expediente y exporta el paquete.', sub: true },
  { n: 14, titulo: 'Finiquito y cierre (HU-24)',                route: '/contratos/cierre',               roles: ['dependencia', 'residente'], desc: 'Cierre del contrato paso a paso (delega en el finiquito).', sub: true },
];

// FIX 2.3 — progreso REAL por bloque, DERIVADO en el cliente de las fuentes de lectura ya existentes (sin
// backend nuevo). Defensivo: cualquier fuente que falte/llegue rara cae a 'pendiente' (nunca rompe el render).
// Estados de estimación verificados (chk_estimaciones_estado): integrada, enviada, autorizada, rechazada, pagada.
const BADGE = {
  hecho: { txt: 'Hecho', cls: 'bg-emerald-100 text-emerald-700' },
  en_curso: { txt: 'En curso', cls: 'bg-amber-100 text-amber-700' },
  pendiente: { txt: 'Pendiente', cls: 'bg-slate-100 text-slate-500' },
};
function derivarProgreso(c, d) {
  if (!d) return {};
  const ests = Array.isArray(d.estimaciones) ? d.estimaciones : [];
  const algun = (...sts) => ests.some((e) => sts.includes(e.estado));
  const notas = d.notas && Array.isArray(d.notas.notas) ? d.notas.notas : (Array.isArray(d.notas) ? d.notas : null);
  const nNotas = notas ? notas.length : 0;
  const hayBitacora = notas != null;             // notasDeContrato da 404 (→null) si no hay bitácora
  const convs = d.convenios && Array.isArray(d.convenios.convenios) ? d.convenios.convenios : (Array.isArray(d.convenios) ? d.convenios : []);
  const pagos = Array.isArray(d.pagos) ? d.pagos : [];
  const cerrado = c && c.estado === 'cerrado';
  const todasPagadas = ests.length > 0 && ests.filter((e) => e.estado !== 'rechazada').every((e) => e.estado === 'pagada');
  return {
    2: 'hecho',                                                                  // el contrato ya existe
    3: !hayBitacora ? 'pendiente' : (nNotas >= 1 ? 'hecho' : 'en_curso'),        // apertura de bitácora
    4: !hayBitacora ? 'pendiente' : (nNotas >= 2 ? 'hecho' : (nNotas === 1 ? 'en_curso' : 'pendiente')), // operación
    5: ests.length > 0 ? (cerrado || todasPagadas ? 'hecho' : 'en_curso') : (d.programa ? 'pendiente' : 'pendiente'), // seguimiento
    6: convs.length > 0 ? 'hecho' : 'pendiente',                                 // convenios (opcional)
    7: ests.length === 0 ? 'pendiente' : (algun('enviada', 'autorizada', 'pagada', 'rechazada') ? 'hecho' : 'en_curso'), // integración
    8: algun('enviada', 'autorizada', 'pagada') ? 'hecho' : (algun('integrada') ? 'en_curso' : 'pendiente'),            // presentación
    9: algun('autorizada', 'pagada') ? 'hecho' : (algun('enviada') ? 'en_curso' : 'pendiente'),                        // revisión/autorización
    10: ests.some((e) => e.reemplaza_a != null) ? 'hecho' : (algun('rechazada') ? 'en_curso' : 'pendiente'),           // reingreso
    11: pagos.length > 0 ? 'hecho' : (algun('autorizada') ? 'en_curso' : 'pendiente'),                                 // pago
    12: ests.length > 0 ? 'hecho' : 'pendiente',                                 // coordinación/tablero
    13: 'hecho',                                                                  // expediente (el contrato está dado de alta)
    14: cerrado ? 'hecho' : (todasPagadas ? 'en_curso' : 'pendiente'),           // finiquito
  };
}

function BloqueCV({ n, titulo, desc, route, accesible, sub, q, estado }) {
  return (
    <section className={`bg-white border ${accesible ? 'border-borde' : 'border-slate-200'} rounded-lg overflow-hidden`} data-testid={`bloque-cv-${n}`}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-guinda-soft text-guinda">{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {sub && <span className="text-[10px] uppercase tracking-wider bg-sigecop-blue-light text-sigecop-blue px-2 py-0.5 rounded">ambiente</span>}
        {estado && <span className={`ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${BADGE[estado].cls}`} data-testid={`progreso-cv-${n}`}>{BADGE[estado].txt}</span>}
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
  const [datos, setDatos] = useState(null); // FIX 2.3 — fuentes para derivar el progreso por bloque

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setDetalle(null); setDatos(null);
    if (!id) return;
    let det;
    try { det = await api.detalleContrato(id); setDetalle(det); }
    catch (e) { showToast(e.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudo cargar el contrato'); return; }
    // FIX 2.3 — fuentes de lectura ya existentes; cada una degrada a null sin tumbar el batch (p. ej. notas
    // da 404 si no hay bitácora). El progreso se DERIVA de aquí (semáforo por bloque), no hay backend nuevo.
    const safe = (p) => p.then((r) => r).catch(() => null);
    const [programa, estimaciones, notas, pagos, convenios] = await Promise.all([
      safe(api.leerProgramaObra(id)),
      safe(api.historialEstimaciones(id)),
      safe(api.notasDeContrato(id)),
      safe(api.listarPagos(id)),
      safe(api.convenios(id)),
    ]);
    setDatos({ programa, estimaciones, notas, pagos, convenios });
  }, [showToast]);

  const c = detalle?.contrato || detalle || {};
  const q = contratoId ? `?contrato=${contratoId}` : '';
  const puedePago = ['contratista', 'residente', 'dependencia'].includes(rol); // /pagos/ambiente (supervisión fuera)
  const prog = useMemo(() => (detalle ? derivarProgreso(c, datos) : {}), [detalle, datos, c]);

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Contrato' }, { label: 'Ciclo de vida' }]} />
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-medium text-tinta">Ciclo de vida del contrato</h1>
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
          {/* 3A · P3 — hereda el contrato activo global (en vez de re-seleccionarlo). */}
          <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />
          {detalle && <p className="mt-2 text-sm text-slate-600" data-testid="contrato-ancla">{c.folio} — {c.objeto}. El recorrido lleva este contrato a cada etapa.</p>}
        </div>
      </section>

      {/* BLOQUES 2-10 (antes del pago). */}
      {BLOQUES.filter((b) => b.n <= 10).map((b) => (
        <BloqueCV key={b.n} {...b} accesible={b.roles.includes(rol)} q={q} estado={prog[b.n]} />
      ))}

      {/* BLOQUE 11 — Registro de pago (HU-21): lo EJECUTA Finanzas (fuera de este recorrido) → informativo. */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="bloque-cv-11">
        <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-guinda-soft text-guinda">11</span>
          <h2 className="text-base font-medium text-tinta">Registro del pago (HU-21)</h2>
          {prog[11] && <span className={`ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${BADGE[prog[11]].cls}`} data-testid="progreso-cv-11">{BADGE[prog[11]].txt}</span>}
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
        <BloqueCV key={b.n} {...b} accesible={b.roles.includes(rol)} q={q} estado={prog[b.n]} />
      ))}
    </div>
  );
}
