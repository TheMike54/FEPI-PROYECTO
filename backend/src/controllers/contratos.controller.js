// Importa SOLO { pool }: dentro de la transaccion se usa client.query (nunca la
// query() global, que tomaria OTRA conexion del pool y se auto-commitearia,
// rompiendo la atomicidad).
const { pool } = require('../db/pool');
const { ROLES_VEN_TODO, esParteOSupervision } = require('../lib/acceso');
// A2: el programa de obra (matriz concepto×periodo) se genera y guarda con la lib
// compartida; el alta traduce clave→id antes de llamar a guardarMatriz (C6).
const { generarPeriodos, guardarMatriz } = require('../lib/programa');

// 'monto' NO se captura: se DERIVA del catálogo (Σ ROUND(cantidad×pu,2), art. 45 fr. IX
// RLOPSRM: el catálogo con sus importes ES el presupuesto). Sin catálogo (precio alzado)
// se captura aparte; ver crearContrato.
// Corrección profe (04-jun): 'contratista' y 'dependencia' SALEN de los requeridos de texto:
// ahora son CUENTAS seleccionadas (contratista = superintendenteId; dependencia = dependenciaId)
// y el texto de esas columnas se DERIVA del nombre de la cuenta (no se captura a mano).
const REQUIRED_FIELDS = [
  'folio', 'tipo', 'objeto', 'plazoDias', 'fechaInicio'
];

// --- Reglas de dominio HU-01 ---
// El dia de inicio cuenta como dia 1; por eso termino = inicio + (plazo - OFFSET_TERMINO_DIAS).
// Convencion LOPSRM 31-V / RLOPSRM 100. Cambiar aqui si la convencion cambia.
const OFFSET_TERMINO_DIAS = 1;
function derivarTermino(inicioISO, plazoDias) {
  const [y, m, d] = String(inicioISO).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + (plazoDias - OFFSET_TERMINO_DIAS));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// '' / undefined -> NULL para cualquier campo opcional (evita castear '' a DATE
// o NUMERIC, que aborta la transaccion con 22P02/22007).
const emptyToNull = (v) => (v === '' || v === undefined ? null : v);
const numOrNull = (v) => {
  const n = emptyToNull(v);
  if (n === null) return null;
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
};

// Una fila de garantía está "vacía" si no tiene NINGÚN dato. Si trae cualquier dato,
// debe estar completa (al menos monto > 0); a medias se bloquea.
const garantiaVacia = (g) => !(
  String(g.tipo || '').trim() || String(g.afianzadora || '').trim() ||
  String(g.poliza || '').trim() || (g.monto !== '' && g.monto !== undefined && g.monto !== null) ||
  String(g.vigencia || '').trim()
);

async function crearContrato(req, res) {
  const body = req.body || {};

  // --- 1) Validar TODO antes de pedir un client del pool ---------------------
  const faltantes = REQUIRED_FIELDS.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === ''
  );
  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Faltan campos requeridos', faltantes });
  }

  const plazoDias = Number(body.plazoDias);
  if (!Number.isInteger(plazoDias) || plazoDias <= 0) {
    return res.status(400).json({ error: 'plazoDias debe ser un entero mayor a 0' });
  }

  // Regla 3: la fecha de término se DERIVA del inicio + plazo (no se confía en el cliente).
  const fechaTerminoDerivada = derivarTermino(body.fechaInicio, plazoDias);

  // T3: longitud de los campos de texto (evita 22001 desde la BD). Corrección profe (04-jun):
  // contratista/dependencia SALEN de aquí — ya no llegan del body, se DERIVAN del nombre de la cuenta
  // seleccionada (≤150 por VARCHAR(150) de usuarios.nombre, holgado contra el VARCHAR(200) de contratos).
  const LIMITES_TEXTO = { folio: 50, tipo: 80 };
  for (const [campo, max] of Object.entries(LIMITES_TEXTO)) {
    if (body[campo] != null && String(body[campo]).length > max) {
      return res.status(400).json({ error: `El campo "${campo}" excede el máximo de ${max} caracteres` });
    }
  }

  const anticipoPct = numOrNull(body.anticipoPct);
  if (anticipoPct !== null && (anticipoPct < 0 || anticipoPct > 100)) {
    return res.status(400).json({ error: 'anticipoPct debe estar entre 0 y 100' });
  }
  // Etapa C: % de pena por atraso (penas convencionales, art. 138/139 RLOPSRM), OPCIONAL: fracción 0–1
  // (ej. 0.05 = 5%). Vacío/ausente → NULL (sin pena pactada → retención por atraso $0). No afecta el
  // gating del alta ni la regla del 100% (es un dato más de la cabecera). [validar tasa con el profe].
  const penaConvencionalPct = numOrNull(body.penaConvencionalPct);
  if (penaConvencionalPct !== null && (penaConvencionalPct < 0 || penaConvencionalPct > 1)) {
    return res.status(400).json({ error: 'penaConvencionalPct, si se envía, debe estar entre 0 y 1 (ej. 0.05 = 5%)' });
  }

  // Sub-bloques opcionales (no bloquean el guardado si vienen vacios).
  const conceptos = Array.isArray(body.conceptos) ? body.conceptos : [];
  const actividades = Array.isArray(body.actividades) ? body.actividades : [];
  const garantias = Array.isArray(body.garantias) ? body.garantias : [];
  const juridicos =
    body.juridicos && typeof body.juridicos === 'object' && !Array.isArray(body.juridicos)
      ? body.juridicos
      : null;

  // Tope generoso por bloque: evita un alta gigante que alargue la transaccion.
  const MAX_FILAS = 500;
  if (conceptos.length > MAX_FILAS || actividades.length > MAX_FILAS || garantias.length > MAX_FILAS) {
    return res.status(400).json({ error: `Cada bloque admite un máximo de ${MAX_FILAS} filas` });
  }

  // Validacion por fila: si la fila existe, se exige lo minimo de esa fila.
  for (const [i, c] of conceptos.entries()) {
    if (!c.concepto || !c.unidad) {
      return res.status(400).json({ error: `Concepto #${i + 1}: concepto y unidad son obligatorios` });
    }
    // Clave CAPTURADA por el usuario, obligatoria en altas nuevas (art. 45 fr. IX RLOPSRM:
    // el catálogo lo diseña el usuario). UNIQUE(contrato_id, clave) la blinda en BD; los
    // contratos viejos quedan con clave NULL (no se auto-migran).
    if (!String(c.clave || '').trim()) {
      return res.status(400).json({ error: `Concepto #${i + 1}: la clave del concepto es obligatoria (la define el usuario)` });
    }
    if (String(c.clave).trim().length > 40) {
      return res.status(400).json({ error: `Concepto #${i + 1}: la clave excede el máximo de 40 caracteres` });
    }
    if (String(c.unidad).length > 20) {
      return res.status(400).json({ error: `Concepto #${i + 1}: la unidad excede el máximo de 20 caracteres` });
    }
    const cant = numOrNull(c.cantidad);
    const pu = numOrNull(c.pu);
    if (cant === null || cant <= 0) return res.status(400).json({ error: `Concepto #${i + 1}: la cantidad debe ser mayor a 0` });
    if (pu === null || pu <= 0) return res.status(400).json({ error: `Concepto #${i + 1}: el precio unitario debe ser mayor a 0` });
  }
  // Monto DERIVADO del catálogo = Σ ROUND(cantidad×pu, 2) con Postgres NUMERIC: UN SOLO
  // motor de redondeo y la MISMA fórmula que el subtotal de estimaciones, así el monto del
  // contrato y el subtotal de los generadores coinciden al centavo. SIN tolerancia: el monto
  // ES la suma (art. 45 fr. IX RLOPSRM). Sin catálogo (precio alzado) se usa el monto capturado.
  let monto;
  if (conceptos.length > 0) {
    const vals = conceptos.map((_, i) => `($${i * 2 + 1}::numeric(14,3), $${i * 2 + 2}::numeric(16,4))`).join(', ');
    const prm = conceptos.flatMap((c) => [numOrNull(c.cantidad), numOrNull(c.pu)]);
    const mr = await pool.query(
      // 4.2: monto a NUMERIC(18,2) (antes 14,2). Obras grandes (Σ importes ≥ 10^12)
      // desbordaban la columna 14,2 → error crudo 22003. Ahora cabe (< 10^16).
      `SELECT COALESCE(SUM(ROUND(t.cant * t.pu, 2)), 0)::numeric(18,2) AS monto
         FROM (VALUES ${vals}) AS t(cant, pu)`,
      prm
    );
    monto = mr.rows[0].monto; // string NUMERIC (p. ej. '7199999.99')
  } else {
    monto = numOrNull(body.monto);
    if (monto === null || !(Number(monto) > 0)) {
      return res.status(400).json({ error: 'Sin catálogo de conceptos, captura el monto del contrato (mayor a 0)' });
    }
  }
  for (const [i, a] of actividades.entries()) {
    if (!a.actividad || !a.inicio || !a.termino) {
      return res.status(400).json({ error: `Actividad #${i + 1}: actividad, inicio y término son obligatorios` });
    }
    const peso = numOrNull(a.peso);
    if (peso === null || peso < 0 || peso > 100) {
      return res.status(400).json({ error: `Actividad #${i + 1}: peso debe estar entre 0 y 100` });
    }
    if (a.termino < a.inicio) {
      return res.status(400).json({ error: `Actividad #${i + 1}: el término no puede ser anterior al inicio` });
    }
    // Regla 5: la actividad debe estar dentro del plazo del contrato.
    if (a.inicio < body.fechaInicio || a.termino > fechaTerminoDerivada) {
      return res.status(400).json({ error: `Actividad #${i + 1}: debe estar dentro del plazo del contrato (inicio ≥ ${body.fechaInicio} y término ≤ ${fechaTerminoDerivada})` });
    }
  }
  // El programa de obra no puede EXCEDER 100% (suma parcial <100% si permitida).
  const sumaPeso = Math.round(actividades.reduce((s, a) => s + (numOrNull(a.peso) || 0), 0) * 100) / 100;
  if (sumaPeso > 100) {
    return res.status(400).json({ error: `La suma de %peso del programa no puede exceder 100% (actual: ${sumaPeso}%)` });
  }
  for (const [i, g] of garantias.entries()) {
    if (garantiaVacia(g)) continue; // fila completamente vacía → se ignora
    if (!g.tipo) return res.status(400).json({ error: `Garantía #${i + 1}: el tipo es obligatorio` });
    const gm = numOrNull(g.monto);
    if (gm === null || gm <= 0) {
      return res.status(400).json({ error: `Garantía #${i + 1}: si capturas la póliza, indica un monto mayor a 0` });
    }
    // alta-v2 (1.4): una garantía/póliza no puede exceder el monto del contrato (una fianza
    // por encima del 100% del contrato es incoherente). Validación de COHERENCIA; el monto del
    // contrato es el derivado del catálogo. La vista lo marca EN VIVO; aquí es la barrera real.
    if (gm > Number(monto)) {
      return res.status(400).json({ error: `Garantía #${i + 1}: el monto (${gm}) no puede exceder el monto del contrato (${monto})` });
    }
  }

  // --- A2: ciclo de estimación + programa de obra (matriz concepto × periodo) ------
  // El programa son CONCEPTOS del catálogo repartidos en los periodos del ciclo (art. 45
  // fr. X RLOPSRM), NO "actividades" de texto libre. Celda = cantidad planeada del concepto
  // en el periodo; el invariante Σ por concepto <= contratado (art. 118) lo valida
  // guardarMatriz en SQL. Los periodos los genera el backend (no se confía en el cliente).
  const ciclo = (body.ciclo === 'mensual' || body.ciclo === 'quincenal') ? body.ciclo : null;
  const programaRaw = Array.isArray(body.programa) ? body.programa : [];
  let periodos = [];
  const programaCeldas = [];
  if (programaRaw.length > 0) {
    if (!ciclo) return res.status(400).json({ error: 'Define el ciclo de estimación (mensual o quincenal) para el programa de obra (art. 54)' });
    if (conceptos.length === 0) return res.status(400).json({ error: 'El programa de obra requiere un catálogo de conceptos' });
    if (programaRaw.length > 20000) return res.status(400).json({ error: 'El programa de obra tiene demasiadas celdas' });
    try { periodos = generarPeriodos(body.fechaInicio, plazoDias, ciclo); }
    catch (e) { return res.status(400).json({ error: 'No se pudieron generar los periodos del ciclo: ' + e.message }); }
    const clavesCatalogo = new Set(conceptos.map((c) => String(c.clave || '').trim()));
    const maxNumero = periodos.length;
    for (const [i, cell] of programaRaw.entries()) {
      const clave = String(cell.clave || '').trim();
      const pnum = Number(cell.periodoNumero);
      const cant = numOrNull(cell.cantidad);
      if (!clave || !clavesCatalogo.has(clave)) return res.status(400).json({ error: `Celda #${i + 1}: la clave "${clave}" no está en el catálogo` });
      if (!Number.isInteger(pnum) || pnum < 1 || pnum > maxNumero) return res.status(400).json({ error: `Celda #${i + 1}: periodo ${cell.periodoNumero} fuera de rango (1..${maxNumero})` });
      if (cant === null || cant < 0) return res.status(400).json({ error: `Celda #${i + 1}: la cantidad no puede ser negativa` });
      if (cant === 0) continue; // celda vacía: el concepto no se asigna a ese periodo
      programaCeldas.push({ clave, periodoNumero: pnum, cantidad: cant });
    }
  } else if (ciclo) {
    // Sin celdas pero con ciclo definido: igual se generan los periodos (matriz vacía,
    // se podrá llenar luego con PUT /:id/programa).
    try { periodos = generarPeriodos(body.fechaInicio, plazoDias, ciclo); }
    catch (e) { return res.status(400).json({ error: 'No se pudieron generar los periodos del ciclo: ' + e.message }); }
  }

  // Personas del contrato, ligadas a CUENTAS (corrección profe 04-jun: nada de texto libre):
  //   · residente   = usuario del token (firma la bitácora).
  //   · contratista = superintendenteId (cuenta rol 'contratista' APROBADA), OBLIGATORIO; es el
  //     superintendente de obra que firma la bitácora. El texto `contratista` se deriva de su nombre.
  //   · supervisión = supervisionId (cuenta rol 'supervision' aprobada), OPCIONAL (firma si existe).
  //   · dependencia = dependenciaId (cuenta rol 'dependencia' aprobada), OBLIGATORIO; parte
  //     contratante. El texto `dependencia` se deriva de su nombre. (No firma la bitácora diaria:
  //     art. 123 RLOPSRM; el residente la representa, por eso NO entra al roster.)
  // Rol y estado se validan contra la BD (no se confía en el cliente).
  const superintendenteId = numOrNull(body.superintendenteId);
  const supervisionId = numOrNull(body.supervisionId);
  const dependenciaId = numOrNull(body.dependenciaId);
  if (superintendenteId === null) {
    return res.status(400).json({ error: 'Debes asignar un contratista/superintendente (cuenta de contratista aprobada)' });
  }
  if (dependenciaId === null) {
    return res.status(400).json({ error: 'Debes seleccionar la dependencia (cuenta de dependencia aprobada)' });
  }
  const equipoIds = [superintendenteId, dependenciaId];
  if (supervisionId !== null) equipoIds.push(supervisionId);
  const equipo = await pool.query('SELECT id, nombre, rol, estado FROM usuarios WHERE id = ANY($1)', [equipoIds]);
  const equipoById = new Map(equipo.rows.map((u) => [u.id, u]));
  const sup = equipoById.get(superintendenteId);
  if (!sup || sup.rol !== 'contratista' || sup.estado !== 'activo') {
    return res.status(400).json({ error: 'El contratista/superintendente debe ser una cuenta aprobada con rol contratista' });
  }
  const dep = equipoById.get(dependenciaId);
  if (!dep || dep.rol !== 'dependencia' || dep.estado !== 'activo') {
    return res.status(400).json({ error: 'La dependencia debe ser una cuenta aprobada con rol dependencia' });
  }
  if (supervisionId !== null) {
    const sv = equipoById.get(supervisionId);
    if (!sv || sv.rol !== 'supervision' || sv.estado !== 'activo') {
      return res.status(400).json({ error: 'La supervisión debe ser una cuenta aprobada con rol supervision' });
    }
  }

  // El texto de las columnas `contratista`/`dependencia` se DERIVA del nombre de la cuenta (fuente
  // única; lo leen la lista de Registrados y el detalle). Ya no llega del body.
  const { folio, tipo, objeto, fechaInicio } = body;
  const contratista = sup.nombre;
  const dependencia = dep.nombre;

  // --- 2) Transaccion: cabecera + bloques = una sola entidad (todo o nada) ----
  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cab = await client.query(
        `INSERT INTO contratos
           (folio, tipo, objeto, contratista, dependencia, monto, plazo_dias,
            fecha_inicio, fecha_termino, created_by, datos_juridicos, anticipo_pct,
            residente_id, superintendente_id, supervision_id, ciclo_estimacion, dependencia_id,
            pena_convencional_pct)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id`,
        [
          folio, tipo, objeto, contratista, dependencia, monto, plazoDias,
          fechaInicio, fechaTerminoDerivada, req.user.id,
          juridicos ? JSON.stringify(juridicos) : null,
          anticipoPct,
          req.user.id, superintendenteId, supervisionId, ciclo, dependenciaId,
          penaConvencionalPct
        ]
      );
      const contratoId = cab.rows[0].id;

      // Corrección profe (04-jun): ASOCIAR las personas seleccionadas al contrato_roster (pasada 2,
      // art. 125 fr. I g RLOPSRM) DESDE EL ALTA. Antes el roster solo se sembraba post-deploy desde
      // los punteros escalares; ahora queda registrado al guardar. Una fila ACTIVA por rol; el cache
      // escalar de `contratos` (que leen lib/acceso y la firma de bitácora) ya se escribió arriba —
      // el roster es el registro histórico que habilita la sustitución (sustituir-no-borrar). La
      // dependencia NO entra al roster (no firma la bitácora; art. 123 RLOPSRM). vigencia_desde =
      // inicio del contrato (igual que el seed idempotente del schema, que no duplica por NOT EXISTS).
      const rosterIniciales = [['residente', req.user.id], ['superintendente', superintendenteId]];
      if (supervisionId !== null) rosterIniciales.push(['supervision', supervisionId]);
      for (const [rolRoster, usuarioId] of rosterIniciales) {
        await client.query(
          `INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo, registrado_por)
           VALUES ($1, $2, $3, $4, 'Asignación inicial (alta del contrato)', $5)`,
          [contratoId, rolRoster, usuarioId, fechaInicio, req.user.id]
        );
      }

      // clave→id de cada concepto: lo usa A2 para traducir las celdas del programa (C4/C6).
      const claveToConceptoId = new Map();
      for (const [i, c] of conceptos.entries()) {
        const clave = String(c.clave).trim();
        const ins = await client.query(
          `INSERT INTO contrato_conceptos (contrato_id, orden, clave, concepto, unidad, cantidad, pu)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [contratoId, i + 1, clave, c.concepto, c.unidad, numOrNull(c.cantidad), numOrNull(c.pu)]
        );
        claveToConceptoId.set(clave, ins.rows[0].id);
      }
      for (const [i, a] of actividades.entries()) {
        await client.query(
          `INSERT INTO contrato_actividades (contrato_id, orden, actividad, inicio, termino, peso)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [contratoId, i + 1, a.actividad, emptyToNull(a.inicio), emptyToNull(a.termino), numOrNull(a.peso)]
        );
      }
      for (const g of garantias) {
        if (garantiaVacia(g)) continue; // no se persiste una fila vacía
        await client.query(
          `INSERT INTO contrato_garantias (contrato_id, tipo, afianzadora, poliza, monto, vigencia)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [contratoId, g.tipo, emptyToNull(g.afianzadora), emptyToNull(g.poliza), numOrNull(g.monto), emptyToNull(g.vigencia)]
        );
      }

      // A2: periodos del ciclo (columnas de la matriz) + programa de obra (celdas).
      if (periodos.length > 0) {
        const numeroToPeriodoId = new Map();
        for (const p of periodos) {
          const ip = await client.query(
            `INSERT INTO contrato_periodos (contrato_id, numero, inicio, fin)
             VALUES ($1,$2,$3,$4) RETURNING id`,
            [contratoId, p.numero, p.inicio, p.fin]
          );
          numeroToPeriodoId.set(p.numero, ip.rows[0].id);
        }
        // alta-v2: SIEMPRE valida la matriz (aunque venga vacía o parcial) para exigir el
        // 100% por concepto (Σ planeado = contratado). C6: el alta ya tradujo clave→id y
        // numero→id; guardarMatriz hace lock (C2), freeze (C1/C3, aquí inerte: contrato sin
        // estimaciones), DELETE+INSERT (C5) y valida el cuadre en SQL (C7). Con conceptos y
        // celdas faltantes → PROGRAMA_DESCUADRE (400); el frontend ya lo bloquea antes de enviar.
        const celdas = programaCeldas.map((cell) => ({
          contrato_concepto_id: claveToConceptoId.get(cell.clave),
          contrato_periodo_id: numeroToPeriodoId.get(cell.periodoNumero),
          cantidad: cell.cantidad
        }));
        await guardarMatriz(client, contratoId, celdas);
      }

      await client.query('COMMIT');
      return res.status(201).json({ id: contratoId, folio });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el ROLLBACK puede fallar si el client murio */ }
      throw e;
    } finally {
      client.release(); // SIEMPRE devolver el client al pool (max: 10)
    }
  } catch (err) {
    // A2/alta-v2: errores de dominio del programa de obra (lanzados por guardarMatriz /
    // traducción). PROGRAMA_DESCUADRE = no cuadra al 100% (faltante/exceso); PROGRAMA_EXCEDE
    // se conserva por compatibilidad; PROGRAMA_AJENO = concepto/periodo de otro contrato.
    if (err.code === 'PROGRAMA_DESCUADRE' || err.code === 'PROGRAMA_EXCEDE' || err.code === 'PROGRAMA_AJENO') {
      return res.status(400).json({ error: err.message, detalles: err.detalles });
    }
    if (err.code === 'PROGRAMA_CONGELADO') {
      return res.status(409).json({ error: err.message });
    }
    if (err.code === '23505') {
      if (err.constraint && err.constraint.includes('folio')) {
        return res.status(409).json({ error: 'El folio ya existe' });
      }
      if (err.constraint && err.constraint.includes('clave')) {
        return res.status(400).json({ error: 'Hay una clave de concepto repetida; cada clave debe ser única dentro del contrato.' });
      }
      return res.status(400).json({ error: 'Hay un renglón duplicado en un sub-bloque (concepto, actividad o garantía).' });
    }
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Hay valores fuera de rango (revisa cantidades ≥ 0, peso 0–100 o que el término sea ≥ al inicio).' });
    }
    if (err.code === '22007' || err.code === '22P02') {
      return res.status(400).json({ error: 'Hay un valor con formato inválido (fecha o número).' });
    }
    if (err.code === '22001') {
      return res.status(400).json({ error: 'Un campo de texto excede el límite de caracteres permitido.' });
    }
    if (err.code === '22003') {
      // 4.2: nunca el error crudo de Postgres; di DÓNDE mirar.
      return res.status(400).json({ error: 'Un valor numérico excede el máximo permitido. Revisa la cantidad o el precio unitario de algún concepto, o que el monto total del contrato no sea demasiado grande.' });
    }
    console.error('[crearContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

async function listarContratos(req, res) {
  try {
    const u = req.user;
    const cols = `c.*,
              ru.nombre AS residente_nombre,
              su.nombre AS superintendente_nombre,
              sv.nombre AS supervision_nombre,
              EXISTS (SELECT 1 FROM contrato_documentos d WHERE d.contrato_id = c.id) AS tiene_documento`;
    const joins = `FROM contratos c
         LEFT JOIN usuarios ru ON ru.id = c.residente_id
         LEFT JOIN usuarios su ON su.id = c.superintendente_id
         LEFT JOIN usuarios sv ON sv.id = c.supervision_id`;
    // Acceso: dependencia/finanzas ven todos; operativos solo donde son parte.
    const result = ROLES_VEN_TODO.includes(u.rol)
      ? await pool.query(`SELECT ${cols} ${joins} ORDER BY c.created_at DESC`)
      : await pool.query(
          `SELECT ${cols} ${joins}
            WHERE c.created_by = $1 OR c.residente_id = $1
               OR c.superintendente_id = $1 OR c.supervision_id = $1
            ORDER BY c.created_at DESC`,
          [u.id]
        );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('[listarContratos]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

async function detalleContrato(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }

    const result = await pool.query(
      `SELECT c.*,
              ru.nombre AS residente_nombre,
              su.nombre AS superintendente_nombre,
              sv.nombre AS supervision_nombre
         FROM contratos c
         LEFT JOIN usuarios ru ON ru.id = c.residente_id
         LEFT JOIN usuarios su ON su.id = c.superintendente_id
         LEFT JOIN usuarios sv ON sv.id = c.supervision_id
        WHERE c.id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    // Acceso: solo partes del contrato (o dependencia/finanzas).
    if (!esParteOSupervision(req.user, result.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }

    // Trae los bloques hijos para que el contrato se lea como una sola entidad.
    const [conceptos, actividades, garantias] = await Promise.all([
      pool.query('SELECT * FROM contrato_conceptos WHERE contrato_id = $1 ORDER BY orden', [id]),
      pool.query('SELECT * FROM contrato_actividades WHERE contrato_id = $1 ORDER BY orden', [id]),
      pool.query('SELECT * FROM contrato_garantias WHERE contrato_id = $1 ORDER BY id', [id])
    ]);

    return res.status(200).json({
      ...result.rows[0],
      conceptos: conceptos.rows,
      actividades: actividades.rows,
      garantias: garantias.rows
    });
  } catch (err) {
    console.error('[detalleContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/contratos/:id/documento  (multipart, campo "documento") — liga el PDF
// firmado DESPUES de crear el contrato. Solo el residente ASIGNADO; append-only:
// si ya existe documento NO se reemplaza (el PDF firmado es inmutable, 409).
async function subirDocumento(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Falta el archivo PDF (campo "documento")' });
    }
    // 4.4: tipo de documento. Allowlist; default 'contrato' (compatibilidad). El
    // 'anticipo_autorizacion' guarda la autorización escrita del titular (art. 50 fr. IV).
    const tipo = req.query.tipo === 'anticipo_autorizacion' ? 'anticipo_autorizacion' : 'contrato';
    const { buffer, originalname, mimetype, size } = req.file;
    // Backstop: revalidar magic bytes %PDF (no confiar solo en el mimetype declarado).
    if (!buffer || buffer.length < 4 || buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
      return res.status(400).json({ error: 'El archivo no es un PDF válido' });
    }

    const cres = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [id]
    );
    if (cres.rowCount === 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    // Solo el residente ASIGNADO al contrato puede subir su documento.
    if (cres.rows[0].residente_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el residente asignado al contrato puede subir su documento' });
    }
    // Append-only POR TIPO: si ya hay un documento de ese tipo, es inmutable y no se reemplaza.
    const ya = await pool.query('SELECT id FROM contrato_documentos WHERE contrato_id = $1 AND tipo = $2 LIMIT 1', [id, tipo]);
    if (ya.rowCount > 0) {
      const cual = tipo === 'anticipo_autorizacion' ? 'la autorización del anticipo' : 'el documento firmado';
      return res.status(409).json({ error: `El contrato ya tiene ${cual}; es inmutable y no se puede reemplazar` });
    }

    const r = await pool.query(
      `INSERT INTO contrato_documentos (contrato_id, tipo, nombre, mime, tamano, contenido)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tipo, nombre, mime, tamano, subido_en`,
      [id, tipo, originalname, mimetype, size, buffer]
    );
    return res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('[subirDocumento]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Verifica acceso al contrato (participación) antes de servir su PDF. 404/403.
async function asegurarAccesoContrato(req, id) {
  const cres = await pool.query(
    'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
    [id]
  );
  if (cres.rowCount === 0) return { error: 404 };
  if (!esParteOSupervision(req.user, cres.rows[0])) return { error: 403 };
  return { ok: true };
}

// GET /api/contratos/:id/documento/meta — metadata del PDF (sin los bytes) o 404.
async function documentoMeta(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    const acc = await asegurarAccesoContrato(req, id);
    if (acc.error === 404) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (acc.error === 403) return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    const tipo = req.query.tipo === 'anticipo_autorizacion' ? 'anticipo_autorizacion' : 'contrato'; // 4.4
    const r = await pool.query(
      `SELECT id, tipo, nombre, mime, tamano, subido_en
         FROM contrato_documentos WHERE contrato_id = $1 AND tipo = $2
        ORDER BY subido_en DESC LIMIT 1`,
      [id, tipo]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'El contrato no tiene PDF ligado' });
    }
    return res.status(200).json(r.rows[0]);
  } catch (err) {
    console.error('[documentoMeta]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/contratos/:id/documento — devuelve el binario del PDF.
async function descargarDocumento(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    const acc = await asegurarAccesoContrato(req, id);
    if (acc.error === 404) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (acc.error === 403) return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    const tipo = req.query.tipo === 'anticipo_autorizacion' ? 'anticipo_autorizacion' : 'contrato'; // 4.4
    const r = await pool.query(
      `SELECT nombre, mime, tamano, contenido
         FROM contrato_documentos WHERE contrato_id = $1 AND tipo = $2
        ORDER BY subido_en DESC LIMIT 1`,
      [id, tipo]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'El contrato no tiene PDF ligado' });
    }
    const doc = r.rows[0];
    res.setHeader('Content-Type', doc.mime || 'application/pdf');
    res.setHeader('Content-Length', doc.tamano);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.nombre)}"`);
    return res.status(200).send(doc.contenido);
  } catch (err) {
    console.error('[descargarDocumento]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearContrato, listarContratos, detalleContrato,
  subirDocumento, documentoMeta, descargarDocumento
};
