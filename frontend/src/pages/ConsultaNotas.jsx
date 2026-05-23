import { useState, useMemo } from 'react';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import BadgeSprint from '../components/ui/BadgeSprint.jsx';
import CardCriterioAceptacion from '../components/ui/CardCriterioAceptacion.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { notasConsultaDummy, tiposNotaCatalogo, estatusNotaCatalogo } from '../data/dummy.js';

const FILTROS_INICIALES = {
  tipo: 'Todos',
  fechaDesde: '',
  fechaHasta: '',
  firmante: '',
  estatus: 'Todos',
  tema: ''
};

function EstatusBadge({ estatus }) {
  const colors = {
    'Firmada': 'bg-green-100 text-sigecop-green-validation',
    'Pendiente respuesta': 'bg-amber-100 text-sigecop-amber-attention',
    'Respondida': 'bg-sigecop-blue-light text-sigecop-blue'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[estatus] || 'bg-slate-200 text-slate-600'}`}>
      {estatus}
    </span>
  );
}

export default function ConsultaNotas() {
  const { showToast } = useToast();
  const [filtrosDraft, setFiltrosDraft] = useState(FILTROS_INICIALES);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIALES);
  const [seleccionadas, setSeleccionadas] = useState(new Set());

  const setDraft = (k) => (e) => setFiltrosDraft({ ...filtrosDraft, [k]: e.target.value });

  const aplicarFiltros = (e) => {
    e?.preventDefault?.();
    setFiltrosAplicados(filtrosDraft);
    setSeleccionadas(new Set());
  };

  const limpiarFiltros = () => {
    setFiltrosDraft(FILTROS_INICIALES);
    setFiltrosAplicados(FILTROS_INICIALES);
    setSeleccionadas(new Set());
  };

  const resultados = useMemo(() => {
    return notasConsultaDummy.filter((n) => {
      if (filtrosAplicados.tipo !== 'Todos' && n.tipo !== filtrosAplicados.tipo) return false;
      if (filtrosAplicados.estatus !== 'Todos' && n.estatus !== filtrosAplicados.estatus) return false;
      if (filtrosAplicados.fechaDesde && n.fecha < filtrosAplicados.fechaDesde) return false;
      if (filtrosAplicados.fechaHasta && n.fecha > filtrosAplicados.fechaHasta) return false;
      if (filtrosAplicados.firmante && !n.firmante.toLowerCase().includes(filtrosAplicados.firmante.toLowerCase())) return false;
      if (filtrosAplicados.tema && !n.tema.toLowerCase().includes(filtrosAplicados.tema.toLowerCase())) return false;
      return true;
    });
  }, [filtrosAplicados]);

  const toggleNota = (folio) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(folio)) next.delete(folio);
      else next.add(folio);
      return next;
    });
  };

  const toggleTodas = () => {
    if (seleccionadas.size === resultados.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(resultados.map((r) => r.folio)));
    }
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Bitácora' },
          { label: 'Consulta de notas' }
        ]}
      />

      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-sigecop-blue">
          Consulta y búsqueda de notas de bitácora
        </h1>
        <BadgeSprint codigo="HU-10" sprint="Sprint 3" />
      </div>
      <p className="text-sm text-slate-600 mb-6">Rol: Residente</p>

      <form
        onSubmit={aplicarFiltros}
        className="bg-white border border-slate-200 rounded-md p-5 mb-6"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Filtros de búsqueda
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="sg-label">Tipo de nota</label>
            <select className="sg-input" value={filtrosDraft.tipo} onChange={setDraft('tipo')}>
              <option>Todos</option>
              {tiposNotaCatalogo.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Fecha desde</label>
            <input type="date" className="sg-input" value={filtrosDraft.fechaDesde} onChange={setDraft('fechaDesde')} />
          </div>
          <div>
            <label className="sg-label">Fecha hasta</label>
            <input type="date" className="sg-input" value={filtrosDraft.fechaHasta} onChange={setDraft('fechaHasta')} />
          </div>
          <div>
            <label className="sg-label">Firmante</label>
            <input className="sg-input" placeholder="Nombre o apellido" value={filtrosDraft.firmante} onChange={setDraft('firmante')} />
          </div>
          <div>
            <label className="sg-label">Estatus</label>
            <select className="sg-input" value={filtrosDraft.estatus} onChange={setDraft('estatus')}>
              <option>Todos</option>
              {estatusNotaCatalogo.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Tema</label>
            <input className="sg-input" placeholder="Palabra clave del tema" value={filtrosDraft.tema} onChange={setDraft('tema')} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="sg-btn-secondary" onClick={limpiarFiltros}>
            Limpiar
          </button>
          <button type="submit" className="sg-btn-primary">
            🔍 Buscar
          </button>
        </div>
      </form>

      {seleccionadas.size > 0 && (
        <div className="bg-sigecop-blue-light border-l-4 border-sigecop-accent px-4 py-3 mb-4 rounded-r-md flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-sigecop-blue font-semibold">
            {seleccionadas.size} {seleccionadas.size === 1 ? 'nota seleccionada' : 'notas seleccionadas'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="sg-btn-secondary"
              onClick={() => showToast('Pendiente para Sprint siguiente.')}
            >
              📎 Adjuntar a estimación
            </button>
            <button
              type="button"
              className="sg-btn-secondary"
              onClick={() => showToast('Pendiente para Sprint siguiente.')}
            >
              ⬇ Exportar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Resultados ({resultados.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={resultados.length > 0 && seleccionadas.size === resultados.length}
                    onChange={toggleTodas}
                  />
                </th>
                <th className="text-left p-3 font-semibold">Folio</th>
                <th className="text-left p-3 font-semibold">Tipo</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Firmante</th>
                <th className="text-left p-3 font-semibold">Estatus</th>
                <th className="text-left p-3 font-semibold">Tema</th>
              </tr>
            </thead>
            <tbody>
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 italic">
                    Sin resultados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                resultados.map((n) => (
                  <tr key={n.folio} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(n.folio)}
                        onChange={() => toggleNota(n.folio)}
                      />
                    </td>
                    <td className="p-3 font-mono text-xs">{n.folio}</td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold rounded">
                        {n.tipo}
                      </span>
                    </td>
                    <td className="p-3">{n.fecha}</td>
                    <td className="p-3">{n.firmante}</td>
                    <td className="p-3"><EstatusBadge estatus={n.estatus} /></td>
                    <td className="p-3 text-slate-700">{n.tema}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Criterios de aceptación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CardCriterioAceptacion
            numero={1}
            texto="La búsqueda devuelve resultados que cumplen todos los filtros aplicados simultáneamente."
          />
          <CardCriterioAceptacion
            numero={2}
            texto="Se pueden seleccionar varias notas del resultado y exportarlas o adjuntarlas a una estimación."
          />
        </div>
      </section>
    </div>
  );
}
