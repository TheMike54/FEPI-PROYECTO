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
