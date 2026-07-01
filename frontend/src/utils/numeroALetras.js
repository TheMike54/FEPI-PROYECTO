// Número a letras en español (MAYÚSCULAS), para los "importes con letra" de los documentos oficiales de
// estimación (formato GACM, art. 132 RLOPSRM). Ej.: 2467304.16 →
// "DOS MILLONES CUATROCIENTOS SESENTA Y SIETE MIL TRESCIENTOS CUATRO PESOS 16/100 M.N."
// Cubre 0 … 999,999,999,999.99 con apócope correcta ("UN"/"VEINTIÚN" antes de MIL/MILLONES).
// No inventa nada: es una conversión determinista del monto que ya viene calculado del backend.

const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const ESPECIALES = {
  10: 'DIEZ', 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
  16: 'DIECISÉIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
  20: 'VEINTE', 21: 'VEINTIUNO', 22: 'VEINTIDÓS', 23: 'VEINTITRÉS', 24: 'VEINTICUATRO',
  25: 'VEINTICINCO', 26: 'VEINTISÉIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE',
};
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

// 0..99. apoc = true cuando el grupo multiplica a MIL/MILLONES ("VEINTIÚN MIL", "UN MILLÓN").
function decenasAletras(n, apoc) {
  if (n < 10) return apoc && n === 1 ? 'UN' : UNIDADES[n];
  if (n <= 29) return apoc && n === 21 ? 'VEINTIÚN' : ESPECIALES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return DECENAS[d];
  return `${DECENAS[d]} Y ${apoc && u === 1 ? 'UN' : UNIDADES[u]}`;
}

// 0..999.
function centenasAletras(n, apoc) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const cen = c > 0 ? CENTENAS[c] : '';
  const res = r > 0 ? decenasAletras(r, apoc) : '';
  return cen && res ? `${cen} ${res}` : cen || res;
}

// 0..999,999,999,999 (recursivo por millones). apoc afecta SOLO al grupo de unidades final.
function grupoAletras(n, apoc) {
  if (n < 1000) return centenasAletras(n, apoc);
  if (n < 1_000_000) {
    const miles = Math.floor(n / 1000);
    const r = n % 1000;
    const milesTxt = miles === 1 ? 'MIL' : `${centenasAletras(miles, true)} MIL`;
    return r > 0 ? `${milesTxt} ${centenasAletras(r, apoc)}` : milesTxt;
  }
  const millones = Math.floor(n / 1_000_000);
  const r = n % 1_000_000;
  const millTxt = millones === 1 ? 'UN MILLÓN' : `${grupoAletras(millones, true)} MILLONES`;
  return r > 0 ? `${millTxt} ${grupoAletras(r, apoc)}` : millTxt;
}

// Devuelve solo la parte en letras del ENTERO (sin moneda), p.ej. "DOS MILLONES … TRESCIENTOS CUATRO".
export function enteroALetras(monto) {
  const entero = Math.floor(Math.abs(Number(monto) || 0));
  if (entero === 0) return 'CERO';
  return grupoAletras(entero, false).trim();
}

// Importe con letra completo para documentos: "<letras> PESOS NN/100 M.N.".
export function numeroALetras(monto, unidad = 'PESOS') {
  const n = Math.abs(Number(monto) || 0);
  const entero = Math.floor(n);
  const centavos = Math.round((n - entero) * 100);
  const cc = String(Math.min(99, centavos)).padStart(2, '0');
  // apoc=true en el grupo final: apócope antes del sustantivo "PESOS" ("… TREINTA Y UN PESOS").
  const letras = entero === 0 ? 'CERO' : grupoAletras(entero, true).trim();
  return `${letras} ${unidad} ${cc}/100 M.N.`;
}

export default numeroALetras;
