import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { monedaMXN as moneda } from '../utils/formato.js';

// AMBIENTE DE EXPEDIENTE Y REPORTES / cierre documental (sesión grande 18-jun, BLOQUE B) — ciclo faltante
// detectado por el crítico de completitud (§4 del plan): "arma el expediente y exporta el paquete del
// contrato de inicio a fin". ENCADENA HU-04 (expediente consolidado) + HU-19 (exportación de reportes) SIN
// fundirlas.
//
// CASCARÓN: navegación + lectura read-only (detalleContrato/historialEstimaciones, que el backend YA
// calcula). Cada bloque enlaza a la RUTA REAL de su HU; NO reescribe lógica ni duplica nada. Ruta NUEVA
// /contratos/expediente-ambiente, fuera del catálogo de HU (no toca permisos.js).
// Roles: residente/contratista/supervisión/dependencia (los que ven expediente Y reportes). Finanzas queda
// fuera (solo tiene reportes; usa /reportes directo) para no ofrecer un enlace de expediente que rebota.

function Bloque({ n, titulo, estado = 'activo', children }) {
  const color = estado === 'listo' ? 'border-sigecop-green-validation' : 'border-borde';
  return (
    <section className={`bg-white border ${color} rounded-lg overflow-hidden`} data-testid={`bloque-exp-${n}`}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-guinda-soft text-guinda">{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {estado === 'listo' && <span className="ml-auto text-[11px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">✓ Listo</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AmbienteExpediente() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [numEstimaciones, setNumEstimaciones] = useState(null);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setDetalle(null); setNumEstimaciones(null);
    if (!id) return;
    try {
      const d = await api.detalleContrato(id);
      setDetalle(d);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudo cargar el contrato');
    }
    // Resumen read-only de estimaciones (si el endpoint del historial responde; es informativo).
    try {
      const h = await api.historialEstimaciones(id);
      const arr = Array.isArray(h) ? h : (Array.isArray(h?.estimaciones) ? h.estimaciones : []);
      setNumEstimaciones(arr.length);
    } catch (_) { /* informativo; si falla, se omite */ }
  }, [showToast]);

  const c = detalle?.contrato || detalle || {};
  const q = contratoId ? `?contrato=${contratoId}` : '';

  return (
    <div className="space-y-4">
      <HeaderVista
        huId="HU-04"
        titulo="Ambiente de expediente y reportes (cierre documental, por bloques)"
        sprint="Sprint 8"
        rolAcademico="Residente"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Expediente' }, { label: 'Ambiente' }]}
      />

      <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-r-md text-sm text-slate-700" data-testid="ambiente-expediente-aviso">
        <strong>Arma el expediente y exporta el paquete del contrato.</strong> Encadena el expediente
        consolidado (HU-04) y la exportación de reportes (HU-19); cada bloque <strong>enlaza a su pantalla
        real</strong>. Este ambiente solo las recorre y muestra un resumen; no reemplaza ninguna vista.
      </div>

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Inicia sesión para armar el expediente de un contrato.
        </div>
      )}

      {/* BLOQUE 1 — Contrato + resumen read-only. */}
      <Bloque n={1} titulo="Contrato y resumen" estado={detalle ? 'listo' : 'activo'}>
        <div className="max-w-2xl">
          <label className="sg-label">Contrato</label>
          <select className="sg-input" value={contratoId} onChange={(e) => seleccionarContrato(e.target.value)} disabled={sinSesion} data-testid="select-contrato">
            <option value="">— Selecciona un contrato —</option>
            {contratos.map((ct) => <option key={ct.id} value={ct.id}>{ct.folio} · {ct.objeto}</option>)}
          </select>
        </div>
        {detalle && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm" data-testid="resumen-contrato">
            <div><div className="text-xs text-slate-500">Folio</div><div className="font-semibold">{c.folio || '—'}</div></div>
            <div><div className="text-xs text-slate-500">Monto</div><div className="font-semibold">{c.monto != null ? moneda(c.monto) : '—'}</div></div>
            <div><div className="text-xs text-slate-500">Estado</div><div className="font-semibold">{c.estado || 'vigente'}</div></div>
            <div><div className="text-xs text-slate-500">Estimaciones</div><div className="font-semibold">{numEstimaciones == null ? '—' : numEstimaciones}</div></div>
          </div>
        )}
        <p className="text-xs text-slate-500 mt-2">El resumen lo calcula el sistema; el detalle completo vive en las pantallas enlazadas abajo.</p>
      </Bloque>

      {/* BLOQUE 2 — Expediente consolidado (HU-04). */}
      <Bloque n={2} titulo="Revisar el expediente consolidado (HU-04)">
        <p className="text-sm text-slate-700 mb-3">
          El expediente reúne, en un solo documento imprimible, los bloques del contrato: catálogo, programa,
          garantías, jurídicos, roster, convenios, estimaciones y bitácora. Desde su pantalla se exporta como
          un <strong>PDF único</strong>.
        </p>
        <Link to={`/contratos/expediente${q}`} className={`sg-btn-primary ${detalle ? '' : 'pointer-events-none opacity-50'}`} data-testid="link-expediente">
          Abrir el expediente (HU-04) →
        </Link>
      </Bloque>

      {/* BLOQUE 3 — Exportar reportes (HU-19). */}
      <Bloque n={3} titulo="Exportar los reportes del contrato (HU-19)">
        <p className="text-sm text-slate-700 mb-3">
          Exportación de los reportes del contrato (carátula de estimación, generadores, avance, etc.) en
          PDF/Excel. Cierra el paquete documental del contrato.
        </p>
        <Link to={`/reportes${q}`} className={`sg-btn-secondary ${detalle ? '' : 'pointer-events-none opacity-50'}`} data-testid="link-reportes">
          Exportar reportes (HU-19) →
        </Link>
        <p className="text-xs text-slate-500 mt-3">Los <strong>números generadores</strong> de la estimación son el único reporte pendiente del Equipo 3; el resto exporta hoy.</p>
      </Bloque>
    </div>
  );
}
