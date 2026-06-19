import { useMemo, useState } from 'react';
import { fechaHora } from '../../utils/formato.js';

// Buscador de notas de bitácora reutilizable: filtros con lógica Y (AND) sobre
// datos REALES (GET /api/bitacora/contrato/:id/notas) + tabla con selección
// múltiple. Lo consume HU-10 (página de consulta) y lo reusará HU-12 (modal para
// vincular notas a la estimación) — por eso vive como componente compartido.
//
// El campo "Firmante" (etiqueta del profe) filtra sobre el EMISOR real de la nota
// (un emisor por nota, art. 125 RLOPSRM); el catálogo de Tipo lo provee el padre
// desde GET /api/bitacora/nota-tipos (no listas dummy).

// Normaliza texto para búsqueda case-insensitive y sin acentos, equivalente a
// PostgreSQL `ILIKE` con `unaccent`: "excavacion" matchea "Excavación". El rango
// ̀-ͯ cubre los "combining diacritical marks" que NFD deja separados.
export function normalizarTexto(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export const FILTROS_INICIALES = {
  tipo: 'Todos',
  fechaDesde: '',
  fechaHasta: '',
  firmante: 'Todos',
  vinculo: 'Todas', // 'Todas' | 'Vinculadas' | 'Sin vínculo'
  palabraClave: ''
};

const OPCIONES_VINCULO = ['Todas', 'Vinculadas', 'Sin vínculo'];

// Etiquetas legibles del estado de aceptación derivado por el backend.
export const ETIQUETA_ACEPTACION = {
  en_plazo: 'En plazo de firma',
  firmada: 'Firmada',
  aceptada_tacita: 'Aceptada (tácita)',
  respondida: 'Respondida',
  anulada: 'Anulada'
};

const CLASE_ACEPTACION = {
  en_plazo: 'bg-amber-100 text-amber-800',
  firmada: 'bg-green-100 text-sigecop-green-validation',
  aceptada_tacita: 'bg-green-100 text-sigecop-green-validation',
  respondida: 'bg-sigecop-blue-light text-sigecop-blue',
  anulada: 'bg-slate-200 text-slate-600'
};

// soloFecha (yyyy-mm-dd) se usa para COMPARAR contra los inputs type=date del filtro por rango.
const soloFecha = (f) => (f || '').slice(0, 10);
// Pase 2.2: para MOSTRAR la fecha de una nota se incluye la HORA (columna TIMESTAMPTZ). Mismo
// formato es-MX que la bitácora (EmisionNotas). NO usar en el filtro (rompería el rango por fecha).
// fechaHora: utilidad compartida (utils/formato.js)

// Hook con el estado de los filtros y los resultados derivados (AND). Lo usan tanto
// la página (HU-10) como el modal (HU-12); cada uno aporta su propio `notas` ya
// cargado del backend y, opcionalmente, `excluirIds` (HU-12 oculta lo ya vinculado).
export function useFiltrosNotas(notas, { excluirIds, filtrosIniciales } = {}) {
  const base = filtrosIniciales ?? FILTROS_INICIALES;
  const [filtros, setFiltros] = useState(base);

  const setFiltro = (k) => (e) => setFiltros((prev) => ({ ...prev, [k]: e.target.value }));
  const limpiar = () => setFiltros(base);

  const firmantesUnicos = useMemo(() => {
    const set = new Set(notas.map((n) => n.emisor_nombre).filter(Boolean));
    return ['Todos', ...Array.from(set).sort()];
  }, [notas]);

  const numeroPorId = useMemo(() => {
    const m = new Map();
    notas.forEach((n) => m.set(n.id, n.numero));
    return m;
  }, [notas]);

  const resultados = useMemo(() => {
    const palabra = normalizarTexto(filtros.palabraClave);
    return notas.filter((n) => {
      if (excluirIds && excluirIds.has(n.id)) return false;
      if (filtros.tipo !== 'Todos' && n.tipo !== filtros.tipo) return false;
      const fecha = soloFecha(n.fecha);
      if (filtros.fechaDesde && fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && fecha > filtros.fechaHasta) return false;
      if (filtros.firmante !== 'Todos' && n.emisor_nombre !== filtros.firmante) return false;
      if (filtros.vinculo === 'Vinculadas' && !n.vinculada_a) return false;
      if (filtros.vinculo === 'Sin vínculo' && n.vinculada_a) return false;
      if (palabra) {
        // Incluye el TAG estructurado y la etiqueta del tipo (lo pidió el profe: búsqueda
        // eficiente sin tener que leer el texto embebido).
        const haystack = normalizarTexto(`${n.asunto || ''} ${n.contenido || ''} ${n.tag || ''} ${n.tipo_etiqueta || ''}`);
        if (!haystack.includes(palabra)) return false;
      }
      return true;
    });
  }, [notas, filtros, excluirIds]);

  return { filtros, setFiltro, limpiar, resultados, firmantesUnicos, numeroPorId };
}

// Presentacional: formulario de filtros + tabla de resultados con selección. La
// selección la posee el padre (la página la usa para exportar; el modal, para
// confirmar el vínculo), así que entra por props (`seleccionadas`, `onToggle`,
// `onToggleTodas`). `idPrefix` evita colisión de data-testid si hay dos instancias.
export default function BuscadorNotas({
  filtros,
  setFiltro,
  onLimpiar,
  tipos = [],
  firmantesUnicos = ['Todos'],
  resultados = [],
  numeroPorId,
  seleccionadas,
  onToggle,
  onToggleTodas,
  onVerDocumento,   // O8 (b): opcional; si se pasa, cada fila ofrece "📄 documento" (vista imprimible)
  idPrefix = ''
}) {
  const tid = (s) => `${idPrefix}${s}`;
  const todasSeleccionadas = resultados.length > 0 && resultados.every((n) => seleccionadas.has(n.id));

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Filtros de búsqueda
          </h2>
          <button type="button" className="sg-btn-secondary" onClick={onLimpiar} data-testid={tid('btn-limpiar')}>
            Limpiar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="sg-label">Tipo de nota</label>
            <select className="sg-input" value={filtros.tipo} onChange={setFiltro('tipo')} data-testid={tid('filtro-tipo')}>
              <option value="Todos">Todos</option>
              {tipos.map((t) => <option key={t.clave} value={t.clave}>{t.etiqueta}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Fecha desde</label>
            <input type="date" className="sg-input" value={filtros.fechaDesde} onChange={setFiltro('fechaDesde')} data-testid={tid('filtro-desde')} />
          </div>
          <div>
            <label className="sg-label">Fecha hasta</label>
            <input type="date" className="sg-input" value={filtros.fechaHasta} onChange={setFiltro('fechaHasta')} data-testid={tid('filtro-hasta')} />
          </div>
          <div>
            <label className="sg-label">Firmante</label>
            <select className="sg-input" value={filtros.firmante} onChange={setFiltro('firmante')} data-testid={tid('filtro-firmante')}>
              {firmantesUnicos.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Vínculo</label>
            <select className="sg-input" value={filtros.vinculo} onChange={setFiltro('vinculo')} data-testid={tid('filtro-vinculo')}>
              {OPCIONES_VINCULO.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Palabra clave</label>
            <input
              className="sg-input"
              placeholder="Busca en asunto, contenido, tag y tipo (sin acentos)"
              value={filtros.palabraClave}
              onChange={setFiltro('palabraClave')}
              data-testid={tid('filtro-palabra')}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Resultados (<span data-testid={tid('contador-resultados')}>{resultados.length}</span>)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid={tid('tabla-resultados')}>
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={todasSeleccionadas}
                    onChange={onToggleTodas}
                    aria-label="Seleccionar todas"
                  />
                </th>
                <th className="text-left p-3 font-semibold">Folio</th>
                <th className="text-left p-3 font-semibold">Tipo</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Firmante</th>
                <th className="text-left p-3 font-semibold">Vínculo</th>
                <th className="text-left p-3 font-semibold">Asunto</th>
                <th className="text-left p-3 font-semibold">Estado</th>
                {onVerDocumento && <th className="text-left p-3 font-semibold">Documento</th>}
              </tr>
            </thead>
            <tbody>
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan={onVerDocumento ? 9 : 8} className="p-8 text-center text-slate-400 italic">
                    Sin resultados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                resultados.map((n) => {
                  const numPadre = n.vinculada_a && numeroPorId ? numeroPorId.get(n.vinculada_a) : null;
                  return (
                    <tr key={n.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={seleccionadas.has(n.id)}
                          onChange={() => onToggle(n.id)}
                          aria-label={`Seleccionar nota ${n.numero}`}
                        />
                      </td>
                      <td className="p-3 font-mono text-xs">#{n.numero}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold rounded">
                          {n.tipo_etiqueta || n.tipo}
                        </span>
                        {n.tag && <span className="ml-1 inline-block px-2 py-0.5 bg-violet-100 text-violet-800 text-[11px] font-semibold rounded" data-testid={`tag-resultado-${n.numero}`}>#{n.tag}</span>}
                      </td>
                      <td className="p-3" data-testid={`bn-fecha-${n.numero}`}>{fechaHora(n.fecha)}</td>
                      <td className="p-3">{n.emisor_nombre || '—'}</td>
                      <td className="p-3 text-xs">
                        {/* FIX 2.1 — además del vínculo nota→nota, muestra si la nota respalda minuta/visita/avance. */}
                        <div className="flex flex-wrap items-center gap-1">
                          {n.vinculada_a && (
                            <span className="text-sigecop-blue">↪ {numPadre ? `#${numPadre}` : n.vinculada_a}</span>
                          )}
                          {n.tiene_minuta && <span className="inline-block px-1.5 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-semibold rounded" data-testid={`bn-minuta-${n.numero}`}>minuta</span>}
                          {n.tiene_visita && <span className="inline-block px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-semibold rounded" data-testid={`bn-visita-${n.numero}`}>visita</span>}
                          {n.tiene_avance && <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded" data-testid={`bn-avance-${n.numero}`}>avance</span>}
                          {!n.vinculada_a && !n.tiene_minuta && !n.tiene_visita && !n.tiene_avance && (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700">{n.asunto || '—'}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${CLASE_ACEPTACION[n.aceptacion] || 'bg-slate-100 text-slate-600'}`}>
                          {ETIQUETA_ACEPTACION[n.aceptacion] || n.aceptacion}
                        </span>
                      </td>
                      {onVerDocumento && (
                        <td className="p-3">
                          <button type="button" className="text-xs text-guinda font-semibold hover:underline whitespace-nowrap" onClick={() => onVerDocumento(n)} data-testid={tid(`btn-doc-${n.numero}`)}>
                            📄 Ver como documento
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
