// LENTE DE SIMULACIÓN DE FECHA (solo lectura, frontend). Guarda una fecha de referencia YYYY-MM-DD en
// localStorage para "ver" el sistema desde una fecha distinta a la real (probar alertas de atraso,
// vencimientos de notas/plazos, semáforos). null = usa la fecha REAL del sistema (Date.now()).
//
// ⚠️ Es un LENTE DE LECTURA: solo cambia la fecha con la que el frontend PIDE y MUESTRA cálculos. NUNCA
// escribe fechas falsas en la BD; las operaciones de escritura viajan sin fecha_ref (ver services/api.js:
// el parámetro solo se agrega a peticiones GET). El backend usa NOW() real para toda escritura.
//
// Vive en un módulo plano (no en el contexto de React) para que services/api.js —que no puede usar
// hooks— y las páginas que calculan "hoy" en cliente (p. ej. CurvaAvance) lean el mismo valor. El
// contexto SimulacionFechaContext envuelve estas funciones para la pastilla de la barra superior.

export const LS_FECHA_SIM = 'sigecop:fechaSimulada';

// Hoy REAL del navegador como 'AAAA-MM-DD' (fecha local, sin arrastrar TZ del ISO UTC).
export function hoyRealISO() {
  const d = new Date();
  const z = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// La fecha SIMULADA vigente (string validado) o null si no hay simulación activa. Si el valor guardado
// coincide con hoy real, se considera "sin simulación" (null) para que el sistema se comporte idéntico.
export function getFechaSimulada() {
  try {
    const v = localStorage.getItem(LS_FECHA_SIM);
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    return v === hoyRealISO() ? null : v;
  } catch {
    return null;
  }
}

// ¿Hay simulación activa? (fecha guardada distinta de hoy real).
export function estaSimulando() {
  return getFechaSimulada() != null;
}

// La fecha de referencia EFECTIVA que el frontend usa como "hoy": simulada si la hay, real si no.
export function getFechaRef() {
  return getFechaSimulada() || hoyRealISO();
}

// "Ahora" en milisegundos respetando la simulación — para restas de DÍAS transcurridos desde un sello
// (semáforos de plazo art. 54: envío, presentación, revisión). Si hay fecha simulada, devuelve el
// instante actual TRASLADADO a la fecha simulada (conserva la hora del reloj para que la resta de días
// sea estable, igual que Date.now()); si no, Date.now() real. SOLO LECTURA: no persiste nada.
export function ahoraRefMs() {
  const sim = getFechaSimulada();
  if (!sim) return Date.now();
  const [y, m, d] = sim.split('-').map(Number);
  const ahora = new Date();
  ahora.setFullYear(y, m - 1, d);
  return ahora.getTime();
}

// Fija la fecha simulada. iso === hoy real (o vacío/ inválido) => borra la simulación (vuelve a hoy real).
export function setFechaSimulada(iso) {
  try {
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso !== hoyRealISO()) {
      localStorage.setItem(LS_FECHA_SIM, iso);
    } else {
      localStorage.removeItem(LS_FECHA_SIM);
    }
  } catch {
    /* noop */
  }
}

// Suma `meses` (puede ser negativo) a una fecha 'AAAA-MM-DD' y devuelve 'AAAA-MM-DD'. Sirve para
// "periodo anterior / siguiente" (los periodos de estimación son mensuales, art. 54 LOPSRM). Ajusta
// el día al último día del mes destino si el original no existe (p. ej. 31 -> 28/30).
export function sumarMeses(iso, meses) {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso : hoyRealISO();
  const [y, m, d] = base.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + meses;
  const ny = Math.floor(total / 12);
  const nm = total % 12; // 0-11
  const ultimoDia = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const nd = Math.min(d, ultimoDia);
  const z = (x) => String(x).padStart(2, '0');
  return `${ny}-${z(nm + 1)}-${z(nd)}`;
}
