// Verificación BRUTE-FORCE del algoritmo de periodos de A2 (lib/programa.js).
// No toca la BD: solo ejercita generarPeriodos sobre miles de (fecha, plazo, ciclo) y
// asegura las invariantes de un mosaico de periodos válido para estimación (art. 54):
//   1) no vacío;           2) primer periodo arranca en fecha de inicio;
//   3) último termina en la fecha de término (inicio + plazo - 1);
//   4) contiguo (cada periodo arranca el día siguiente al fin del anterior) → sin huecos ni solapes;
//   5) inicio <= fin en cada periodo;
//   6) periodo_fin <= masUnMes(periodo_inicio)  → cada periodo es estimable (art. 54).
// Uso:  docker exec sigecop_backend node scripts/verificar-periodos.js
const { generarPeriodos, masUnMes, addDias, derivarTermino } = require('../src/lib/programa');

let casos = 0, fallos = 0;
const err = (msg) => { fallos++; if (fallos <= 20) console.error('  ✗', msg); };

function verifica(fechaInicio, plazo, ciclo) {
  casos++;
  const ps = generarPeriodos(fechaInicio, plazo, ciclo);
  const termino = derivarTermino(fechaInicio, plazo);
  const ctx = `(${fechaInicio}, plazo ${plazo}, ${ciclo})`;
  if (ps.length === 0) return err(`${ctx}: 0 periodos`);
  if (ps[0].inicio !== fechaInicio) err(`${ctx}: primer inicio ${ps[0].inicio} != ${fechaInicio}`);
  if (ps[ps.length - 1].fin !== termino) err(`${ctx}: último fin ${ps[ps.length - 1].fin} != término ${termino}`);
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (p.numero !== i + 1) err(`${ctx}: numero ${p.numero} != ${i + 1}`);
    if (p.inicio > p.fin) err(`${ctx} p${p.numero}: inicio ${p.inicio} > fin ${p.fin}`);
    if (p.fin > masUnMes(p.inicio)) err(`${ctx} p${p.numero}: fin ${p.fin} > masUnMes(${p.inicio})=${masUnMes(p.inicio)} (viola art. 54)`);
    if (i > 0 && p.inicio !== addDias(ps[i - 1].fin, 1)) err(`${ctx} p${p.numero}: no contiguo (${ps[i - 1].fin} -> ${p.inicio})`);
  }
}

// Barrido: cada día de un año NO bisiesto (2027) y uno bisiesto (2028) × plazos
// representativos (incluye 1, cruces de quincena/mes, año, fin de mes) × ambos ciclos.
const plazos = [1, 2, 14, 15, 16, 28, 29, 30, 31, 32, 45, 60, 90, 180, 181, 365, 366, 400];
for (const año of [2027, 2028]) {
  for (let mes = 1; mes <= 12; mes++) {
    const ultimo = new Date(Date.UTC(año, mes, 0)).getUTCDate();
    for (let dia = 1; dia <= ultimo; dia++) {
      const f = `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      for (const pl of plazos) { verifica(f, pl, 'mensual'); verifica(f, pl, 'quincenal'); }
    }
  }
}
// Casos borde explícitos (fin de mes, bisiesto, cruce de año).
for (const f of ['2028-01-31', '2028-02-29', '2027-02-28', '2026-12-31', '2026-11-30']) {
  for (const pl of [30, 31, 60, 365]) { verifica(f, pl, 'mensual'); verifica(f, pl, 'quincenal'); }
}

// Ejemplo del profesor: contrato de 12 meses → 12 columnas (mensual).
const docena = generarPeriodos('2026-01-01', 365, 'mensual');
if (docena.length !== 12) err(`ejemplo profe: 365 días mensual dio ${docena.length} periodos, esperaba 12`);

console.log(`\nperiodos: ${casos} casos verificados, ${fallos} fallos.`);
console.log(`muestra 2026-01-01 plazo 365 mensual → ${docena.length} periodos: ${docena.map((p) => p.numero).join(',')}`);
console.log(`  p1 ${docena[0].inicio}..${docena[0].fin} | p12 ${docena[11].inicio}..${docena[11].fin}`);
process.exit(fallos === 0 ? 0 : 1);
