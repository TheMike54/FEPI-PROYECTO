// Utilidades de formato COMPARTIDAS. Extraídas de las páginas para DRY (Fase 5, limpieza de
// mantenibilidad) SIN cambiar la salida: `fmtMXN` y `monedaMXN` son byte-idénticos a las copias locales
// que tenían EnvioEstimacion / HistorialEstimaciones / IntegracionEstimacion / RevisionEstimacion /
// EditorProgramaConvenio. Mismo Intl.NumberFormat (es-MX, MXN, 2 decimales) → mismo string formateado.
//
// OJO: NO unifica TODAS las monedas del proyecto. Otras páginas usan formatos DISTINTOS a propósito
// (TableroEstimaciones/TransitoPago: `$ ` + en-US con espacio; ConveniosModificatorios: guard '—' para
// null). Esos NO se tocan aquí porque cambiarían la salida que la suite asercióna.

export const fmtMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Formatea un número a moneda MXN con 2 decimales; null/undefined/no-numérico → "$0.00" (igual que las
// copias locales que hacían fmtMXN.format(Number(n) || 0)).
export const monedaMXN = (n) => fmtMXN.format(Number(n) || 0);

// Fecha + hora corta es-MX (estilo "dd/mm/aa hh:mm"); vacío si no hay valor. Byte-idéntico a las copias
// locales de AperturaBitacora / EmisionNotas / PorFirmar / BuscadorNotas (dateStyle/timeStyle 'short',
// fallback ''). OJO: NO cubre las variantes con otro fallback ('—') ni dateStyle 'long' (IntegracionEstimacion,
// DocumentoNota, etc.) — esas se dejan locales para no cambiar su salida.
export const fechaHora = (s) => (s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '');
