// LENTE DE LECTURA (fecha de simulación) — fecha de referencia OPCIONAL para CÁLCULOS de LECTURA
// (atrasos, vencimientos de plazos, semáforos, días en estado, vigencia de fianzas). Se lee de
// ?fecha_ref=YYYY-MM-DD y SOLO se usa en handlers GET de lectura.
//
// ⚠️ REGLA DE SEGURIDAD (no negociable): esto NUNCA se escribe en la BD ni sella registros. Las
// ESCRITURAS (crear nota, integrar/enviar estimación, registrar avance, firmar, pagar, autorizar…)
// SIEMPRE usan la fecha REAL del servidor (NOW()/CURRENT_DATE); jamás reciben fecha_ref. El patrón de
// uso es: los helpers de cálculo aceptan `fechaRef = null` (null → hoy real via COALESCE) y SOLO los
// handlers GET de lectura pasan `fechaRefDe(req)`. Un handler de escritura no llama a fechaRefDe.
//
// Validación estricta anti-basura/anti-inyección: solo se acepta una fecha calendario real en formato
// YYYY-MM-DD; cualquier otra cosa devuelve null → se cae a la fecha real del servidor (comportamiento
// normal, sin cambios). El string ya validado es seguro para pasar como parámetro `$N::date`.
function fechaRefDe(req) {
  const raw = req && req.query ? req.query.fecha_ref : null;
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Verifica que sea un día calendario real (rechaza 2026-02-30, 2026-13-01, etc.).
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return raw;
}

module.exports = { fechaRefDe };
