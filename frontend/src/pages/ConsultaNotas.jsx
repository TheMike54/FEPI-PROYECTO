import { useState, useEffect, useCallback, useMemo } from 'react';
import ExcelJS from 'exceljs';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import BuscadorNotas, { useFiltrosNotas, ETIQUETA_ACEPTACION } from '../components/notas/BuscadorNotas.jsx';
import DocumentoNota from '../components/notas/DocumentoNota.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-10 conectado al backend. La búsqueda y el export ya existían sobre datos de
// muestra; aquí se cablean a datos REALES: el usuario elige un contrato (de los que
// participa) y se cargan las notas de su bitácora (GET /bitacora/contrato/:id/notas).
// Los filtros AND, la selección múltiple y el export viven en el componente
// reutilizable BuscadorNotas (HU-12 reusará el mismo buscador como modal).

const soloFecha = (f) => (f || '').slice(0, 10);

export default function ConsultaNotas() {
  // soloLectura no bloquea la consulta (todos los roles con acceso consultan); el
  // hook se mantiene por la metadata académica y el aviso del HeaderVista.
  const { token } = useSesion();
  useVistaHU('HU-10');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [tipos, setTipos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [sinBitacora, setSinBitacora] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState(() => new Set());
  // O8 (b): nota abierta como documento imprimible.
  const [notaDoc, setNotaDoc] = useState(null);
  const contratoSel = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);

  // Carga inicial: contratos del usuario + catálogo REAL de tipos (art. 125).
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
    api.notaTipos().then((t) => setTipos(Array.isArray(t) ? t : [])).catch(() => setTipos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setNotas([]);
    setSeleccionadas(new Set());
    setSinBitacora(false);
    if (!id) return;
    setCargando(true);
    try {
      const data = await api.notasDeContrato(id);
      setNotas(Array.isArray(data?.notas) ? data.notas : []);
    } catch (e) {
      // 404 = el contrato no tiene bitácora aperturada (caso esperado, no error duro).
      if (e.status === 404) {
        setSinBitacora(true);
      } else {
        showToast(e.status === 403 ? 'No tienes acceso a las notas de este contrato' : 'No se pudieron cargar las notas');
      }
      setNotas([]);
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  const { filtros, setFiltro, limpiar, resultados, firmantesUnicos, numeroPorId } = useFiltrosNotas(notas);

  const toggle = (id) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodas = () => {
    setSeleccionadas((prev) => {
      const todas = resultados.length > 0 && resultados.every((n) => prev.has(n.id));
      if (todas) {
        const next = new Set(prev);
        resultados.forEach((n) => next.delete(n.id));
        return next;
      }
      const next = new Set(prev);
      resultados.forEach((n) => next.add(n.id));
      return next;
    });
  };

  // Export client-side con exceljs de las notas seleccionadas (resueltas contra el
  // libro cargado). Columnas finales: Folio, Fecha, Tipo, Emisor, Vínculo, Asunto,
  // Contenido, Estado de aceptación.
  const exportar = async () => {
    if (seleccionadas.size === 0) return;
    const elegidas = notas.filter((n) => seleccionadas.has(n.id));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Notas');
    ws.columns = [
      { header: 'Folio',    key: 'folio',     width: 10 },
      { header: 'Fecha',    key: 'fecha',     width: 12 },
      { header: 'Tipo',     key: 'tipo',      width: 22 },
      { header: 'Emisor',   key: 'emisor',    width: 32 },
      { header: 'Vínculo',  key: 'vinculo',   width: 12 },
      { header: 'Asunto',   key: 'asunto',    width: 40 },
      { header: 'Contenido', key: 'contenido', width: 80 },
      { header: 'Estado',   key: 'estado',    width: 18 }
    ];
    ws.addRows(elegidas.map((n) => ({
      folio: `#${n.numero}`,
      fecha: soloFecha(n.fecha),
      tipo: n.tipo_etiqueta || n.tipo,
      emisor: n.emisor_nombre || '',
      vinculo: n.vinculada_a ? `#${numeroPorId.get(n.vinculada_a) ?? n.vinculada_a}` : '',
      asunto: n.asunto || '',
      contenido: n.contenido || '',
      estado: ETIQUETA_ACEPTACION[n.aceptacion] || n.aceptacion || ''
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

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para cargar tus contratos y consultar las notas de su bitácora.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
        <label className="sg-label">Contrato</label>
        <select
          className="sg-input"
          value={contratoId}
          onChange={(e) => seleccionarContrato(e.target.value)}
          disabled={sinSesion}
          data-testid="select-contrato"
        >
          <option value="">— Selecciona un contrato —</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
        </select>
      </div>

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para buscar en las notas de su bitácora.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando notas…</p>}
      {sinBitacora && (
        <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 mb-4 text-sm text-amber-800 rounded-r-md" data-testid="aviso-sin-bitacora">
          Este contrato aún no tiene bitácora aperturada, por lo que no hay notas que consultar.
        </div>
      )}

      {seleccionadas.size > 0 && (
        <div className="bg-sigecop-blue-light border-l-4 border-sigecop-accent px-4 py-3 mb-4 rounded-r-md flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-sigecop-blue font-semibold">
            {seleccionadas.size} {seleccionadas.size === 1 ? 'nota seleccionada' : 'notas seleccionadas'}
          </div>
          <button type="button" className="sg-btn-secondary" onClick={exportar} data-testid="btn-exportar">
            ⬇ Exportar a Excel
          </button>
        </div>
      )}

      <BuscadorNotas
        filtros={filtros}
        setFiltro={setFiltro}
        onLimpiar={limpiar}
        tipos={tipos}
        firmantesUnicos={firmantesUnicos}
        resultados={resultados}
        numeroPorId={numeroPorId}
        seleccionadas={seleccionadas}
        onToggle={toggle}
        onToggleTodas={toggleTodas}
        onVerDocumento={setNotaDoc}
      />

      <SeccionCriterios
        huId="HU-10"
        criterios={[
          { numero: 1, texto: 'La búsqueda devuelve solo las notas que cumplen simultáneamente todos los filtros aplicados (tipo, fecha, firmante, vínculo y palabra clave).' },
          { numero: 2, texto: 'Se pueden seleccionar varias notas del resultado y exportarlas en formato Excel.' }
        ]}
      />

      {notaDoc && <DocumentoNota nota={notaDoc} contrato={contratoSel} onCerrar={() => setNotaDoc(null)} />}
    </div>
  );
}
