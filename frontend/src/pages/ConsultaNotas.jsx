import { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { notasBitacoraDummy, tiposNotaCatalogo } from '../data/dummy.js';

// Normaliza texto para búsqueda case-insensitive y sin acentos, equivalente a
// PostgreSQL `ILIKE` con `unaccent`: "excavacion" matchea "Excavación", etc.
// El escape ̀-ͯ cubre los "combining diacritical marks" que NFD deja
// separados al descomponer caracteres acentuados.
function normalizar(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const FILTROS_INICIALES = {
  tipo: 'Todos',
  fechaDesde: '',
  fechaHasta: '',
  firmante: 'Todos',
  vinculo: 'Todas',     // 'Todas' | 'Vinculadas' | 'Sin vínculo'
  palabraClave: ''
};

const OPCIONES_VINCULO = ['Todas', 'Vinculadas', 'Sin vínculo'];

export default function ConsultaNotas() {
  // soloLectura no aplica a la consulta (todos los roles consultan), pero
  // mantenemos el hook para la metadata académica del header.
  useVistaHU('HU-10');

  const [filtrosDraft, setFiltrosDraft] = useState(FILTROS_INICIALES);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIALES);
  const [seleccionadas, setSeleccionadas] = useState(new Set());

  // Lista de firmantes únicos del libro, ordenada alfabéticamente, para el
  // select. Se calcula una sola vez (el libro dummy no cambia en sesión).
  const firmantesUnicos = useMemo(() => {
    const set = new Set(notasBitacoraDummy.map((n) => n.firmante));
    return ['Todos', ...Array.from(set).sort()];
  }, []);

  const setDraft = (k) => (e) =>
    setFiltrosDraft({ ...filtrosDraft, [k]: e.target.value });

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

  // Resultados con AND de los 5 filtros activos.
  const resultados = useMemo(() => {
    const palabraNorm = normalizar(filtrosAplicados.palabraClave);
    return notasBitacoraDummy.filter((n) => {
      if (filtrosAplicados.tipo !== 'Todos' && n.tipo !== filtrosAplicados.tipo) return false;
      if (filtrosAplicados.fechaDesde && n.fecha < filtrosAplicados.fechaDesde) return false;
      if (filtrosAplicados.fechaHasta && n.fecha > filtrosAplicados.fechaHasta) return false;
      if (filtrosAplicados.firmante !== 'Todos' && n.firmante !== filtrosAplicados.firmante) return false;
      if (filtrosAplicados.vinculo === 'Vinculadas' && !n.vinculadaA) return false;
      if (filtrosAplicados.vinculo === 'Sin vínculo' && n.vinculadaA) return false;
      if (palabraNorm) {
        const haystack = normalizar(`${n.asunto || ''} ${n.contenido || ''}`);
        if (!haystack.includes(palabraNorm)) return false;
      }
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

  // Exporta las notas seleccionadas a un .xlsx con exceljs. El archivo se
  // descarga directamente desde el navegador (sin backend). Esta vista usa
  // anchos de columna personalizados, asi que escribe exceljs directo en
  // lugar del helper genérico de services/excelExport.
  const handleExportar = async () => {
    if (seleccionadas.size === 0) return;
    const notas = resultados.filter((n) => seleccionadas.has(n.folio));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Notas');
    ws.columns = [
      { header: 'Folio',        key: 'folio',       width: 12 },
      { header: 'Fecha',        key: 'fecha',       width: 12 },
      { header: 'Tipo',         key: 'tipo',        width: 14 },
      { header: 'Firmante',     key: 'firmante',    width: 32 },
      { header: 'Vinculada a',  key: 'vinculadaA',  width: 14 },
      { header: 'Contenido',    key: 'contenido',   width: 80 }
    ];
    ws.addRows(notas.map((n) => ({
      folio: n.folio,
      fecha: n.fecha,
      tipo: n.tipo,
      firmante: n.firmante,
      vinculadaA: n.vinculadaA || '',
      contenido: n.contenido || ''
    })));
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `notas_busqueda_${fecha}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div>
      <HeaderVista
        huId="HU-10"
        titulo="Consulta y búsqueda de notas de bitácora"
        sprint="Sprint 3"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Bitácora' },
          { label: 'Consulta de notas' }
        ]}
      />

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
            <select
              className="sg-input"
              value={filtrosDraft.tipo}
              onChange={setDraft('tipo')}
              data-testid="filtro-tipo"
            >
              <option>Todos</option>
              {tiposNotaCatalogo.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Fecha desde</label>
            <input
              type="date"
              className="sg-input"
              value={filtrosDraft.fechaDesde}
              onChange={setDraft('fechaDesde')}
              data-testid="filtro-desde"
            />
          </div>
          <div>
            <label className="sg-label">Fecha hasta</label>
            <input
              type="date"
              className="sg-input"
              value={filtrosDraft.fechaHasta}
              onChange={setDraft('fechaHasta')}
              data-testid="filtro-hasta"
            />
          </div>
          <div>
            <label className="sg-label">Firmante</label>
            <select
              className="sg-input"
              value={filtrosDraft.firmante}
              onChange={setDraft('firmante')}
              data-testid="filtro-firmante"
            >
              {firmantesUnicos.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Vínculo</label>
            <select
              className="sg-input"
              value={filtrosDraft.vinculo}
              onChange={setDraft('vinculo')}
              data-testid="filtro-vinculo"
            >
              {OPCIONES_VINCULO.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Palabra clave</label>
            <input
              className="sg-input"
              placeholder="Busca en asunto y contenido (ILIKE sin acentos)"
              value={filtrosDraft.palabraClave}
              onChange={setDraft('palabraClave')}
              data-testid="filtro-palabra"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={limpiarFiltros}
            data-testid="btn-limpiar"
          >
            Limpiar
          </button>
          <button type="submit" className="sg-btn-primary" data-testid="btn-buscar">
            🔍 Buscar
          </button>
        </div>
      </form>

      {seleccionadas.size > 0 && (
        <div className="bg-sigecop-blue-light border-l-4 border-sigecop-accent px-4 py-3 mb-4 rounded-r-md flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-sigecop-blue font-semibold">
            {seleccionadas.size} {seleccionadas.size === 1 ? 'nota seleccionada' : 'notas seleccionadas'}
          </div>
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={handleExportar}
            data-testid="btn-exportar"
          >
            ⬇ Exportar a Excel
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Resultados (<span data-testid="contador-resultados">{resultados.length}</span>)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-resultados">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={resultados.length > 0 && seleccionadas.size === resultados.length}
                    onChange={toggleTodas}
                    aria-label="Seleccionar todas"
                  />
                </th>
                <th className="text-left p-3 font-semibold">Folio</th>
                <th className="text-left p-3 font-semibold">Tipo</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Firmante</th>
                <th className="text-left p-3 font-semibold">Vínculo</th>
                <th className="text-left p-3 font-semibold">Asunto</th>
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
                        aria-label={`Seleccionar ${n.folio}`}
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
                    <td className="p-3 text-xs">
                      {n.vinculadaA ? (
                        <span className="text-sigecop-blue">↪ {n.vinculadaA}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-700">{n.asunto}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-10"
        criterios={[
          { numero: 1, texto: 'La búsqueda devuelve solo las notas que cumplen simultáneamente todos los filtros aplicados (tipo, fecha, firmante, vínculo y palabra clave).' },
          { numero: 2, texto: 'Se pueden seleccionar varias notas del resultado y exportarlas en formato Excel.' }
        ]}
      />
    </div>
  );
}
