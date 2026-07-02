// ESPEJO EXACTO de backend extenderPeriodosPorPlazo (convenios.controller.js) + lib/programa.js.
// Predice, en el cliente, los periodos que el backend AÑADIRÁ al final del programa cuando un convenio
// de PLAZO/MIXTO amplía el plazo (append-only). Sirve para pintar esas columnas futuras en el editor y
// dejar que el usuario reacomode volumen en ellas dentro del MISMO convenio. El backend es autoritativo:
// crea los periodos con la MISMA cadencia y numeración, así que las claves `rid:numero` cuadran.
//
// GUARDA DURA (lección del bug de los 1000 periodos): sin fechas ISO válidas NO se predice nada. `pg`
// devuelve DATE como objeto Date; aquí SIEMPRE recibimos strings ISO (detalle.fecha_inicio / periodo.fin
// vienen serializados como texto), pero validamos igual para no desbocar el bucle jamás.

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Suma un mes calendario respetando el último día del mes (UTC puro, sin corrimiento de zona).
function masUnMes(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  let ny = y, nm = m + 1; if (nm > 12) { nm = 1; ny += 1; }
  const ult = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, ult)).padStart(2, '0')}`;
}

// Suma/resta días a una fecha ISO sin corrimiento de zona horaria (UTC puro).
function addDias(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// El día de inicio cuenta como día 1: término = inicio + (plazo − 1).
function derivarTermino(inicioISO, plazoDias) { return addDias(inicioISO, Number(plazoDias) - 1); }

/**
 * Periodos que se AGREGARÍAN al final si el plazo pasa a `plazoNuevo` (mismo algoritmo que el backend).
 * @param {{numero:number, inicio:string, fin:string}[]} periodos  periodos VIGENTES del contrato
 * @param {string} fechaInicioISO  fecha de inicio del contrato (ISO)
 * @param {number} plazoNuevo      plazo nuevo en días
 * @returns {{numero:number, inicio:string, fin:string, esNuevo:true, esFuturo:true}[]}
 */
export function periodosAgregadosPorPlazo(periodos, fechaInicioISO, plazoNuevo) {
  const rows = (Array.isArray(periodos) ? periodos : [])
    .filter((p) => p && p.numero != null && p.inicio && p.fin)
    .slice().sort((a, b) => Number(a.numero) - Number(b.numero));
  if (rows.length === 0) return [];
  const maxNumero = Number(rows[rows.length - 1].numero);
  const lastFin = String(rows[rows.length - 1].fin).slice(0, 10);
  const ini0 = String(fechaInicioISO || '').slice(0, 10);
  const plz = Number(plazoNuevo);
  if (!ISO.test(ini0) || !ISO.test(lastFin) || !(plz > 0)) return [];
  const nuevoTermino = derivarTermino(ini0, plz);
  if (!ISO.test(nuevoTermino) || lastFin >= nuevoTermino) return []; // el término no avanzó → nada que añadir
  // Inferir la cadencia (mensual/quincenal) de un periodo NO recortado del mosaico vigente.
  let ciclo = 'mensual';
  for (const r of rows) {
    const i = String(r.inicio).slice(0, 10); const f = String(r.fin).slice(0, 10);
    if (addDias(masUnMes(i), -1) === f) { ciclo = 'mensual'; break; }
    if (addDias(i, 14) === f) { ciclo = 'quincenal'; break; }
  }
  // Extensión contigua (sin hueco): arranca el día siguiente al último fin vigente.
  let numero = maxNumero; let inicio = addDias(lastFin, 1); const out = []; const MAX = 1000;
  while (inicio <= nuevoTermino && out.length < MAX) {
    numero += 1;
    const corte = ciclo === 'mensual' ? masUnMes(inicio) : addDias(inicio, 15);
    let fin = addDias(corte, -1); if (fin > nuevoTermino) fin = nuevoTermino;
    out.push({ numero, inicio, fin, esNuevo: true, esFuturo: true });
    inicio = addDias(fin, 1);
  }
  return out;
}

export { masUnMes, addDias, derivarTermino };
