// Test de INTEGRACIÓN de A2 contra la BD real (transacción que se ROLLBACK-ea: no
// persiste nada). Ejercita guardarMatriz con las correcciones C1–C7 sobre el ejemplo
// del profesor (C1=800, C2=6000, C3=4000) y los 3 caminos críticos:
//   T1 cuadre OK            → guarda 800/6000/4000 repartidos en periodos (art. 118 cumplido).
//   T2 exceso (art. 118)    → Σ planeado > contratado debe lanzar PROGRAMA_EXCEDE.
//   T3 freeze (C1/C3)       → con una estimación NO rechazada, edición manual lanza
//                             PROGRAMA_CONGELADO; la misma con convenioId (enmienda art. 99) PASA.
// Uso:  docker exec sigecop_backend node scripts/test-programa-obra.js
const { pool } = require('../src/db/pool');
const { generarPeriodos, guardarMatriz, reconciliacion } = require('../src/lib/programa');

let ok = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { ok++; console.log('  ✓', msg); } else { fail++; console.error('  ✗', msg); } };
async function lanza(fn, code, msg) {
  try { await fn(); fail++; console.error('  ✗', msg, '(no lanzó)'); }
  catch (e) { if (e.code === code) { ok++; console.log('  ✓', msg); } else { fail++; console.error('  ✗', msg, '— lanzó', e.code || e.message); } }
}

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Residente de las pruebas (el seed lo trae). created_by/residente_id apuntan a él.
    const ru = await client.query("SELECT id FROM usuarios WHERE email = 'residente@sigecop.test'");
    const residenteId = ru.rows[0].id;

    // Contrato temporal: 12 meses (mensual) → 12 periodos.
    const folio = 'TEST-A2-' + residenteId + '-' + 'x';
    const c = await client.query(
      `INSERT INTO contratos (folio, tipo, objeto, contratista, dependencia, monto, plazo_dias,
         fecha_inicio, fecha_termino, created_by, residente_id, ciclo_estimacion)
       VALUES ($1,'Obra','Test A2','Contratista X','Dependencia X',0,365,'2026-01-01','2026-12-31',$2,$2,'mensual')
       RETURNING id`,
      [folio, residenteId]
    );
    const contratoId = c.rows[0].id;

    // Catálogo del profesor: C1=800, C2=6000, C3=4000.
    const conceptos = [['C1', 800], ['C2', 6000], ['C3', 4000]];
    const ccId = {};
    for (let i = 0; i < conceptos.length; i++) {
      const [clave, cant] = conceptos[i];
      const r = await client.query(
        `INSERT INTO contrato_conceptos (contrato_id, orden, clave, concepto, unidad, cantidad, pu)
         VALUES ($1,$2,$3,$4,'pza',$5,1) RETURNING id`,
        [contratoId, i + 1, clave, 'Concepto ' + clave, cant]
      );
      ccId[clave] = r.rows[0].id;
    }

    // Periodos del ciclo (mensual): 12.
    const periodos = generarPeriodos('2026-01-01', 365, 'mensual');
    assert(periodos.length === 12, `12 periodos generados (got ${periodos.length})`);
    const pId = {};
    for (const p of periodos) {
      const r = await client.query(
        `INSERT INTO contrato_periodos (contrato_id, numero, inicio, fin) VALUES ($1,$2,$3,$4) RETURNING id`,
        [contratoId, p.numero, p.inicio, p.fin]
      );
      pId[p.numero] = r.rows[0].id;
    }

    // --- T1: matriz que CUADRA (C1: 200×4=800; C2: 6000 en p1; C3: 1000×4=4000) ---
    const matrizOk = [
      { contrato_concepto_id: ccId.C1, contrato_periodo_id: pId[1], cantidad: 200 },
      { contrato_concepto_id: ccId.C1, contrato_periodo_id: pId[2], cantidad: 200 },
      { contrato_concepto_id: ccId.C1, contrato_periodo_id: pId[3], cantidad: 200 },
      { contrato_concepto_id: ccId.C1, contrato_periodo_id: pId[4], cantidad: 200 },
      { contrato_concepto_id: ccId.C2, contrato_periodo_id: pId[1], cantidad: 6000 },
      { contrato_concepto_id: ccId.C3, contrato_periodo_id: pId[5], cantidad: 1000 },
      { contrato_concepto_id: ccId.C3, contrato_periodo_id: pId[6], cantidad: 1000 },
      { contrato_concepto_id: ccId.C3, contrato_periodo_id: pId[7], cantidad: 1000 },
      { contrato_concepto_id: ccId.C3, contrato_periodo_id: pId[8], cantidad: 1000 }
    ];
    const r1 = await guardarMatriz(client, contratoId, matrizOk);
    assert(r1.celdasInsertadas === 9, `T1 cuadre: 9 celdas insertadas (got ${r1.celdasInsertadas})`);
    const recon = await reconciliacion(client, contratoId);
    const byClave = Object.fromEntries(recon.map((r) => [r.clave, r]));
    assert(Number(byClave.C1.planeado) === 800 && Number(byClave.C1.restante) === 0, 'T1: C1 planeado 800, restante 0');
    assert(Number(byClave.C3.planeado) === 4000 && Number(byClave.C3.restante) === 0, 'T1: C3 planeado 4000, restante 0');

    // --- T2: exceso art. 118 (C1 sube a 900 > 800) → PROGRAMA_EXCEDE ---
    // guardarMatriz hace DELETE+INSERT y RECIÉN valida; un savepoint deshace el intento fallido.
    await client.query('SAVEPOINT sp_t2');
    const matrizExcede = matrizOk.concat([{ contrato_concepto_id: ccId.C1, contrato_periodo_id: pId[5], cantidad: 100 }]);
    await lanza(() => guardarMatriz(client, contratoId, matrizExcede), 'PROGRAMA_EXCEDE', 'T2 exceso art. 118 → PROGRAMA_EXCEDE');
    await client.query('ROLLBACK TO SAVEPOINT sp_t2'); // restaura la matriz OK de T1

    // --- T3: freeze. Inserta una estimación NO rechazada → edición manual congelada ---
    await client.query(
      `INSERT INTO estimaciones (contrato_id, numero, periodo_inicio, periodo_fin, estado,
         anticipo_pct_snapshot, subtotal, amortizacion, retencion, neto, integrada_por)
       VALUES ($1,1,'2026-01-01','2026-01-31','integrada',0,0,0,0,0,$2)`,
      [contratoId, residenteId]
    );
    await lanza(() => guardarMatriz(client, contratoId, matrizOk), 'PROGRAMA_CONGELADO', 'T3a edición manual con estimación → PROGRAMA_CONGELADO');
    // enmienda por convenio (art. 99): exenta del freeze → PASA.
    const r3 = await guardarMatriz(client, contratoId, matrizOk, { convenioId: 1 });
    assert(r3.celdasInsertadas === 9, 'T3b enmienda por convenio (art. 99) → permitido');

    await client.query('ROLLBACK'); // NADA se persiste
    console.log(`\nprograma-obra: ${ok} OK, ${fail} fallos.`);
    process.exit(fail === 0 ? 0 : 1);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('ERROR inesperado:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
