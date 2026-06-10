// HU-19 (Equipo 3) — Generación de los reportes definidos del contrato, con DATOS REALES.
// Todo en el CLIENTE (jsPDF + exceljs vía excelExport.js); NO toca backend ni server.js.
// Cada generador recibe el paquete `d` ya cargado por la página (una llamada por fuente),
// el contrato seleccionado y el período elegido. NO inventa datos: si una fuente viene vacía,
// el archivo sale con encabezados y sin filas (válido), nunca con relleno ficticio.
//
// Fuentes por reporte (endpoints existentes, verificados):
//   1 Avance físico   ← leerProgramaObra + trabajosDeContrato + listarPagos  (PDF + Excel)
//   2 Avance financiero ← historialEstimaciones + preparacionEstimacion + listarPagos (Excel)
//   3 Estimaciones    ← historialEstimaciones                                  (Excel)
//   4 Observaciones   ← (sin fuente: depende de HU-15)                         [DESHABILITADO]
//   5 Bitácora        ← notasDeContrato                                        (PDF)
//   6 Modificatorios  ← convenios                                             (Excel)
//   7 Penalizaciones  ← historialEstimaciones (retención/deductivas de carátula) (Excel)

import jsPDF from 'jspdf';
import { descargarExcelHoja, descargarExcelMultihoja } from './excelExport.js';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const dISO = (v) => (v == null ? '' : String(v).slice(0, 10)); // DATE/ISO -> 'AAAA-MM-DD'
const mesCorto = (iso) => MESES_ABR[Number(dISO(iso).slice(5, 7)) - 1] || '';
const stamp = () => new Date().toISOString().slice(0, 10);
const fechaMX = () => new Date().toLocaleDateString('es-MX');
const num2 = (n) => (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const baseName = (id, slug, periodo) => `reporte_${id}_${slug}_${periodo.toLowerCase()}_${stamp()}`;
const rangoPeriodo = (ini, fin) => `${dISO(ini) || '—'} – ${dISO(fin) || '—'}`;

// Resta `meses` (calendario) a una fecha ISO 'AAAA-MM-DD'.
function restarMeses(iso, meses) {
  const [y, m, dd] = iso.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, dd));
  base.setUTCMonth(base.getUTCMonth() - meses);
  return base.toISOString().slice(0, 10);
}

// Ventana de fechas según el período, anclada al dato MÁS RECIENTE del conjunto.
// CA-2: el período solo acota el RANGO de fechas; nunca cambia las columnas del reporte.
// [PENDIENTE DE CONFIRMAR con el profe] el ancla "dato más reciente con datos":
//   Mensual = último mes · Trimestral = último trimestre · Acumulado = todo.
export function ventanaPeriodo(fechasISO, periodo) {
  if (periodo === 'Acumulado') return null; // sin recorte
  const v = (fechasISO || []).map(dISO).filter(Boolean).sort();
  if (v.length === 0) return null;
  const hasta = v[v.length - 1];
  const desde = restarMeses(hasta, periodo === 'Trimestral' ? 3 : 1);
  return { desde, hasta };
}
const enVentana = (iso, win) => !win || (dISO(iso) > win.desde && dISO(iso) <= win.hasta);

// Recorta una lista de períodos del programa (ordenados) al período elegido.
function recortarPeriodos(periodos, periodo) {
  if (periodo === 'Trimestral') return periodos.slice(-3);
  if (periodo === 'Mensual') return periodos.slice(-1);
  return periodos; // Acumulado
}
const periodosOrdenados = (programa) =>
  (programa?.periodos || []).slice().sort((a, b) => a.numero - b.numero);

// ---------------------------------------------------------------------------
// Derivaciones de avance (reporte 1)
// ---------------------------------------------------------------------------
// Curva S ACUMULADA por período. Replica el fix de HU-05 para el financiero:
//   financiero = Σ pagos.importe con fecha_pago ≤ fin del período ÷ monto × 100
// (misma definición que el financiero_pct canónico, acumulada por fecha; NO una copia con bug).
export function curvaS(programa, trabajos, pagos, monto) {
  const periodos = periodosOrdenados(programa);
  const conceptos = programa?.conceptos || [];
  const contratado = conceptos.reduce((s, c) => s + (Number(c.cantidad) || 0), 0);

  const planeado = new Map(); // `${cid}|${pid}` -> cantidad planeada
  for (const cel of (programa?.celdas || [])) {
    planeado.set(`${cel.contrato_concepto_id}|${cel.contrato_periodo_id}`, Number(cel.cantidad) || 0);
  }
  const ejec = new Map(); // `${cid}|${pid}` -> cantidad ejecutada imputada al período
  for (const a of (trabajos?.avances || [])) {
    if (a.contrato_periodo_id == null) continue; // sin imputación no entra a la serie
    const k = `${a.contrato_concepto_id}|${a.contrato_periodo_id}`;
    ejec.set(k, (ejec.get(k) || 0) + (Number(a.cantidad) || 0));
  }

  const m = Number(monto) || 0;
  const pgs = (pagos || []).map((p) => ({ f: dISO(p.fecha_pago), imp: Number(p.importe) || 0 }));

  return periodos.map((p) => {
    let prog = 0, ej = 0;
    for (const q of periodos) {
      if (q.numero > p.numero) break; // acumulado hasta este período
      for (const c of conceptos) {
        prog += planeado.get(`${c.id}|${q.id}`) || 0;
        ej += ejec.get(`${c.id}|${q.id}`) || 0;
      }
    }
    const acumPago = m > 0 ? pgs.reduce((s, x) => (x.f && x.f <= dISO(p.fin) ? s + x.imp : s), 0) : 0;
    return {
      numero: p.numero,
      mes: mesCorto(p.inicio),
      inicio: dISO(p.inicio),
      fin: dISO(p.fin),
      programado: contratado > 0 ? Number(((prog / contratado) * 100).toFixed(2)) : null,
      ejecutado: contratado > 0 ? Number(((ej / contratado) * 100).toFixed(2)) : null,
      financiero: m > 0 ? Number(((acumPago / m) * 100).toFixed(2)) : null
    };
  });
}

// Matriz concepto × período (cantidad planeada por celda) + contratado/ejecutado/% por concepto.
export function ganttMatriz(programa, trabajos, periodosVisibles) {
  const planeado = new Map();
  for (const cel of (programa?.celdas || [])) {
    planeado.set(`${cel.contrato_concepto_id}|${cel.contrato_periodo_id}`, Number(cel.cantidad) || 0);
  }
  const ejecAcum = new Map((trabajos?.conceptos || []).map((c) => [c.contrato_concepto_id, Number(c.acumulado_ejecutado) || 0]));
  return (programa?.conceptos || []).map((c) => {
    const row = { Clave: c.clave || '', Concepto: c.concepto, Unidad: c.unidad };
    periodosVisibles.forEach((p) => { row[`#${p.numero} ${mesCorto(p.inicio)}`] = planeado.get(`${c.id}|${p.id}`) ?? ''; });
    const cont = Number(c.cantidad) || 0;
    const ej = ejecAcum.get(c.id) || 0;
    row['Contratado'] = cont;
    row['Ejecutado'] = ej;
    row['% Avance'] = cont > 0 ? Number(((ej / cont) * 100).toFixed(2)) : '';
    return row;
  });
}

// Encabezado común de los PDF.
function encabezadoPDF(doc, titulo, contrato, periodo, subtitulo) {
  doc.setFontSize(14);
  doc.text(titulo, 14, 18);
  doc.setFontSize(10);
  doc.text(`Contrato: ${contrato?.folio || '—'} · ${contrato?.contratista || ''}`, 14, 25);
  let y = 31;
  doc.text(`Periodo: ${periodo} · Generado: ${fechaMX()}`, 14, y);
  if (subtitulo) { y += 6; doc.text(subtitulo, 14, y); }
  return y + 11;
}

// ---------------------------------------------------------------------------
// 1) Avance físico vs programado (PDF + Excel)
// ---------------------------------------------------------------------------
function avanceFisicoPDF(d, contrato, periodo) {
  const curvaCompleta = curvaS(d.programa, d.trabajos, d.pagos, contrato?.monto);
  const visibles = recortarPeriodos(periodosOrdenados(d.programa), periodo);
  const visiblesNum = new Set(visibles.map((p) => p.numero));
  const curva = curvaCompleta.filter((c) => visiblesNum.has(c.numero));

  const doc = new jsPDF();
  let y = encabezadoPDF(doc, 'Reporte 1 — Avance físico vs programado', contrato, periodo);

  doc.setFontSize(11); doc.text('Curva S (% acumulado)', 14, y); y += 8;
  doc.setFontSize(9);
  doc.text('Mes | Programado | Ejecutado | Financiero', 14, y); y += 4;
  doc.setDrawColor(200); doc.line(14, y, 196, y); y += 4;
  if (curva.length === 0) { doc.text('Sin programa de obra para el periodo seleccionado.', 14, y); y += 5; }
  curva.forEach((c) => {
    const f = (v) => (v == null ? '—' : `${v}%`);
    doc.text(`${c.mes}  |  ${f(c.programado)}  |  ${f(c.ejecutado)}  |  ${f(c.financiero)}`, 14, y);
    y += 5;
    if (y > 280) { doc.addPage(); y = 20; }
  });

  y += 6;
  doc.setFontSize(11); doc.text('Concepto × periodo (cantidad planeada)', 14, y); y += 6;
  doc.setFontSize(8);
  const gantt = ganttMatriz(d.programa, d.trabajos, visibles);
  const cols = gantt.length > 0 ? Object.keys(gantt[0]) : [];
  if (cols.length) { doc.text(cols.join(' | '), 14, y); y += 4; doc.line(14, y, 196, y); y += 4; }
  gantt.forEach((r) => {
    doc.text(cols.map((k) => String(r[k] ?? '')).join(' | '), 14, y);
    y += 5;
    if (y > 280) { doc.addPage(); y = 20; }
  });

  doc.save(`${baseName(1, 'avance-fisico', periodo)}.pdf`);
}

function avanceFisicoExcel(d, contrato, periodo) {
  const curvaCompleta = curvaS(d.programa, d.trabajos, d.pagos, contrato?.monto);
  const visibles = recortarPeriodos(periodosOrdenados(d.programa), periodo);
  const visiblesNum = new Set(visibles.map((p) => p.numero));
  const curva = curvaCompleta
    .filter((c) => visiblesNum.has(c.numero))
    .map((c) => ({ Mes: c.mes, Periodo: rangoPeriodo(c.inicio, c.fin), 'Programado %': c.programado, 'Ejecutado %': c.ejecutado, 'Financiero %': c.financiero }));
  const gantt = ganttMatriz(d.programa, d.trabajos, visibles);
  return descargarExcelMultihoja(`${baseName(1, 'avance-fisico', periodo)}.xlsx`, [
    { nombre: 'Curva S', filas: curva },
    { nombre: 'Concepto x periodo', filas: gantt }
  ]);
}

// ---------------------------------------------------------------------------
// 2) Avance financiero (Excel) — REAL: estimaciones + pagos. Sin invento de importes.
//    [PENDIENTE HU-20] comprometido/disponible presupuestal (techo anual): no cableado aún.
// ---------------------------------------------------------------------------
function avanceFinancieroExcel(d, contrato, periodo) {
  const win = ventanaPeriodo((d.historial || []).map((e) => e.periodo_fin), periodo);
  const filas = (d.historial || [])
    .filter((e) => enVentana(e.periodo_fin, win))
    .map((e) => ({
      Estimacion: `EST-${String(e.numero).padStart(3, '0')}`,
      Periodo: rangoPeriodo(e.periodo_inicio, e.periodo_fin),
      Estado: e.estado,
      Subtotal: Number(e.subtotal) || 0,
      Amortizacion: Number(e.amortizacion) || 0,
      Retencion: Number(e.retencion) || 0,
      Deductivas: Number(e.deductivas) || 0,
      Neto: Number(e.neto) || 0
    }));
  const prep = d.prep || {};
  const resumen = [
    { Concepto: 'Monto del contrato', Valor: Number(contrato?.monto) || 0 },
    { Concepto: 'Σ Neto autorizado (estimaciones no rechazadas)', Valor: (d.historial || []).filter((e) => e.estado !== 'rechazada').reduce((s, e) => s + (Number(e.neto) || 0), 0) },
    { Concepto: 'Pagado acumulado', Valor: Number(prep.avance?.pagado_acumulado) || 0 },
    { Concepto: 'Avance financiero % (pagado ÷ monto)', Valor: prep.avance?.financiero_pct ?? '' },
    { Concepto: 'Comprometido / disponible presupuestal', Valor: 'PENDIENTE — depende de HU-20 (presupuesto_anual)' }
  ];
  return descargarExcelMultihoja(`${baseName(2, 'avance-financiero', periodo)}.xlsx`, [
    { nombre: 'Por estimacion', filas },
    { nombre: 'Resumen', filas: resumen }
  ]);
}

// ---------------------------------------------------------------------------
// 3) Listado de estimaciones (Excel) — período = etiqueta (contenido no se altera, CA-2).
// ---------------------------------------------------------------------------
function estimacionesExcel(d, contrato, periodo) {
  const filas = (d.historial || []).map((e) => ({
    Estimacion: `EST-${String(e.numero).padStart(3, '0')}`,
    Periodo: rangoPeriodo(e.periodo_inicio, e.periodo_fin),
    Estado: e.estado,
    Subtotal: Number(e.subtotal) || 0,
    Amortizacion: Number(e.amortizacion) || 0,
    Retencion: Number(e.retencion) || 0,
    Deductivas: Number(e.deductivas) || 0,
    Neto: Number(e.neto) || 0,
    'Integrada en': dISO(e.integrada_en),
    'Integrada por': e.integrada_por_nombre || '',
    'Enviada en': dISO(e.enviada_en),
    'Enviada por': e.enviada_por_nombre || ''
  }));
  return descargarExcelHoja(`${baseName(3, 'estimaciones', periodo)}.xlsx`, 'Estimaciones', filas);
}

// ---------------------------------------------------------------------------
// 5) Bitácora completa (PDF cronológico) — notas reales del contrato.
// ---------------------------------------------------------------------------
function bitacoraPDF(d, contrato, periodo) {
  const todas = (d.notas?.notas || []).slice().sort((a, b) => dISO(a.fecha).localeCompare(dISO(b.fecha)));
  const win = ventanaPeriodo(todas.map((n) => n.fecha), periodo);
  const notas = todas.filter((n) => enVentana(n.fecha, win));

  const doc = new jsPDF();
  let y = encabezadoPDF(doc, 'Reporte 5 — Bitácora completa', contrato, periodo, `${notas.length} notas`);
  if (notas.length === 0) { doc.setFontSize(10); doc.text('Sin notas de bitácora para el periodo seleccionado.', 14, y); }
  notas.forEach((n) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.text(`Nota #${n.numero} · ${dISO(n.fecha)} · ${n.tipo_etiqueta || n.tipo}`, 14, y); y += 6;
    doc.setFontSize(9);
    doc.text(`Emisor: ${n.emisor_nombre || '—'} · Estado: ${n.aceptacion || n.estado}`, 14, y); y += 5;
    if (n.asunto) { const a = doc.splitTextToSize(`Asunto: ${n.asunto}`, 180); doc.text(a, 14, y); y += a.length * 4 + 1; }
    const cont = doc.splitTextToSize(n.contenido || '', 180);
    if (y + cont.length * 4 > 280) { doc.addPage(); y = 20; }
    doc.text(cont, 14, y); y += cont.length * 4 + 1;
    const firmas = (n.firmas || []).map((f) => `${f.nombre} (${f.rol_en_firma})`).join(', ') || '—';
    doc.text(doc.splitTextToSize(`Firmas: ${firmas}`, 180), 14, y); y += 6;
    doc.setDrawColor(220); doc.line(14, y, 196, y); y += 4;
  });
  doc.save(`${baseName(5, 'bitacora', periodo)}.pdf`);
}

// ---------------------------------------------------------------------------
// 6) Histórico de modificatorios (Excel) — convenios reales (art. 59 / 59 Bis LOPSRM).
// ---------------------------------------------------------------------------
function modificatoriosExcel(d, contrato, periodo) {
  const filas = (d.convenios?.convenios || []).map((v) => ({
    Numero: v.numero,
    Folio: v.folio || '',
    Tipo: v.tipo,
    Fundamento: v.fundamento,
    Fecha: dISO(v.fecha),
    'Monto anterior': v.monto_anterior == null ? '' : Number(v.monto_anterior),
    'Monto nuevo': v.monto_nuevo == null ? '' : Number(v.monto_nuevo),
    'Δ Monto %': v.delta_monto_pct == null ? '' : Number(v.delta_monto_pct),
    'Plazo anterior (d)': v.plazo_anterior_dias ?? '',
    'Plazo nuevo (d)': v.plazo_nuevo_dias ?? '',
    'Δ Plazo %': v.delta_plazo_pct == null ? '' : Number(v.delta_plazo_pct),
    'Revisión SFP (art.102)': v.requiere_revision_sfp ? 'Sí' : 'No',
    'Ajuste costos (art.59 Bis)': v.requiere_ajuste_costos ? 'Sí' : 'No',
    Motivo: v.motivo || '',
    'Autorizado por': v.autorizado_por_nombre || ''
  }));
  return descargarExcelHoja(`${baseName(6, 'modificatorios', periodo)}.xlsx`, 'Modificatorios', filas);
}

// ---------------------------------------------------------------------------
// 7) Penalizaciones y deductivas (Excel) — retención/deductivas de la carátula.
//    [DECISIÓN LEGAL PENDIENTE de confirmar con el profe — Nivel 1] el fundamento de la
//    pena por atraso (art. 138/139 LOPSRM) NO está verificado; la fuente de datos es la
//    retención y las deductivas registradas en cada estimación.
// ---------------------------------------------------------------------------
function penalizacionesExcel(d, contrato, periodo) {
  const penaPct = d.prep?.contrato?.pena_convencional_pct;
  const filas = (d.historial || []).map((e) => ({
    Estimacion: `EST-${String(e.numero).padStart(3, '0')}`,
    Periodo: rangoPeriodo(e.periodo_inicio, e.periodo_fin),
    Estado: e.estado,
    'Retencion (pena por atraso)': Number(e.retencion) || 0,
    Deductivas: Number(e.deductivas) || 0,
    'Pena convencional % (contrato)': penaPct == null ? 'No pactada' : penaPct
  }));
  return descargarExcelHoja(`${baseName(7, 'penalizaciones', periodo)}.xlsx`, 'Penalizaciones', filas);
}

// ---------------------------------------------------------------------------
// Catálogo de reportes + mapa de handlers por formato.
// `disponible: false` => fila visible pero export deshabilitado (no se inventa fuente).
// `requiereBitacora` => se deshabilita si el contrato no tiene bitácora aperturada.
// ---------------------------------------------------------------------------
export const CATALOGO_REPORTES = [
  { id: 1, slug: 'avance-fisico', nombre: 'Avance físico vs programado', descripcion: 'Curva S + concepto × periodo (programa, trabajos y pagos reales).', formatos: ['PDF', 'Excel'], disponible: true },
  { id: 2, slug: 'avance-financiero', nombre: 'Avance financiero', descripcion: 'Por estimación: subtotal, amortización, retención, deductivas y neto + pagado acumulado.', formatos: ['Excel'], disponible: true },
  { id: 3, slug: 'estimaciones', nombre: 'Listado de estimaciones', descripcion: 'Una fila por estimación con estado, periodo, importes y sellos de integración/envío.', formatos: ['Excel'], disponible: true },
  { id: 4, slug: 'observaciones', nombre: 'Listado de observaciones', descripcion: 'Sin fuente — depende de HU-15 (GET de observaciones a nivel contrato).', formatos: ['Excel'], disponible: false },
  { id: 5, slug: 'bitacora', nombre: 'Bitácora completa', descripcion: 'Notas cronológicas con folio, fecha, tipo, emisor y firmas.', formatos: ['PDF'], disponible: true, requiereBitacora: true },
  { id: 6, slug: 'modificatorios', nombre: 'Histórico de modificatorios', descripcion: 'Convenios del contrato (art. 59 / 59 Bis LOPSRM) con deltas de monto y plazo.', formatos: ['Excel'], disponible: true },
  { id: 7, slug: 'penalizaciones', nombre: 'Penalizaciones y deductivas', descripcion: 'Retención por atraso y deductivas registradas en cada estimación.', formatos: ['Excel'], disponible: true }
];

export const PERIODOS_REPORTE = ['Mensual', 'Trimestral', 'Acumulado'];

export const HANDLERS = {
  1: { PDF: avanceFisicoPDF, Excel: avanceFisicoExcel },
  2: { Excel: avanceFinancieroExcel },
  3: { Excel: estimacionesExcel },
  4: {},
  5: { PDF: bitacoraPDF },
  6: { Excel: modificatoriosExcel },
  7: { Excel: penalizacionesExcel }
};
