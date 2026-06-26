// HU-19 (Equipo 3) — Generación de los reportes definidos del contrato, con DATOS REALES.
// Todo en el CLIENTE (jsPDF + exceljs vía excelExport.js); NO toca backend ni server.js.
// Cada generador recibe el paquete `d` ya cargado por la página (una llamada por fuente),
// el contrato seleccionado y el período elegido. NO inventa datos: si una fuente viene vacía,
// el archivo sale con encabezados y sin filas (válido), nunca con relleno ficticio.
//
// Fuentes por reporte (endpoints existentes, verificados):
//   1 Avance físico   ← leerProgramaObra + trabajosDeContrato + listarPagos  (PDF + Excel)
//   2 Avance financiero ← historialEstimaciones + listarPagos                  (Excel)
//   3 Estimaciones    ← historialEstimaciones                                  (Excel)
//   4 Observaciones   ← (sin fuente: falta un GET de observaciones a NIVEL CONTRATO)            [DESHABILITADO]
//   5 Bitácora        ← notasDeContrato                                        (PDF)
//   6 Modificatorios  ← convenios                                             (Excel)
//   7 Penalizaciones  ← historialEstimaciones (pena por atraso DERIVADA + 5 al millar fiscal + deductivas)
//                       + preparacionEstimacion (pena % pactada) (Excel)
//
// RECONCILIACIÓN O7↔HU-15 (HU-19 ramificó antes de la reconciliación): los reportes muestran el ESTADO
// con su ETIQUETA canónica (labelEstadoEstimacion: enviada→"Presentada", autorizada→"Autorizada", …),
// no el valor crudo del esquema. La PENA POR ATRASO (art. 46 Bis LOPSRM + arts. 86–88 RLOPSRM) se DERIVA por identidad de la
// carátula porque el endpoint del historial aún no expone `retencion_atraso` (ver penaAtrasoDerivada).

import { descargarExcelMultihoja, descargarExcelReporte } from './excelExport.js';
import { labelEstadoEstimacion } from '../data/estadoEstimacion.js';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const dISO = (v) => (v == null ? '' : String(v).slice(0, 10)); // DATE/ISO -> 'AAAA-MM-DD'
const mesCorto = (iso) => MESES_ABR[Number(dISO(iso).slice(5, 7)) - 1] || '';
const stamp = () => new Date().toISOString().slice(0, 10);
// 'hoy' en hora local 'AAAA-MM-DD' (mismo cálculo que CurvaAvance.hoyISO, sin desfase UTC).
export function hoyISO() {
  const d = new Date();
  const z = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
const baseName = (id, slug, periodo) => `reporte_${id}_${slug}_${periodo.toLowerCase()}_${stamp()}`;
const rangoPeriodo = (ini, fin) => `${dISO(ini) || '—'} – ${dISO(fin) || '—'}`;
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Pena por ATRASO (art. 46 Bis LOPSRM + arts. 86–88 RLOPSRM) DERIVADA por la identidad de la carátula que arma el server:
//   neto = subtotal − amortización − retención(5 al millar) − deductivas − retencion_atraso
//   ⟹ retencion_atraso = subtotal − amortización − retención − deductivas − neto
// Es EXACTA (todos los términos vienen ROUNDed del backend; NO recalcula la carátula, sólo despeja el
// renglón que el endpoint del historial aún no expone). Así las columnas de carátula CUADRAN al neto.
// Fundamento legal de la pena: art. 46 Bis LOPSRM + arts. 86–88 RLOPSRM (mecánica) + art. 90 RLOPSRM (tope).
const penaAtrasoDerivada = (e) =>
  Math.max(0, r2((Number(e.subtotal) || 0) - (Number(e.amortizacion) || 0) - (Number(e.retencion) || 0) - (Number(e.deductivas) || 0) - (Number(e.neto) || 0)));

// Resta `meses` (calendario) a una fecha ISO 'AAAA-MM-DD'.
function restarMeses(iso, meses) {
  const [y, m, dd] = iso.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, dd));
  base.setUTCMonth(base.getUTCMonth() - meses);
  return base.toISOString().slice(0, 10);
}

// Ventana de fechas según el período, anclada al dato MÁS RECIENTE del conjunto.
// CA-2: el período solo acota el RANGO de fechas; nunca cambia las columnas del reporte.
// Criterio del equipo (default conservador) — ancla "dato más reciente con datos":
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
export function recortarPeriodos(periodos, periodo) {
  if (periodo === 'Trimestral') return periodos.slice(-3);
  if (periodo === 'Mensual') return periodos.slice(-1);
  return periodos; // Acumulado
}
export const periodosOrdenados = (programa) =>
  (programa?.periodos || []).slice().sort((a, b) => a.numero - b.numero);

// ---------------------------------------------------------------------------
// Derivaciones de avance (reporte 1)
// ---------------------------------------------------------------------------
// Curva S ACUMULADA por período. REUSA la definición CORREGIDA de CurvaAvance.financieroMap (fix
// O1): el período EN CURSO corta en hoy (no en su fin), los períodos FUTUROS no tienen punto (null)
// y el ejecutado se detiene en el período actual. Así la curva del reporte coincide EXACTAMENTE con
// la que ve el usuario en pantalla, no una copia vieja con el bug donde el período actual quedaba mal.
//   financiero = Σ pagos.importe con fecha_pago ≤ corte ÷ monto × 100   (corte = min(fin, hoy))
export function curvaS(programa, trabajos, pagos, monto, hoy = hoyISO()) {
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

  // Período actual: el que contiene hoy; si hoy es posterior a todos, el último; si es anterior a
  // todos, ninguno (mismo criterio que CurvaAvance.periodoActualNum).
  let periodoActualNum = null;
  if (periodos.length > 0) {
    const dentro = periodos.find((p) => dISO(p.inicio) <= hoy && dISO(p.fin) >= hoy);
    if (dentro) periodoActualNum = dentro.numero;
    else {
      const ultimo = periodos[periodos.length - 1];
      if (hoy > dISO(ultimo.fin)) periodoActualNum = ultimo.numero;
    }
  }

  return periodos.map((p) => {
    let prog = 0, ej = 0;
    for (const q of periodos) {
      if (q.numero > p.numero) break; // acumulado hasta este período
      for (const c of conceptos) {
        prog += planeado.get(`${c.id}|${q.id}`) || 0;
        ej += ejec.get(`${c.id}|${q.id}`) || 0;
      }
    }
    // FINANCIERO: períodos futuros sin punto (null); el período en curso corta en hoy.
    let financiero = null;
    if (m > 0 && dISO(p.inicio) <= hoy) {
      const corte = dISO(p.fin) <= hoy ? dISO(p.fin) : hoy;
      const acumPago = pgs.reduce((s, x) => (x.f && x.f <= corte ? s + x.imp : s), 0);
      financiero = Number(((acumPago / m) * 100).toFixed(2));
    }
    // EJECUTADO se detiene en el período actual (futuros: null), igual que la curva en pantalla.
    const muestraEjec = periodoActualNum != null && p.numero <= periodoActualNum;
    return {
      numero: p.numero,
      mes: mesCorto(p.inicio),
      inicio: dISO(p.inicio),
      fin: dISO(p.fin),
      programado: contratado > 0 ? Number(((prog / contratado) * 100).toFixed(2)) : null,
      ejecutado: (contratado > 0 && muestraEjec) ? Number(((ej / contratado) * 100).toFixed(2)) : null,
      financiero
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

// Matriz concepto × período con SEMÁFORO (mismo criterio que CurvaAvance.colorCelda):
//   vacio  = sin programa en la celda (no planeado)        · gris
//   ejecutado = hay avance imputado a la celda             · verde
//   atraso = programado VENCIDO sin ejecutar (fin < hoy)   · rojo
//   pendiente = programado por venir (aún no vence)        · ámbar
// Devuelve, por concepto, sus celdas (estado por período visible) + contratado/ejecutado/% real.
export function ganttSemaforo(programa, trabajos, periodosVisibles, hoy = hoyISO()) {
  const planeado = new Map();
  for (const cel of (programa?.celdas || [])) {
    planeado.set(`${cel.contrato_concepto_id}|${cel.contrato_periodo_id}`, Number(cel.cantidad) || 0);
  }
  const ejecCelda = new Map();
  for (const a of (trabajos?.avances || [])) {
    if (a.contrato_periodo_id == null) continue;
    const k = `${a.contrato_concepto_id}|${a.contrato_periodo_id}`;
    ejecCelda.set(k, (ejecCelda.get(k) || 0) + (Number(a.cantidad) || 0));
  }
  const ejecAcum = new Map((trabajos?.conceptos || []).map((c) => [c.contrato_concepto_id, Number(c.acumulado_ejecutado) || 0]));
  return (programa?.conceptos || []).map((c) => {
    const cont = Number(c.cantidad) || 0;
    const ej = ejecAcum.get(c.id) || 0;
    const celdas = periodosVisibles.map((p) => {
      const plan = planeado.get(`${c.id}|${p.id}`) || 0;
      let estado;
      if (plan <= 0) estado = 'vacio';
      else if ((ejecCelda.get(`${c.id}|${p.id}`) || 0) > 0) estado = 'ejecutado';
      else estado = dISO(p.fin) < hoy ? 'atraso' : 'pendiente';
      return { numero: p.numero, mes: mesCorto(p.inicio), estado, planeado: plan };
    });
    return {
      clave: c.clave || '', concepto: c.concepto, unidad: c.unidad,
      contratado: cont, ejecutado: ej,
      pct: cont > 0 ? Number(((ej / cont) * 100).toFixed(1)) : null,
      celdas
    };
  });
}

// ---------------------------------------------------------------------------
// 1) Avance físico vs programado — el PDF se generó antes con jsPDF crudo; REDISEÑO 24-jun: ahora el PDF
//    es un DOCUMENTO imprimible (components/reportes/DocumentoAvanceFisico.jsx, patrón window.print de la
//    carátula), por eso HANDLERS[1].PDF = 'modal' (la página abre el documento). El Excel sigue aquí.
// ---------------------------------------------------------------------------
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
      // #6: las rechazadas se MUESTRAN (trazabilidad) pero NO suman en la fila TOTALES.
      _excluirTotal: e.estado === 'rechazada',
      estim: `EST-${String(e.numero).padStart(3, '0')}`,
      periodo: rangoPeriodo(e.periodo_inicio, e.periodo_fin),
      estado: labelEstadoEstimacion(e.estado),
      subtotal: Number(e.subtotal) || 0,
      amortizacion: Number(e.amortizacion) || 0,
      retencion: Number(e.retencion) || 0,
      deductivas: Number(e.deductivas) || 0,
      ret_atraso: penaAtrasoDerivada(e),
      neto: Number(e.neto) || 0
    }));
  // Pagado y % financiero DERIVADOS de los pagos reales (Σ listarPagos ÷ monto): misma definición
  // que la curva de CurvaAvance, no una fuente paralela. Sin invención de importes.
  const monto = Number(contrato?.monto) || 0;
  const pagadoAcum = (d.pagos || []).reduce((s, p) => s + (Number(p.importe) || 0), 0);
  const estimadoNoRech = (d.historial || []).filter((e) => e.estado !== 'rechazada').reduce((s, e) => s + (Number(e.neto) || 0), 0);
  // El "comprometido/disponible presupuestal" (techo anual) depende de HU-20 (no cableado): se OMITE en vez
  // de meter un texto "PENDIENTE" en una columna de números (sería un dato ficticio).
  return descargarExcelReporte(`${baseName(2, 'avance-financiero', periodo)}.xlsx`, {
    hojaNombre: 'Avance financiero',
    titulo: 'Reporte 2 · Avance financiero (sin IVA)',
    generado: stamp(),
    contrato: { folio: contrato?.folio, contratista: contrato?.contratista, periodo },
    tablas: [{
      titulo: 'Por estimación',
      columnas: [
        { header: 'Estim.', key: 'estim', width: 12, fmt: 'text' },
        { header: 'Periodo', key: 'periodo', width: 26, fmt: 'text' },
        { header: 'Estado', key: 'estado', width: 14, fmt: 'text' },
        { header: 'Subtotal', key: 'subtotal', width: 16, fmt: 'money' },
        { header: 'Amortización', key: 'amortizacion', width: 16, fmt: 'money' },
        { header: '5 al millar', key: 'retencion', width: 14, fmt: 'money' },
        { header: 'Deductivas', key: 'deductivas', width: 14, fmt: 'money' },
        { header: 'Ret. atraso', key: 'ret_atraso', width: 14, fmt: 'money' },
        { header: 'Neto', key: 'neto', width: 16, fmt: 'money' }
      ],
      filas,
      totales: { label: 'TOTALES', labelKey: 'estim', sumKeys: ['subtotal', 'amortizacion', 'retencion', 'deductivas', 'ret_atraso', 'neto'] }
    }],
    metricas: [
      { label: 'Monto del contrato', valor: monto, fmt: 'money' },
      { label: 'Estimado (Σ neto de estimaciones no rechazadas)', valor: estimadoNoRech, fmt: 'money' },
      { label: 'Pagado acumulado', valor: pagadoAcum, fmt: 'money' },
      { label: 'Avance financiero % (pagado ÷ monto)', valor: monto > 0 ? Number(((pagadoAcum / monto) * 100).toFixed(2)) : 0, fmt: 'pct' }
    ]
  });
}

// ---------------------------------------------------------------------------
// 3) Listado de estimaciones (Excel) — período = etiqueta (contenido no se altera, CA-2).
// ---------------------------------------------------------------------------
function estimacionesExcel(d, contrato, periodo) {
  // INCLUYE las rechazadas (trazabilidad): no se filtra por estado. "Presentada" = sello de envío HU-13
  // (columna enviada_en/por; arranca el plazo del art. 54 LOPSRM).
  const filas = (d.historial || []).map((e) => ({
    // #6: las rechazadas se MUESTRAN (trazabilidad) pero NO suman en la fila TOTALES.
    _excluirTotal: e.estado === 'rechazada',
    estim: `EST-${String(e.numero).padStart(3, '0')}`,
    periodo: rangoPeriodo(e.periodo_inicio, e.periodo_fin),
    estado: labelEstadoEstimacion(e.estado),
    subtotal: Number(e.subtotal) || 0,
    neto: Number(e.neto) || 0,
    integrada_en: dISO(e.integrada_en),
    integrada_por: e.integrada_por_nombre || '',
    presentada_en: dISO(e.enviada_en)
  }));
  return descargarExcelReporte(`${baseName(3, 'estimaciones', periodo)}.xlsx`, {
    hojaNombre: 'Estimaciones',
    titulo: 'Reporte 3 · Listado de estimaciones',
    generado: stamp(),
    contrato: { folio: contrato?.folio, contratista: contrato?.contratista, periodo },
    tablas: [{
      columnas: [
        { header: 'Estim.', key: 'estim', width: 12, fmt: 'text' },
        { header: 'Periodo', key: 'periodo', width: 26, fmt: 'text' },
        { header: 'Estado', key: 'estado', width: 16, fmt: 'text' },
        { header: 'Subtotal', key: 'subtotal', width: 16, fmt: 'money' },
        { header: 'Neto', key: 'neto', width: 16, fmt: 'money' },
        { header: 'Integrada (fecha)', key: 'integrada_en', width: 16, fmt: 'date' },
        { header: 'Integró', key: 'integrada_por', width: 24, fmt: 'text' },
        { header: 'Presentada (fecha)', key: 'presentada_en', width: 16, fmt: 'date' }
      ],
      filas,
      totales: { label: 'TOTALES', labelKey: 'estim', sumKeys: ['subtotal', 'neto'] }
    }],
    notas: ['Incluye las estimaciones rechazadas para trazabilidad. Una estimación rechazada no se borra: se vuelve a integrar (HU-12) y a presentar (HU-13) como una versión nueva vinculada.']
  });
}

// ---------------------------------------------------------------------------
// 4) Listado de observaciones de la revisión técnica (Excel) — HU-15. FIX 2.2: fuente a nivel contrato vía
//    GET /api/observaciones/contrato/:id (estimacion_observaciones de todas las estimaciones del contrato).
// ---------------------------------------------------------------------------
const SECCION_OBS_LBL = { caratula: 'Carátula', generadores: 'Generadores', fotos: 'Fotos', soportes: 'Soportes', notas: 'Notas' };
const TIPO_OBS_LBL = { aclaracion: 'Aclaración', correccion: 'Corrección', rechazo: 'Rechazo' };
function observacionesExcel(d, contrato, periodo) {
  const lista = d.observaciones?.observaciones || [];
  const win = ventanaPeriodo(lista.map((o) => o.created_at), periodo);
  // SIN columna de severidad (el profe la eliminó): toda observación equivale a un rechazo.
  const filas = lista
    .filter((o) => enVentana(o.created_at, win))
    .map((o) => ({
      estim: `EST-${String(o.estimacion_numero).padStart(3, '0')}`,
      seccion: SECCION_OBS_LBL[o.seccion] || o.seccion,
      tipo: TIPO_OBS_LBL[o.tipo] || o.tipo,
      turnado_a: o.turnado_a || '',
      autor: o.autor_nombre || '',
      fecha: dISO(o.created_at),
      descripcion: o.descripcion || ''
    }));
  return descargarExcelReporte(`${baseName(4, 'observaciones', periodo)}.xlsx`, {
    hojaNombre: 'Observaciones',
    titulo: 'Reporte 4 · Observaciones de la revisión técnica',
    generado: stamp(),
    contrato: { folio: contrato?.folio, contratista: contrato?.contratista, periodo },
    tablas: [{
      columnas: [
        { header: 'Estim.', key: 'estim', width: 12, fmt: 'text' },
        { header: 'Sección', key: 'seccion', width: 16, fmt: 'text' },
        { header: 'Tipo', key: 'tipo', width: 16, fmt: 'text' },
        { header: 'Turnado a', key: 'turnado_a', width: 18, fmt: 'text' },
        { header: 'Autor', key: 'autor', width: 24, fmt: 'text' },
        { header: 'Fecha', key: 'fecha', width: 14, fmt: 'date' },
        { header: 'Descripción', key: 'descripcion', width: 50, fmt: 'text' }
      ],
      filas
    }],
    notas: ['Sin columna de severidad: toda observación de la revisión técnica equivale a un rechazo de la estimación (HU-15).']
  });
}

// ---------------------------------------------------------------------------
// 5) Bitácora completa — el PDF se generó antes con jsPDF crudo; REDISEÑO 24-jun: ahora es un DOCUMENTO
//    imprimible (components/reportes/DocumentoBitacora.jsx, patrón window.print), por eso
//    HANDLERS[5].PDF = 'modal' (la página abre el documento con las notas reales del contrato).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 6) Histórico de modificatorios (Excel) — convenios reales (art. 59 / 59 Bis LOPSRM).
// ---------------------------------------------------------------------------
function modificatoriosExcel(d, contrato, periodo) {
  const filas = (d.convenios?.convenios || []).map((v) => ({
    numero: v.numero,
    tipo: v.tipo,
    fecha: dISO(v.fecha),
    monto_ant: v.monto_anterior == null ? null : Number(v.monto_anterior),
    monto_nuevo: v.monto_nuevo == null ? null : Number(v.monto_nuevo),
    delta_pct: v.delta_monto_pct == null ? null : Number(v.delta_monto_pct),
    plazo_ant: v.plazo_anterior_dias ?? null,
    plazo_nuevo: v.plazo_nuevo_dias ?? null,
    rev_sfp: v.requiere_revision_sfp ? 'Sí' : 'No'
  }));
  return descargarExcelReporte(`${baseName(6, 'modificatorios', periodo)}.xlsx`, {
    hojaNombre: 'Modificatorios',
    titulo: 'Reporte 6 · Histórico de modificatorios',
    generado: stamp(),
    contrato: { folio: contrato?.folio, contratista: contrato?.contratista, periodo },
    tablas: [{
      columnas: [
        { header: 'N.º', key: 'numero', width: 8, fmt: 'int' },
        { header: 'Tipo', key: 'tipo', width: 18, fmt: 'text' },
        { header: 'Fecha', key: 'fecha', width: 14, fmt: 'date' },
        { header: 'Monto ant.', key: 'monto_ant', width: 16, fmt: 'money' },
        { header: 'Monto nuevo', key: 'monto_nuevo', width: 16, fmt: 'money' },
        { header: 'Δ Monto %', key: 'delta_pct', width: 12, fmt: 'pct' },
        { header: 'Plazo ant. (d)', key: 'plazo_ant', width: 13, fmt: 'int' },
        { header: 'Plazo nuevo (d)', key: 'plazo_nuevo', width: 13, fmt: 'int' },
        { header: 'Rev. SFP (art. 102)', key: 'rev_sfp', width: 16, fmt: 'text' }
      ],
      filas
    }],
    notas: [
      'Los conceptos ORIGINALES del contrato quedan congelados; los conceptos ADICIONALES de un convenio se administran por separado (art. 101 RLOPSRM).',
      'Rev. SFP = "Sí" cuando la variación supera el 25% (art. 102 RLOPSRM).'
    ]
  });
}

// ---------------------------------------------------------------------------
// 7) Penalizaciones y deductivas (Excel). Distingue TRES conceptos que NO son lo mismo:
//    · PENA POR ATRASO (art. 46 Bis LOPSRM + arts. 86–88 RLOPSRM): DERIVADA de la carátula (el historial no expone
//      `retencion_atraso`); ver penaAtrasoDerivada. Fundamento resuelto: art. 46 Bis LOPSRM (pena por
//      atraso) + arts. 86–88 RLOPSRM (mecánica de cálculo) + art. 90 RLOPSRM (tope).
//    · RETENCIÓN 5 AL MILLAR (art. 191 LFD): retención FISCAL, NO es una pena. `e.retencion`.
//    · DEDUCTIVAS (art. 46/46 Bis): retenciones económicas / penas convencionales registradas.
//    + Pena convencional % pactada del contrato (preparacionEstimacion).
// ---------------------------------------------------------------------------
function penalizacionesExcel(d, contrato, periodo) {
  const penaPct = d.prep?.contrato?.pena_convencional_pct;
  const filas = (d.historial || []).map((e) => ({
    estim: `EST-${String(e.numero).padStart(3, '0')}`,
    periodo: rangoPeriodo(e.periodo_inicio, e.periodo_fin),
    ret_atraso: penaAtrasoDerivada(e),
    cinco_millar: Number(e.retencion) || 0,
    deductivas: Number(e.deductivas) || 0,
    pena_conv: penaPct == null ? 'No pactada' : Number(penaPct)
  }));
  return descargarExcelReporte(`${baseName(7, 'penalizaciones', periodo)}.xlsx`, {
    hojaNombre: 'Penalizaciones',
    titulo: 'Reporte 7 · Penalizaciones y deductivas',
    generado: stamp(),
    contrato: { folio: contrato?.folio, contratista: contrato?.contratista, periodo },
    tablas: [{
      columnas: [
        { header: 'Estim.', key: 'estim', width: 12, fmt: 'text' },
        { header: 'Periodo', key: 'periodo', width: 26, fmt: 'text' },
        { header: 'Ret. por atraso (art. 46 Bis LOPSRM)', key: 'ret_atraso', width: 20, fmt: 'money' },
        { header: '5 al millar (art. 191 LFD)', key: 'cinco_millar', width: 18, fmt: 'money' },
        { header: 'Deductivas', key: 'deductivas', width: 14, fmt: 'money' },
        { header: 'Pena conv. % (contrato)', key: 'pena_conv', width: 16, fmt: 'pct' }
      ],
      filas,
      totales: { label: 'TOTALES', labelKey: 'estim', sumKeys: ['ret_atraso', 'cinco_millar', 'deductivas'] }
    }],
    notas: ['Pena por atraso DERIVADA de la carátula (art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM, tope art. 90 RLOPSRM). El 5 al millar (art. 191 LFD) es retención fiscal, no una pena. La pena convencional % es la pactada en el contrato (igual para todas las estimaciones).']
  });
}

// ---------------------------------------------------------------------------
// Catálogo de reportes + mapa de handlers por formato.
// `disponible: false` => fila visible pero export deshabilitado (no se inventa fuente).
// `requiereBitacora` => se deshabilita si el contrato no tiene bitácora aperturada.
// ---------------------------------------------------------------------------
export const CATALOGO_REPORTES = [
  { id: 1, slug: 'avance-fisico', nombre: 'Avance físico vs programado', descripcion: 'Curva S + concepto × periodo (programa, trabajos y pagos reales).', formatos: ['PDF'], disponible: true }, // H11 (25-jun): solo PDF (se quitó el Excel a pedido del equipo)
  { id: 2, slug: 'avance-financiero', nombre: 'Avance financiero', descripcion: 'Por estimación: subtotal, amortización, retención, deductivas, pena por atraso y neto + pagado acumulado.', formatos: ['Excel'], disponible: true },
  { id: 3, slug: 'estimaciones', nombre: 'Listado de estimaciones', descripcion: 'Una fila por estimación con estado, periodo, importes y sellos de integración/presentación.', formatos: ['Excel'], disponible: true },
  { id: 4, slug: 'observaciones', nombre: 'Listado de observaciones', descripcion: 'Observaciones de la revisión técnica (HU-15): estimación, sección, tipo, estado, turnado, autor y fecha.', formatos: ['Excel'], disponible: true },
  { id: 5, slug: 'bitacora', nombre: 'Bitácora completa', descripcion: 'Notas cronológicas con folio, fecha, tipo, emisor y firmas.', formatos: ['PDF'], disponible: true, requiereBitacora: true },
  { id: 6, slug: 'modificatorios', nombre: 'Histórico de modificatorios', descripcion: 'Convenios del contrato (art. 59 / 59 Bis LOPSRM) con deltas de monto y plazo.', formatos: ['Excel'], disponible: true },
  { id: 7, slug: 'penalizaciones', nombre: 'Penalizaciones y deductivas', descripcion: 'Pena por atraso (derivada, art. 46 Bis LOPSRM + 86-88 RLOPSRM), 5 al millar fiscal (art.191 LFD), deductivas y pena % pactada.', formatos: ['Excel'], disponible: true }
];

export const PERIODOS_REPORTE = ['Mensual', 'Trimestral', 'Acumulado'];

// PDF de R1 y R5 = 'modal': la página (ExportacionReportes) abre un DOCUMENTO imprimible (patrón window.print
// de la carátula), no un jsPDF crudo. Los Excel siguen siendo funciones generadoras.
export const HANDLERS = {
  1: { PDF: 'modal', Excel: avanceFisicoExcel },
  2: { Excel: avanceFinancieroExcel },
  3: { Excel: estimacionesExcel },
  4: { Excel: observacionesExcel },
  5: { PDF: 'modal' },
  6: { Excel: modificatoriosExcel },
  7: { Excel: penalizacionesExcel }
};
