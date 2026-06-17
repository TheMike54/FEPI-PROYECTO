// Umbrales del semáforo (HU-18 portafolio / HU-20 tránsito a pago) — CRITERIO DEL EQUIPO.
//
// Defaults PROVISIONALES acordados por el equipo. NO hay fundamento legal del número exacto: los puntos
// de corte son interpretativos (Nivel 1). Siguen siendo CONFIGURABLES si el profe pide otros valores;
// se centralizan aquí para ajustarlos en UN SOLO punto. Archivo nuevo (fuera de la zona congelada).
//
// Las dos dimensiones del semáforo:
//   1) Avance ejecutado vs programado (% de cumplimiento): VERDE ≥ 95% · ÁMBAR 85-95% · ROJO < 85%.
//      El portafolio lo evalúa como DESVIACIÓN (programado% − físico%, en puntos): una desviación ≤ 5pp
//      equivale a ≥ 95% de cumplimiento; 5-15pp a 85-95%; > 15pp a < 85%.
//   2) Plazo en días VENCIDOS (días pasados de la fecha límite legal): VERDE 0 · ÁMBAR 1-10 · ROJO > 10.

module.exports = {
  // Avance vs programado — umbrales en % de cumplimiento (referencia legible).
  AVANCE_VS_PROGRAMADO_PCT: { verde_min: 95, ambar_min: 85 },
  // Avance vs programado — espejo en DESVIACIÓN (puntos porcentuales): 100 − umbral. Es lo que consume
  // el portafolio (desviacion = programado% − físico%).
  DESVIACION_PP: { ok: 5, alerta: 15 },
  // Plazo en días VENCIDOS: 0 VERDE · 1-10 ÁMBAR · > 10 ROJO.
  PLAZO_DIAS_VENCIDOS: { verde_max: 0, ambar_max: 10 },
};
