// =====================================================================
// Paquete A2 — Programa de obra = matriz CONCEPTO × PERIODO.
// (Fundamento Nivel 1: art. 45 fr. X RLOPSRM — "programa de ejecución convenido
//  conforme al catálogo de conceptos, calendarizado y cuantificado por periodos";
//  art. 54 LOPSRM — periodicidad de la estimación cada 30 o 15 días; art. 118 RLOPSRM
//  — no se puede planear/estimar más de lo contratado.)
//
// Librería COMPARTIDA (no es zona congelada). La usan:
//  - contratos.controller.js (crearContrato): genera periodos + guarda la matriz en el alta.
//  - programa.controller.js (GET/PUT /:id/programa): lee y reemplaza la matriz.
//
// Pliega las 7 correcciones del red-team (C1–C7) — ver guardarMatriz.
// =====================================================================

// masUnMes: periodo_inicio + 1 mes calendario con la MISMA semántica que Postgres
// (date + INTERVAL '1 month') y que la validación de la estimación en
// estimaciones.controller.js (masUnMes). Si el día no existe en el mes destino lo fija
// al último (2026-01-31 -> 2026-02-28). Esto es CLAVE: hace que cada periodo generado
// sea, por construcción, un periodo VÁLIDO de estimación (periodo_fin <= masUnMes(inicio),
// art. 54). Devuelve 'AAAA-MM-DD'.
function masUnMes(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  let ny = y, nm = m + 1;
  if (nm > 12) { nm = 1; ny += 1; }
  const ultimoDia = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, ultimoDia);
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

// Suma/resta días a una fecha ISO sin corrimiento de zona horaria (UTC puro).
function addDias(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// Mismo OFFSET que el contrato (el día de inicio cuenta como día 1):
// término = inicio + (plazo − 1).
const OFFSET_TERMINO_DIAS = 1;
function derivarTermino(inicioISO, plazoDias) {
  return addDias(inicioISO, plazoDias - OFFSET_TERMINO_DIAS);
}

/**
 * Genera los periodos del ciclo de ejecución (columnas de la matriz).
 * Mosaico CONTIGUO sin huecos ni solapes: cada periodo arranca el día siguiente al
 * fin del anterior; el primero arranca en la fecha de inicio y el último se recorta a
 * la fecha de término. Cada periodo cumple, por construcción, periodo_fin <= masUnMes(
 * periodo_inicio) (art. 54), así alimenta directo la validación de la estimación (HU-12).
 *
 * - 'mensual'  : el corte siguiente = masUnMes(inicio del periodo) → ~1 mes calendario.
 * - 'quincenal': el corte siguiente = inicio + 15 días → periodos de 15 días.
 *
 * @returns {{numero:number, inicio:string, fin:string}[]}
 */
function generarPeriodos(fechaInicioISO, plazoDias, ciclo) {
  if (ciclo !== 'mensual' && ciclo !== 'quincenal') {
    throw Object.assign(new Error('ciclo debe ser "mensual" o "quincenal"'), { code: 'CICLO_INVALIDO' });
  }
  const plazo = Number(plazoDias);
  if (!Number.isInteger(plazo) || plazo <= 0) {
    throw Object.assign(new Error('plazoDias debe ser un entero mayor a 0'), { code: 'PLAZO_INVALIDO' });
  }
  const termino = derivarTermino(fechaInicioISO, plazo);
  const periodos = [];
  let inicio = String(fechaInicioISO).slice(0, 10);
  let numero = 0;
  // Tope de seguridad (un contrato no debería exceder ~400 quincenas); evita un bucle
  // infinito si llegara una fecha corrupta.
  const MAX_PERIODOS = 1000;
  while (inicio <= termino && numero < MAX_PERIODOS) {
    numero += 1;
    // Corte siguiente según el ciclo; el fin del periodo es el día ANTES del corte.
    const corteSiguiente = ciclo === 'mensual' ? masUnMes(inicio) : addDias(inicio, 15);
    let fin = addDias(corteSiguiente, -1);
    if (fin > termino) fin = termino; // último periodo recortado al término
    periodos.push({ numero, inicio, fin });
    inicio = addDias(fin, 1);
  }
  return periodos;
}

// --- Errores de dominio del programa (los mapea el controller a HTTP) -------------
function errProgramaCongelado() {
  return Object.assign(
    new Error('El programa de obra no puede editarse: el contrato ya tiene estimaciones. Una corrección procede por convenio modificatorio (art. 59 LOPSRM).'),
    { code: 'PROGRAMA_CONGELADO' }
  );
}
function errProgramaAjeno(msg) {
  return Object.assign(new Error(msg), { code: 'PROGRAMA_AJENO' });
}
// Regla del 100% (paquete alta-v2): por concepto, Σ planeado DEBE IGUALAR lo contratado
// (programa convenido "del total de los conceptos de trabajo" — RLOPSRM art. 45 ap. A
// fr. X; el programa es la base para medir el avance — LOPSRM art. 52). Antes solo se
// bloqueaba el exceso (art. 118); ahora también el faltante. El descuadre puede ser por
// SOBRA (> contratado) o por FALTA (< contratado, incluido el concepto sin ninguna celda).
function errProgramaDescuadre(detalles) {
  const txt = detalles.map((r) => {
    const dif = Number(r.contratado) - Number(r.planeado);
    const detalle = dif > 0 ? `faltan ${dif.toFixed(3)}` : `sobran ${(-dif).toFixed(3)}`;
    return `${r.clave}: planeado ${r.planeado} vs contratado ${r.contratado} (${detalle})`;
  }).join('; ');
  return Object.assign(
    new Error(`El programa de obra debe distribuir el 100% de cada concepto (Σ planeado = contratado): RLOPSRM art. 45 ap. A fr. X + LOPSRM art. 52. Conceptos sin cuadrar — ${txt}`),
    { code: 'PROGRAMA_DESCUADRE', detalles }
  );
}

/**
 * Guarda (REEMPLAZA) la matriz del programa de obra de un contrato, dentro de una
 * transacción que ABRE EL LLAMADOR. UNA sola función reutilizable (C6).
 *
 * @param client   cliente PG dentro de una transacción (BEGIN ya emitido por el llamador)
 * @param contratoId  id del contrato
 * @param celdas   [{ contrato_concepto_id, contrato_periodo_id, cantidad }]  (se ignora cantidad<=0)
 * @param opts.convenioId  si viene, es ENMIENDA por convenio (art. 59 LOPSRM) → exenta del freeze (C1)
 *
 * Correcciones plegadas:
 *  C2 — toma pg_advisory_xact_lock(2, contratoId) al inicio (mismo lock que la integración
 *       de estimación) para cerrar el TOCTOU con HU-12.
 *  C1 — distingue origen: edicion_manual (sin convenioId) vs enmienda_convenio (con convenioId).
 *  C3 — freeze = EXISTS(estimaciones con estado <> 'rechazada'), no estado='integrada'.
 *  C5 — reemplazo por DELETE de TODAS las celdas de los conceptos del contrato (subconsulta).
 *  C7 — Regla del 100%: Σ planeado = contratado por concepto, VALIDADO EN SQL NUMERIC (3 dec,
 *       tolerancia 0.0005). Cubre faltante y exceso (RLOPSRM 45-A-X + LOPSRM 52; exceso art. 118).
 *  (C4/C6 viven en el llamador: traduce clave→id con RETURNING y rechaza huérfanos antes de llamar.)
 */
async function guardarMatriz(client, contratoId, celdas, opts = {}) {
  const convenioId = opts.convenioId != null ? opts.convenioId : null;
  const cid = Number(contratoId);

  // C2: serializa contra la integración de estimación (mismo (classid=2, objid=contrato_id)).
  await client.query('SELECT pg_advisory_xact_lock(2, $1::int)', [cid]);

  // C1 + C3: freeze. La edición MANUAL se bloquea si el contrato ya tiene una estimación
  // NO rechazada (el programa ya rige cobros). La ENMIENDA por convenio (art. 59 LOPSRM) está exenta.
  if (convenioId == null) {
    const fr = await client.query(
      "SELECT EXISTS(SELECT 1 FROM estimaciones WHERE contrato_id = $1 AND estado <> 'rechazada') AS frozen",
      [cid]
    );
    if (fr.rows[0].frozen) throw errProgramaCongelado();
  }

  // Defensa: conceptos y periodos deben pertenecer al contrato (el alta ya lo garantiza;
  // el endpoint PUT no necesariamente). Rechaza huérfanos antes de tocar la tabla.
  const conceptosOk = new Set(
    (await client.query('SELECT id FROM contrato_conceptos WHERE contrato_id = $1', [cid])).rows.map((r) => r.id)
  );
  const periodosOk = new Set(
    (await client.query('SELECT id FROM contrato_periodos WHERE contrato_id = $1', [cid])).rows.map((r) => r.id)
  );
  for (const c of celdas) {
    if (!conceptosOk.has(Number(c.contrato_concepto_id))) {
      throw errProgramaAjeno(`El concepto ${c.contrato_concepto_id} no pertenece al contrato`);
    }
    if (!periodosOk.has(Number(c.contrato_periodo_id))) {
      throw errProgramaAjeno(`El periodo ${c.contrato_periodo_id} no pertenece al contrato`);
    }
  }

  // C5: reemplazo total — borra la matriz previa de TODOS los conceptos del contrato.
  await client.query(
    'DELETE FROM programa_obra WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id = $1)',
    [cid]
  );

  // Inserta solo celdas con cantidad > 0 (una celda vacía = concepto no asignado a ese periodo).
  // P1-6 (26-jun): RECHAZA cantidades negativas (antes solo las saltaba). Defensa en la lib además del
  // gate de los callers (crearContrato y PUT /programa ya rechazan <0). Una celda vacía o == 0 = concepto
  // no asignado a ese periodo (se salta, no es error). Fundamento: art. 45 ap. A fr. X RLOPSRM (cantidades
  // cuantificadas por periodo; una cantidad negativa no es un valor válido del programa).
  let insertadas = 0;
  for (const c of celdas) {
    if (Number(c.cantidad) < 0) throw errProgramaAjeno(`La cantidad de la celda (concepto ${c.contrato_concepto_id}, periodo ${c.contrato_periodo_id}) no puede ser negativa.`);
    if (!(Number(c.cantidad) > 0)) continue;
    await client.query(
      'INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES ($1, $2, $3)',
      [Number(c.contrato_concepto_id), Number(c.contrato_periodo_id), c.cantidad]
    );
    insertadas += 1;
  }

  // C7 — Regla del 100% (alta-v2): por concepto, Σ planeado DEBE IGUALAR lo contratado del
  // catálogo, con tolerancia de redondeo en la escala NUMERIC(14,3) (|Δ| > 0.0005 ⇒ descuadre).
  // La comparación la hace Postgres sobre NUMERIC(14,3) (sin flotantes de JS). Cubre faltante Y
  // exceso, e incluye conceptos SIN ninguna celda (LEFT JOIN → planeado 0 → descuadre). El exceso
  // sigue cubierto (art. 118 RLOPSRM); el faltante es la regla nueva (RLOPSRM art. 45-A-X + LOPSRM
  // art. 52: el programa convenido cubre el total de los conceptos y es la base del avance).
  const inv = await client.query(
    `SELECT cc.clave,
            cc.cantidad                       AS contratado,
            COALESCE(SUM(po.cantidad), 0)     AS planeado
       FROM contrato_conceptos cc
       LEFT JOIN programa_obra po ON po.contrato_concepto_id = cc.id
      WHERE cc.contrato_id = $1
      GROUP BY cc.id, cc.clave, cc.cantidad
     HAVING ABS(COALESCE(SUM(po.cantidad), 0) - cc.cantidad) > 0.0005`,
    [cid]
  );
  if (inv.rowCount > 0) throw errProgramaDescuadre(inv.rows);

  return { celdasInsertadas: insertadas };
}

// Reconciliación por concepto (lo que la vista pinta: contratado, planeado, restante).
async function reconciliacion(client, contratoId) {
  const r = await client.query(
    `SELECT cc.id            AS contrato_concepto_id,
            cc.clave,
            cc.concepto,
            cc.unidad,
            cc.cantidad                    AS contratado,
            COALESCE(SUM(po.cantidad), 0)  AS planeado,
            (cc.cantidad - COALESCE(SUM(po.cantidad), 0)) AS restante
       FROM contrato_conceptos cc
       LEFT JOIN programa_obra po ON po.contrato_concepto_id = cc.id
      WHERE cc.contrato_id = $1
      GROUP BY cc.id, cc.clave, cc.concepto, cc.unidad, cc.cantidad
      ORDER BY cc.orden`,
    [contratoId]
  );
  return r.rows;
}

module.exports = {
  masUnMes,
  addDias,
  derivarTermino,
  generarPeriodos,
  guardarMatriz,
  reconciliacion,
};
