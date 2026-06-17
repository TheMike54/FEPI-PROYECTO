// Normalización de nombres de empresa — ESPEJO del backend (empresas.controller.js). Se usa en el
// registro para detectar si lo tecleado YA está en el catálogo y REUTILIZAR la existente en vez de
// crear un duplicado (el meollo que pidió el profe: "si ya existe, toma los datos que ya están").
// DEBE mantenerse idéntica a la del backend. [validar profe] las reglas exactas de normalización.

// DÉBIL: lower + trim + colapsa espacios (espejo del índice único funcional uq_empresas_nombre_norm).
export const normEmpresa = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

// FUERTE (FASE 3, revisión profe 15-jun): además funde ACENTOS, quita PUNTUACIÓN y recorta SUFIJOS
// de razón social ("SA de CV", "S.A. de C.V.", "S.A.B.", "S de RL", "SC", "SAS"…). Así "Talare",
// "Talaré", "TALARE S.A. de C.V." y "Talare, S.A." se reconocen como la MISMA empresa. Espejo EXACTO
// de normalizarNombreEmpresaFuerte del backend.
const SUFIJOS_RAZON_SOCIAL = [
  's a p i de c v', 'sapi de cv', 's a b de c v', 'sab de cv', 's de r l de c v', 's de rl de cv',
  'sa de cv', 's a de c v', 's a s', 'sas', 's de r l', 's de rl', 's a b', 'sab', 's c', 'sc',
  's a', 'sa', 's en c', 's en nc',
].sort((a, b) => b.length - a.length);

export const normEmpresaFuerte = (nombre) => {
  let s = String(nombre || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos/diacríticos
    .toLowerCase()
    .replace(/[.,;:()/"'`’]/g, ' ')                   // puntuación → espacio
    .replace(/&/g, ' y ')
    .replace(/\s+/g, ' ')
    .trim();
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const suf of SUFIJOS_RAZON_SOCIAL) {
      if (s === suf) { s = ''; cambio = true; break; }
      if (s.endsWith(' ' + suf)) { s = s.slice(0, -(suf.length + 1)).trim(); cambio = true; break; }
    }
  }
  return s;
};

// Busca en el catálogo una empresa cuya forma FUERTE coincida con `texto`. Devuelve la empresa
// existente (objeto {id, nombre}) o null. Sirve para avisar "se usará la empresa ya registrada".
export const empresaExistentePorNombre = (catalogo, texto) => {
  const f = normEmpresaFuerte(texto);
  if (!f) return null;
  return (Array.isArray(catalogo) ? catalogo : []).find((e) => normEmpresaFuerte(e.nombre) === f) || null;
};
