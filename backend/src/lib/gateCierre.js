// backend/src/lib/gateCierre.js — Gate de cierre transversal (art. 64 LOPSRM / 170 RLOPSRM).
// Un contrato 'cerrado' (finiquito elaborado) es SOLO-LECTURA: el art. 64 último párrafo declara
// "extinguidos los derechos y obligaciones asumidos por ambas partes en el contrato"; por eso no se
// admiten actos NUEVOS (nota, minuta, visita, avance, convenio, garantía, endoso, sustitución de roster).
// Lo generado ANTES del cierre queda inmutable por sus propios triggers; el saldo se liquida por el finiquito.
//
// PREDICADO (NO lanza): devuelve true si el contrato está cerrado. Cada caller decide ROLLBACK (si está en
// una transacción) + 409 — así sale un 409 limpio (un throw caería en el catch de cada endpoint → 500).
// Mismo espíritu que estimaciones-ciclo.controller::gateContratoCerrado, generalizado a cualquier dominio.
// `db` admite el `pool` (endpoints sin transacción) o el `client` de una transacción.
//
// NOTA (#2, 25-jun): el pago SÍ aplica este gate. Antes existía una "EXCEPCIÓN" (pagar una estimación
// AUTORIZADA post-cierre) cuya premisa ("el finiquito ya la descuenta") es FALSA: el finiquito suma el
// neto de la estimación al saldo pero NO la marca pagada ni impide pagarla luego → doble liquidación
// (art. 64 LOPSRM). registrarPago ahora llama contratoCerrado() y devuelve 409.

async function contratoCerrado(db, contratoId) {
  const r = await db.query('SELECT estado FROM contratos WHERE id = $1', [contratoId]);
  return r.rowCount > 0 && r.rows[0].estado === 'cerrado';
}

function msgCerrado(accion) {
  return `El contrato ya está cerrado (finiquito elaborado); ${accion}. El saldo se liquida por el finiquito (art. 64 LOPSRM).`;
}

module.exports = { contratoCerrado, msgCerrado };
