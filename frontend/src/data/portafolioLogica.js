// HU-18 — Lógica pura del semáforo del portafolio. Extraída aquí para poder
// importarla desde el spec E2E sin tener que pasar por la transformación JSX.
//
// Cada factor crudo aporta 0 (ok) / 1 (alerta) / 2 (grave). La suma decide:
//   total ≤ 1 → verde
//   total 2-3 → amarillo
//   total ≥ 4 → rojo

export function puntajeDesviacion(d) {
  if (d <= 5)  return 0;
  if (d <= 15) return 1;
  return 2;
}

export function puntajeDiasVencidos(v) {
  if (v <= 0)  return 0;
  if (v <= 10) return 1;
  return 2;
}

export function puntajePendientes(p) {
  if (p <= 0)  return 0;
  if (p <= 2)  return 1;
  return 2;
}

export function calcularSemaforo(factores) {
  const pAvance = puntajeDesviacion(factores.desviacionAvance);
  const pDias = puntajeDiasVencidos(factores.diasVencidos);
  const pPend = puntajePendientes(factores.pendientesSinAtender);
  const total = pAvance + pDias + pPend;
  let color;
  if (total <= 1)      color = 'verde';
  else if (total <= 3) color = 'amarillo';
  else                 color = 'rojo';
  return {
    color,
    total,
    desglose: [
      { factor: 'Avance vs programado', valor: `${factores.desviacionAvance} pp`, puntos: pAvance },
      { factor: 'Atrasos en plazos',    valor: `${factores.diasVencidos} d`,      puntos: pDias },
      { factor: 'Pendientes sin atender', valor: factores.pendientesSinAtender,   puntos: pPend }
    ]
  };
}
