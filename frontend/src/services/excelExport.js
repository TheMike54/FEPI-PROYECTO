// Helper de exportación a .xlsx con exceljs (sustituye a la dependencia xlsx /
// SheetJS, que carga vulnerabilidades sin parche). Mantiene la misma salida
// "json → tabla" que producía XLSX.utils.json_to_sheet: encabezados tomados
// de las claves del primer objeto, filas en el mismo orden.

import ExcelJS from 'exceljs';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function disparaDescarga(buffer, filename) {
  const blob = new Blob([buffer], { type: MIME_XLSX });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // El revoke no puede ser síncrono inmediato en algunos browsers; un timeout
  // pequeño deja que el navegador procese el click antes de invalidar la URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function llenarHoja(ws, filas) {
  if (!filas || filas.length === 0) return;
  ws.columns = Object.keys(filas[0]).map((k) => ({ header: k, key: k }));
  ws.addRows(filas);
}

// Descarga un .xlsx de una sola hoja a partir de un array de objetos planos.
// Equivalente directo de: XLSX.utils.json_to_sheet(filas) + writeFile.
export async function descargarExcelHoja(filename, nombreHoja, filas) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(nombreHoja);
  llenarHoja(ws, filas);
  const buffer = await wb.xlsx.writeBuffer();
  disparaDescarga(buffer, filename);
}

// Descarga un .xlsx con múltiples hojas. hojas = [{ nombre, filas }].
export async function descargarExcelMultihoja(filename, hojas) {
  const wb = new ExcelJS.Workbook();
  for (const h of hojas) {
    const ws = wb.addWorksheet(h.nombre);
    llenarHoja(ws, h.filas);
  }
  const buffer = await wb.xlsx.writeBuffer();
  disparaDescarga(buffer, filename);
}

// ───────────────────────────────────────────────────────────────────────────
// REDISEÑO 24-jun (Maiki) — EXCEL CON DISEÑO (no volcado crudo). Patrón reutilizable para los reportes
// HU-19 en Excel (R2/R3/R4/R6/R7): título guinda, meta del contrato, encabezado guinda/blanco, formato de
// moneda/%, fila de TOTALES en negrita, bloque de métricas (acento dorado), anchos y bordes. Colores SIGECOP:
// guinda #691C32, dorado #BC955C. NO inventa datos: las filas/métricas se las pasa el generador del reporte;
// si vienen vacías, la tabla sale con encabezados y un "Sin datos." (nunca relleno ficticio).
const GUINDA = 'FF691C32';
const DORADO = 'FFBC955C';
const GUINDA_SOFT = 'FFF3E9EC';
const BORDE = 'FFD8D2CB';
const NUMFMT = { money: '"$"#,##0.00', money0: '"$"#,##0', pct: '0.0"%"', int: '#,##0', qty: '#,##0.###' };
const bordeFino = () => ({
  top: { style: 'thin', color: { argb: BORDE } }, left: { style: 'thin', color: { argb: BORDE } },
  bottom: { style: 'thin', color: { argb: BORDE } }, right: { style: 'thin', color: { argb: BORDE } }
});
const esNumerica = (fmt) => fmt && fmt !== 'text' && fmt !== 'date';
const aplicaFmt = (cell, fmt) => { if (fmt && NUMFMT[fmt]) cell.numFmt = NUMFMT[fmt]; };

// spec = {
//   hojaNombre, titulo, generado,
//   contrato: { folio, contratista, periodo },
//   tablas: [{ titulo?, columnas:[{header,key,width,fmt}], filas:[...], totales?:{label,labelKey,sumKeys:[]} }],
//   metricas?: [{ label, valor, fmt }]
// }
export async function descargarExcelReporte(filename, spec) {
  const wb = construirWorkbookReporte(spec);
  const buffer = await wb.xlsx.writeBuffer();
  disparaDescarga(buffer, filename);
}

// Construye el Workbook con diseño (puro, sin APIs de navegador → testeable en Node). La descarga vive en
// descargarExcelReporte; separarlas permite verificar el xlsx generado fuera del browser.
export function construirWorkbookReporte(spec) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIGECOP';
  const ws = wb.addWorksheet(spec.hojaNombre || 'Reporte', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } }
  });
  const columnas = spec.tablas?.[0]?.columnas || [{ width: 18 }];
  const nCols = Math.max(1, columnas.length);

  // Título (banda guinda merged).
  const titleRow = ws.addRow([spec.titulo || 'Reporte SIGECOP']);
  ws.mergeCells(titleRow.number, 1, titleRow.number, nCols);
  const tcell = titleRow.getCell(1);
  tcell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  tcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GUINDA } };
  tcell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  titleRow.height = 26;

  // Meta del contrato.
  if (spec.contrato) {
    const m1 = ws.addRow([`Contrato: ${spec.contrato.folio || '—'}${spec.contrato.contratista ? ' · ' + spec.contrato.contratista : ''}`]);
    ws.mergeCells(m1.number, 1, m1.number, nCols);
    m1.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF555555' } };
    const m2 = ws.addRow([`Periodo: ${spec.contrato.periodo || '—'}${spec.generado ? ' · Generado: ' + spec.generado : ''} · Importes sin IVA (art. 2 fr. XIX RLOPSRM)`]);
    ws.mergeCells(m2.number, 1, m2.number, nCols);
    m2.getCell(1).font = { size: 9, color: { argb: 'FF888888' } };
  }
  ws.addRow([]);

  for (const tabla of (spec.tablas || [])) {
    const cols = tabla.columnas;
    if (tabla.titulo) {
      const trow = ws.addRow([tabla.titulo]);
      ws.mergeCells(trow.number, 1, trow.number, cols.length);
      trow.getCell(1).font = { bold: true, size: 11, color: { argb: GUINDA } };
    }
    // Encabezado guinda/blanco.
    const headerRow = ws.addRow(cols.map((c) => c.header));
    for (let i = 1; i <= cols.length; i++) {
      const cell = headerRow.getCell(i);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GUINDA } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: esNumerica(cols[i - 1].fmt) ? 'right' : 'left', wrapText: true };
      cell.border = bordeFino();
    }
    headerRow.height = 24;
    // Filas.
    for (const fila of tabla.filas) {
      const row = ws.addRow(cols.map((c) => (fila[c.key] === undefined ? null : fila[c.key])));
      for (let i = 1; i <= cols.length; i++) {
        const c = cols[i - 1];
        const cell = row.getCell(i);
        aplicaFmt(cell, c.fmt);
        cell.alignment = { horizontal: esNumerica(c.fmt) ? 'right' : 'left' };
        cell.border = bordeFino();
      }
    }
    if (tabla.filas.length === 0) {
      const row = ws.addRow(['Sin datos.']);
      ws.mergeCells(row.number, 1, row.number, cols.length);
      row.getCell(1).font = { italic: true, color: { argb: 'FF999999' } };
      row.getCell(1).border = bordeFino();
    }
    // Fila de TOTALES.
    if (tabla.totales && tabla.filas.length) {
      const labelKey = tabla.totales.labelKey || cols[0].key;
      const sumKeys = tabla.totales.sumKeys || [];
      const vals = cols.map((c) => {
        if (c.key === labelKey) return tabla.totales.label || 'TOTALES';
        if (sumKeys.includes(c.key)) return tabla.filas.reduce((s, f) => s + (Number(f[c.key]) || 0), 0);
        return null;
      });
      const row = ws.addRow(vals);
      for (let i = 1; i <= cols.length; i++) {
        const c = cols[i - 1];
        const cell = row.getCell(i);
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GUINDA_SOFT } };
        aplicaFmt(cell, c.fmt);
        cell.alignment = { horizontal: esNumerica(c.fmt) ? 'right' : 'left' };
        cell.border = bordeFino();
      }
    }
    ws.addRow([]);
  }

  // Bloque de métricas (acento dorado): label merged 1..nCols-1, valor en la última columna.
  if (spec.metricas?.length) {
    const valCol = Math.max(2, nCols);
    const h = ws.addRow(['Resumen']);
    ws.mergeCells(h.number, 1, h.number, valCol);
    h.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DORADO } };
    h.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    h.getCell(1).alignment = { indent: 1 };
    for (const m of spec.metricas) {
      const row = ws.addRow([]);
      if (valCol > 1) ws.mergeCells(row.number, 1, row.number, valCol - 1);
      const lcell = row.getCell(1);
      lcell.value = m.label;
      lcell.alignment = { horizontal: 'left' };
      lcell.border = bordeFino();
      const vcell = row.getCell(valCol);
      vcell.value = m.valor;
      aplicaFmt(vcell, m.fmt);
      vcell.font = { bold: true };
      vcell.alignment = { horizontal: 'right' };
      vcell.border = bordeFino();
    }
  }

  // Notas al pie (cursiva gris), una por renglón, fusionadas a lo ancho.
  if (spec.notas?.length) {
    ws.addRow([]);
    for (const n of spec.notas) {
      const row = ws.addRow([n]);
      ws.mergeCells(row.number, 1, row.number, nCols);
      row.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF888888' } };
      row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    }
  }

  // Anchos (de la primera tabla).
  columnas.forEach((c, i) => { ws.getColumn(i + 1).width = c.width || 16; });

  return wb;
}
