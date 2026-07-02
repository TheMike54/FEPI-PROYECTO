// PASADA HU-03 (Fundación) — Convenios modificatorios + versionado del programa.
// Fundamento Nivel 1 (LOPSRM art. 59, reforma DOF 14-11-2025): modificar contratos mediante
// convenios "dentro de su presupuesto autorizado… siempre y cuando no impliquen variaciones
// sustanciales al objeto". El texto VIGENTE NO impone tope numérico (25%): el 25% es RLOPSRM art.
// 102 (disparador de revisión/SFP) y el 50% es art. 59 Bis (ajuste de costos) — se CLASIFICAN
// (flags), no son topes. El guardrail de variación es PARAMETRIZABLE (CONVENIO_LIMITE_VARIACION_PCT),
// NO un tope legal. El convenio SIEMPRE se funda en art. 59 (+ art. 99 RLOPSRM, dictamen técnico).
// Archivo NUEVO (la UI la hace E3).
//
// DISEÑO: el programa VIGENTE vive en programa_obra (A2, intacto). Cada convenio que toca el
// programa: (1) snapshotea v1 perezosamente si no existe, (2) muta el catálogo (contrato_conceptos),
// (3) re-cuadra el programa con guardarMatriz({convenioId}) a Σ = monto nuevo, (4) crea una versión
// nueva (snapshot inmutable) y supersede la anterior. Las estimaciones previas son INMUNES por
// diseño (snapshots en estimacion_generadores + carátula congelada) — no cambian por un convenio.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { contratoCerrado, msgCerrado } = require('../lib/gateCierre');
const { guardarMatriz, masUnMes, addDias, derivarTermino } = require('../lib/programa');
// O6: el convenio asienta su nota en la bitácora (art. 123 fr. III RLOPSRM). Reutiliza el folio atómico
// + la redacción del controller de bitácora (no se duplica la lógica de inmutabilidad de notas).
const { insertarNotaAtomica, textoNotaConvenio } = require('./bitacora.controller');

// Umbral de AVISO de variación, PARAMETRIZABLE (NO es tope legal; el art. 59 vigente no tiene tope numérico).
// CRITERIO DEL EQUIPO: superar este % del monto o plazo original NO bloquea el convenio; marca un AVISO
// (`aviso_variacion`, referido al art. 59 LOPSRM). Default 25 (= umbral de revisión del art. 102 RLOPSRM).
// <=0 = sin aviso.
const LIMITE_PCT = Number(process.env.CONVENIO_LIMITE_VARIACION_PCT ?? 25);
const UMBRAL_SFP = 25;    // RLOPSRM art. 102 (revisión indirectos/SFP)
const UMBRAL_AJUSTE = 50; // LOPSRM art. 59 Bis (ajuste de costos)

// BUG #13 (Oleada 3): SEPARACIÓN DE FUNCIONES — quién REGISTRA un convenio no puede AUTORIZARLO. Requiere
// persistir el autor del registro. Columna aditiva idempotente (no se toca schema.sql; migracion en
// backend/scripts). Legacy (NULL) = sin bloqueo de autoconflicto (no hay a quién comparar).
let _ensuredRegistradoPor = null;
function ensureRegistradoPor() {
  if (_ensuredRegistradoPor) return _ensuredRegistradoPor;
  _ensuredRegistradoPor = pool.query('ALTER TABLE convenios_modificatorios ADD COLUMN IF NOT EXISTS registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL')
    .catch((e) => { console.error('[convenios ensureRegistradoPor]', e.message); _ensuredRegistradoPor = null; throw e; });
  return _ensuredRegistradoPor;
}
ensureRegistradoPor().catch(() => {});

// Σ ROUND(cant×pu,2) con la MISMA fórmula/escala que crearContrato (cuadre al centavo, art. 45 fr. IX).
async function montoDesdeConceptos(client, conceptos) {
  if (!conceptos.length) return '0.00';
  const vals = conceptos.map((_, i) => `($${i * 2 + 1}::numeric(14,3), $${i * 2 + 2}::numeric(16,4))`).join(', ');
  const params = [];
  for (const c of conceptos) { params.push(c.cantidad, c.pu); }
  const r = await client.query(
    `SELECT COALESCE(SUM(ROUND(t.cant * t.pu, 2)), 0)::numeric(18,2) AS monto FROM (VALUES ${vals}) AS t(cant, pu)`,
    params
  );
  return r.rows[0].monto;
}

// Snapshot del estado VIVO (catálogo + celdas + monto/plazo) como una programa_version.
async function snapshotVersion(client, contratoId, numero, convenioId, vigente) {
  const ct = (await client.query('SELECT monto, plazo_dias FROM contratos WHERE id = $1', [contratoId])).rows[0];
  const ver = await client.query(
    'INSERT INTO programa_version (contrato_id, numero, convenio_id, monto, plazo_dias, vigente) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [contratoId, numero, convenioId, ct.monto, ct.plazo_dias, vigente]
  );
  const verId = ver.rows[0].id;
  await client.query(
    // H9 (25-jun) — incluye es_adicional en el snapshot para que las versiones ANTERIORES muestren la etiqueta
    // "adicional" igual que el programa vigente (antes el SELECT lo omitía → las versiones perdían el flag).
    `INSERT INTO programa_version_concepto (programa_version_id, clave, concepto, unidad, cantidad, pu, orden, es_adicional)
     SELECT $1, clave, concepto, unidad, cantidad, pu, orden, es_adicional FROM contrato_conceptos WHERE contrato_id = $2`,
    [verId, contratoId]
  );
  await client.query(
    `INSERT INTO programa_version_celda (programa_version_id, concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad)
     SELECT $1, cc.clave, cp.numero, cp.inicio, cp.fin, po.cantidad
       FROM programa_obra po
       JOIN contrato_conceptos cc ON cc.id = po.contrato_concepto_id
       JOIN contrato_periodos  cp ON cp.id = po.contrato_periodo_id
      WHERE cc.contrato_id = $2`,
    [verId, contratoId]
  );
  return verId;
}

// D4 (B8) — un convenio de PLAZO/MIXTO que amplía el plazo AÑADE periodos al final del programa (art. 59
// LOPSRM: se prorroga el plazo de ejecución). REGLA DURA de seguridad: es APPEND-ONLY — NUNCA modifica ni
// borra periodos existentes (los que ya tienen avance/estimación quedan intactos; los fixes #14/#24 no se
// tocan). Solo INSERTA periodos nuevos tras el último, con la MISMA cadencia inferida del mosaico vigente,
// hasta el nuevo término. Devuelve cuántos añadió (no lanza; si no hay mosaico o no avanza el término, 0).
async function extenderPeriodosPorPlazo(client, contratoId, _fechaInicioIgnorado, plazoNuevo) {
  const per = await client.query(
    'SELECT numero, inicio::text AS inicio, fin::text AS fin FROM contrato_periodos WHERE contrato_id=$1 ORDER BY numero', [contratoId]);
  if (per.rowCount === 0) return { anadidos: 0, motivo: 'sin_periodos' }; // contrato sin programa: nada que extender
  const rows = per.rows;
  const maxNumero = Number(rows[rows.length - 1].numero);
  const lastFin = String(rows[rows.length - 1].fin).slice(0, 10);
  // fecha_inicio como TEXTO ISO desde SQL (pg devuelve DATE como objeto Date; String(Date) NO es ISO y
  // rompería el cálculo del término → antes generaba periodos hasta el tope de seguridad).
  const ci = await client.query('SELECT fecha_inicio::text AS fi FROM contratos WHERE id=$1', [contratoId]);
  const ini0 = String(ci.rows[0]?.fi || '').slice(0, 10);
  const nuevoTermino = derivarTermino(ini0, plazoNuevo);
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  // Guarda dura: sin fechas ISO válidas NO se agrega nada (evita cualquier bucle desbocado).
  if (!ISO.test(ini0) || !ISO.test(lastFin) || !ISO.test(nuevoTermino)) return { anadidos: 0, motivo: 'fecha_invalida' };
  if (lastFin >= nuevoTermino) return { anadidos: 0, motivo: 'sin_extension' }; // el término no avanzó
  // Inferir la cadencia (mensual/quincenal) de un periodo NO recortado del mosaico vigente.
  let ciclo = 'mensual';
  for (const r of rows) {
    const ini = String(r.inicio).slice(0, 10);
    const fin = String(r.fin).slice(0, 10);
    if (addDias(masUnMes(ini), -1) === fin) { ciclo = 'mensual'; break; }
    if (addDias(ini, 14) === fin) { ciclo = 'quincenal'; break; }
  }
  // Extensión contigua (sin hueco): arranca el día siguiente al último fin vigente.
  let numero = maxNumero;
  let inicio = addDias(lastFin, 1);
  let anadidos = 0;
  const MAX = 1000; // tope de seguridad
  while (inicio <= nuevoTermino && anadidos < MAX) {
    numero += 1;
    const corte = ciclo === 'mensual' ? masUnMes(inicio) : addDias(inicio, 15);
    let fin = addDias(corte, -1);
    if (fin > nuevoTermino) fin = nuevoTermino;
    await client.query('INSERT INTO contrato_periodos (contrato_id, numero, inicio, fin) VALUES ($1,$2,$3,$4)', [contratoId, numero, inicio, fin]);
    anadidos += 1;
    inicio = addDias(fin, 1);
  }
  return { anadidos, motivo: 'ok', ciclo };
}

// GET /api/convenios/contrato/:id — convenios + versiones del programa. Acotado por participación.
async function listarConvenios(req, res) {
  try {
    const contratoId = Number(req.params.id);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const c = await pool.query('SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1', [contratoId]);
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) return res.status(403).json({ error: 'No tienes acceso a los convenios de este contrato' });

    const convenios = await pool.query(
      // FASE 0C (profe 16-jun): tiene_oficio = el convenio ya tiene cargado su OFICIO DE APROBACIÓN
      // (soporte documental, art. 59/99). Se guarda en contrato_documentos ligado por convenio_id.
      // (PLAN GRANDE BLOQUE 2) + nota de bitácora vinculada (folio + asunto) para mostrar el vínculo en
      // la UI: el convenio asienta su nota automática (art. 59 / art. 123 RLOPSRM) y la liga por nota_id.
      `SELECT cm.*, u.nombre AS autorizado_por_nombre,
              bn.numero AS nota_numero, bn.asunto AS nota_asunto,
              EXISTS (SELECT 1 FROM contrato_documentos d WHERE d.convenio_id = cm.id) AS tiene_oficio
         FROM convenios_modificatorios cm
         LEFT JOIN usuarios u ON u.id = cm.autorizado_por
         LEFT JOIN bitacora_notas bn ON bn.id = cm.nota_id
        WHERE cm.contrato_id = $1 ORDER BY cm.numero`, [contratoId]);
    const versiones = await pool.query(
      // H0 (01-jul): cada versión dice QUÉ convenio la creó (folio + tipo) para que el reflejo
      // convenio→versión sea evidente en la pantalla (antes solo se veía el número de versión).
      `SELECT pv.id, pv.numero, pv.convenio_id, pv.monto, pv.plazo_dias, pv.vigente, pv.created_at, pv.supersedido_en,
              cm.folio AS convenio_folio, cm.tipo AS convenio_tipo
         FROM programa_version pv
         LEFT JOIN convenios_modificatorios cm ON cm.id = pv.convenio_id
        WHERE pv.contrato_id = $1 ORDER BY pv.numero`, [contratoId]);
    return res.status(200).json({ contrato_id: contratoId, convenios: convenios.rows, versiones: versiones.rows });
  } catch (err) { console.error('[listarConvenios]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/convenios/version/:versionId — snapshot (catálogo + celdas) de una versión del programa.
async function detalleVersion(req, res) {
  try {
    const versionId = Number(req.params.versionId);
    if (!Number.isInteger(versionId) || versionId <= 0) return res.status(400).json({ error: 'versión inválida' });
    const v = await pool.query(
      `SELECT pv.*, c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM programa_version pv JOIN contratos c ON c.id = pv.contrato_id WHERE pv.id = $1`, [versionId]);
    if (v.rowCount === 0) return res.status(404).json({ error: 'La versión indicada no existe' });
    if (!esParteOSupervision(req.user, v.rows[0])) return res.status(403).json({ error: 'No tienes acceso a esta versión' });
    const conceptos = await pool.query('SELECT clave, concepto, unidad, cantidad, pu, orden, es_adicional FROM programa_version_concepto WHERE programa_version_id = $1 ORDER BY orden', [versionId]);
    const celdas = await pool.query('SELECT concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad FROM programa_version_celda WHERE programa_version_id = $1 ORDER BY concepto_clave, periodo_numero', [versionId]);
    const { created_by, residente_id, superintendente_id, supervision_id, ...version } = v.rows[0];
    return res.status(200).json({ version, conceptos: conceptos.rows, celdas: celdas.rows });
  } catch (err) { console.error('[detalleVersion]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/convenios/contrato/:id — crear un convenio modificatorio (transaccional).
// Body: { tipo, motivo, folio?, conceptos?:[{clave,concepto,unidad,cantidad,pu}], celdas?:[{clave,periodoNumero,cantidad}], plazo_nuevo_dias? }
async function crearConvenio(req, res) {
  const contratoId = Number(req.params.id);
  if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(404).json({ error: 'Contrato no encontrado' });
  const body = req.body || {};
  const tipo = String(body.tipo || '').trim();
  let motivo = (body.motivo != null ? String(body.motivo).trim() : '') || null;
  const oficio = body.oficio != null ? String(body.oficio).trim() : ''; // FIX 22-jun (a): oficio de soporte (previo)
  const folio = body.folio != null ? String(body.folio).trim() : null;
  const conceptos = Array.isArray(body.conceptos) ? body.conceptos : [];
  const celdas = Array.isArray(body.celdas) ? body.celdas : [];
  const plazoNuevo = Number.isInteger(Number(body.plazo_nuevo_dias)) && Number(body.plazo_nuevo_dias) > 0 ? Number(body.plazo_nuevo_dias) : null;

  if (!['monto', 'plazo', 'programa', 'mixto'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido (monto|plazo|programa|mixto)' });
  if (!motivo) return res.status(400).json({ error: 'El motivo (razones fundadas y explícitas / dictamen técnico, art. 99 RLOPSRM) es obligatorio' });
  // FIX 22-jun (profe): (a) SUBIR SOPORTES ANTES — sin el oficio de solicitud/autorización NO procede el
  // convenio (el soporte documental es PREVIO a capturarlo; art. 99 RLOPSRM exige el dictamen/soporte). Se
  // exige la REFERENCIA del oficio al promover; el PDF se adjunta con subirOficioConvenio. La referencia
  // queda asentada en el motivo (sin columna nueva en el esquema congelado).
  if (!oficio) return res.status(409).json({ error: 'Sube/indica primero el oficio de solicitud o autorización del convenio: el soporte es previo a capturarlo (art. 99 RLOPSRM).', requiereOficio: true });
  motivo = `[Oficio de soporte: ${oficio}] ${motivo}`;
  // ── MATRIZ POR TIPO (art. 59 LOPSRM) ────────────────────────────────────────────────────────────────
  //   programa: catálogo CONGELADO · reacomoda calendario · NO añade periodos
  //   monto   : ajusta CANTIDAD (cajita +/−) · reacomoda · NO añade periodos
  //   plazo   : catálogo CONGELADO · reacomoda · AÑADE periodos
  //   mixto   : ajusta CANTIDAD · reacomoda · AÑADE periodos
  // Diferencias reales: solo monto/mixto cambian cantidades; solo plazo/mixto añaden periodos; los 4
  // reacomodan el calendario (y en los 4 los periodos ACTUAL/PASADOS son intocables — regla de oro, abajo).
  const ajustaCantidad = ['monto', 'mixto'].includes(tipo); // la cajita cambia la CANTIDAD (totales)
  const tocaPlazo = ['plazo', 'mixto'].includes(tipo);       // extiende plazo → añade periodos (D4)
  // El PROGRAMA (catálogo + calendario) se envía para REACOMODAR — los 4 tipos pueden. Obligatorio para
  // monto/programa/mixto; OPCIONAL para plazo (si viene, reacomoda con el catálogo congelado).
  const traePrograma = conceptos.length > 0 && celdas.length > 0;
  const requierePrograma = ['monto', 'programa', 'mixto'].includes(tipo);
  if (requierePrograma && !traePrograma) return res.status(400).json({ error: 'Para un convenio de monto/programa/mixto, envía el catálogo (conceptos) y el programa (celdas) NUEVOS completos' });
  if (tocaPlazo && plazoNuevo == null) return res.status(400).json({ error: 'Para un convenio de plazo, envía plazo_nuevo_dias (> 0)' });
  // P4 (22-jun) — cota máxima de plazo: la ley NO fija tope numérico (art. 59 / 59 Bis no fijan máximo) → criterio
  // de diseño. Evita el RangeError de Date (JS desborda ~100M días) devolviendo 400 claro en lugar de 500.
  const PLAZO_MAX_DIAS = 36500; // ~100 años: holgado para cualquier obra real
  if (plazoNuevo != null && plazoNuevo > PLAZO_MAX_DIAS) return res.status(400).json({ error: `El plazo del convenio (${plazoNuevo} días) excede el máximo permitido (${PLAZO_MAX_DIAS} días ≈ 100 años); revisa el dato.` });
  for (const c of conceptos) {
    if (!c.clave || !(Number(c.cantidad) >= 0) || !(Number(c.pu) >= 0)) return res.status(400).json({ error: 'Cada concepto requiere clave, cantidad >= 0 y pu >= 0' });
  }
  // Rechazar claves DUPLICADAS en el body: inflarían el monto y la clasificación del registro inmutable.
  const clavesBody = conceptos.map((c) => String(c.clave));
  if (new Set(clavesBody).size !== clavesBody.length) return res.status(400).json({ error: 'El catálogo nuevo tiene claves repetidas' });

  let client;
  try {
    client = await pool.connect();
    try {
      await ensureRegistradoPor().catch(() => {}); // BUG #13: garantiza la columna registrado_por (aditiva)
      await client.query('BEGIN');
      // Lock al INICIO (mismo classid 2 que guardarMatriz/HU-12) → catálogo + re-cuadre atómicos.
      await client.query('SELECT pg_advisory_xact_lock(2, $1::int)', [contratoId]);

      const cres = await client.query('SELECT id, created_by, residente_id, superintendente_id, supervision_id, monto, plazo_dias, fecha_inicio FROM contratos WHERE id = $1 FOR UPDATE', [contratoId]);
      if (cres.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Contrato no encontrado' }); }
      const contrato = cres.rows[0];
      // Autoridad (criterio del equipo, default conservador): dependencia o residente asignado/creador
      // (art. 99: el residente sustenta el dictamen técnico; el servidor que firmó el contrato lo suscribe).
      const puede = req.user.rol === 'dependencia' || contrato.residente_id === req.user.id || contrato.created_by === req.user.id;
      if (!puede) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo la dependencia o el residente asignado puede registrar convenios' }); }
      // FIX #3 (22-jun) — contrato cerrado (finiquito) = SOLO-LECTURA (art. 64 LOPSRM).
      if (await contratoCerrado(client, contratoId)) { await client.query('ROLLBACK'); return res.status(409).json({ error: msgCerrado('no se registran convenios') }); }
      // P23 (22-jun) — el profe exige bitácora abierta ANTES de registrar el convenio (art. 122 RLOPSRM: "el uso de
      // la Bitácora es obligatorio"). Antes se permitía y la nota se difería; ahora se exige (mismo patrón de "atraso").
      const bitConv = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [contratoId]);
      if (bitConv.rowCount === 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'El contrato no tiene bitácora abierta; ábrela primero para registrar el convenio (art. 122 RLOPSRM).' }); }

      const montoAnterior = contrato.monto;   // string NUMERIC
      const plazoAnterior = contrato.plazo_dias;

      // REGLA DE ORO (B8.2, transversal a los 4 tipos): los periodos ACTUAL y PASADOS son INTOCABLES; solo el
      // FUTURO es editable. Protege lo ya ejecutado/estimado (#14/#24) y las FKs. Se snapshotea el programa
      // VIGENTE por concepto×periodo ANTES de mutar; en (F) se exige que las celdas de periodos no-futuros
      // (inicio <= CURRENT_DATE, fecha REAL del servidor) NO cambien respecto a este snapshot.
      const storedCeldas = new Map(); // `${contrato_concepto_id}:${contrato_periodo_id}` -> cantidad vigente

      // (A) Pre-validación del programa ANTES de mutar (rechazo temprano sin tocar datos).
      if (traePrograma) {
        const conNull = await client.query('SELECT 1 FROM contrato_conceptos WHERE contrato_id=$1 AND clave IS NULL LIMIT 1', [contratoId]);
        if (conNull.rowCount > 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Este contrato tiene conceptos sin clave; no es modificable por convenio hasta clasificarlos' }); }
        const progVig = await client.query(
          `SELECT po.contrato_concepto_id AS cc, po.contrato_periodo_id AS pid, po.cantidad
             FROM programa_obra po JOIN contrato_conceptos cc ON cc.id = po.contrato_concepto_id
            WHERE cc.contrato_id = $1`, [contratoId]);
        for (const r of progVig.rows) storedCeldas.set(`${r.cc}:${r.pid}`, Number(r.cantidad));
        // Criterio de diseño del equipo (sin cita legal directa; el art. 118 trata trabajos excedentes, no
        // reducciones): una cantidad contratada NUEVA no puede quedar por debajo de lo YA estimado.
        const acum = await client.query(
          `SELECT cc.clave, COALESCE(SUM(eg.cantidad_periodo),0) AS estimado
             FROM contrato_conceptos cc
             JOIN estimacion_generadores eg ON eg.contrato_concepto_id = cc.id
             JOIN estimaciones e ON e.id = eg.estimacion_id AND e.estado <> 'rechazada'
            WHERE cc.contrato_id = $1 GROUP BY cc.clave`, [contratoId]);
        const estimadoPorClave = new Map(acum.rows.map((r) => [r.clave, Number(r.estimado)]));
        for (const c of conceptos) {
          const ya = estimadoPorClave.get(String(c.clave)) || 0;
          if (Number(c.cantidad) + 1e-9 < ya) { await client.query('ROLLBACK'); return res.status(400).json({ error: `El concepto "${c.clave}" no puede reducirse a ${c.cantidad}: ya hay ${ya} estimado (no se reduce un concepto por debajo de lo ya estimado)` }); }
        }
        // El catálogo nuevo debe incluir TODOS los conceptos existentes (catálogo completo).
        const existentes = await client.query('SELECT clave FROM contrato_conceptos WHERE contrato_id = $1', [contratoId]);
        const clavesNuevas = new Set(clavesBody);
        const faltan = existentes.rows.filter((r) => !clavesNuevas.has(String(r.clave))).map((r) => r.clave);
        if (faltan.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: `El catálogo nuevo debe incluir TODOS los conceptos existentes; faltan: ${faltan.join(', ')}` }); }
        // Variación de monto: CRITERIO DEL EQUIPO — superar el 25% (LIMITE_PCT) ya NO bloquea. Se registra
        // el convenio y se devuelve un AVISO (`aviso_variacion` en la respuesta), referido al art. 59 LOPSRM
        // (modificación de contratos). La clasificación SFP (RLOPSRM art. 102) se calcula abajo (reqSfp).
      }
      // Variación de plazo: mismo criterio — superar el 25% AVISA, no bloquea (art. 59 LOPSRM); ver
      // `aviso_variacion` en la respuesta.

      // (B) Snapshot perezoso de v1 (estado VIVO ORIGINAL) ANTES de mutar — solo si toca el programa.
      let numeroVer = Number((await client.query('SELECT COALESCE(MAX(numero),0) AS m FROM programa_version WHERE contrato_id = $1', [contratoId])).rows[0].m);
      if (traePrograma && numeroVer === 0) { await snapshotVersion(client, contratoId, 1, null, true); numeroVer = 1; }

      // (C) Aplicar la modificación al estado VIVO.
      let montoNuevo = montoAnterior;
      let plazoNuevoFinal = plazoAnterior;
      let periodosAnadidos = null; // D4 (B8): resultado del append de periodos por ampliación de plazo
      const idPorClave = new Map();
      const clavesAdicionales = new Set(); // FIX 22-jun: claves de conceptos NUEVOS (adicionales del convenio)
      if (tocaPlazo) {
        plazoNuevoFinal = plazoNuevo;
        const ft = contrato.fecha_inicio ? new Date(new Date(contrato.fecha_inicio).getTime() + (plazoNuevoFinal - 1) * 86400000).toISOString().slice(0, 10) : null;
        await client.query('UPDATE contratos SET plazo_dias=$1, fecha_termino=COALESCE($2,fecha_termino) WHERE id=$3', [plazoNuevoFinal, ft, contratoId]);
        // D4 (B8): si el plazo AUMENTA, se AÑADEN periodos al final del programa (append-only). Nunca se
        // modifican/borran periodos existentes: los que ya tienen avance/estimación quedan intactos (los
        // fixes #14/#24 no se tocan). Los periodos nuevos quedan disponibles para reacomodar en ellos el
        // volumen NO ejecutado (vía el programa / un convenio de programa posterior). Si el plazo se reduce
        // o el término no avanza, no se agrega nada (los periodos pasados con avance nunca se eliminan).
        if (plazoNuevoFinal > plazoAnterior && contrato.fecha_inicio) {
          periodosAnadidos = await extenderPeriodosPorPlazo(client, contratoId, contrato.fecha_inicio, plazoNuevoFinal);
        }
      }
      if (traePrograma) {
        const existing = await client.query('SELECT id, clave, cantidad, pu FROM contrato_conceptos WHERE contrato_id = $1', [contratoId]);
        const datosPorClave = new Map();
        for (const r of existing.rows) { idPorClave.set(String(r.clave), r.id); datosPorClave.set(String(r.clave), { cantidad: Number(r.cantidad), pu: Number(r.pu) }); }
        let maxOrden = (await client.query('SELECT COALESCE(MAX(orden),0) AS m FROM contrato_conceptos WHERE contrato_id = $1', [contratoId])).rows[0].m;
        for (const c of conceptos) {
          if (idPorClave.has(String(c.clave))) {
            // BUG #11 (Oleada 3, decisión de Maiki): por convenio se AJUSTAN (amplían/reducen) los conceptos
            // EXISTENTES. El P.U. NO cambia (las cantidades se pagan al precio unitario pactado, art. 59
            // LOPSRM); solo la CANTIDAD. (Invierte el criterio previo "congelar original + adicional": ahora
            // se prohíben los conceptos nuevos y se permite ajustar la cantidad del existente.)
            const orig = datosPorClave.get(String(c.clave));
            if (Math.abs(Number(c.pu) - orig.pu) > 1e-4) {
              await client.query('ROLLBACK');
              return res.status(409).json({ error: `El P.U. del concepto "${c.clave}" no se modifica por convenio (se paga al precio unitario pactado, art. 59 LOPSRM): PU ${orig.pu}. Por convenio solo se ajusta la CANTIDAD o el plazo.`, conceptoPuCongelado: String(c.clave) });
            }
            // La CANTIDAD solo la ajustan MONTO y MIXTO (la "cajita" +/−). En PROGRAMA y PLAZO el catálogo va
            // CONGELADO: solo se reacomoda el calendario, los totales no cambian (matriz por tipo, art. 59 LOPSRM).
            if (Math.abs(Number(c.cantidad) - orig.cantidad) > 1e-6) {
              if (!ajustaCantidad) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Un convenio de ${tipo.toUpperCase()} no cambia cantidades: el catálogo va CONGELADO (solo se reacomoda el calendario). El concepto "${c.clave}" pasa de ${orig.cantidad} a ${c.cantidad}. Usa un convenio de MONTO o MIXTO para modificar cantidades.`, conceptoCantidadCambia: String(c.clave) });
              }
              await client.query('UPDATE contrato_conceptos SET cantidad=$1::numeric(14,3) WHERE id=$2', [c.cantidad, idPorClave.get(String(c.clave))]);
            }
            // Sin cambios → NO-OP.
          } else {
            // BUG #11 — PROHIBIDO agregar conceptos NUEVOS por convenio (decisión de Maiki): un convenio
            // modifica el contrato existente (art. 59 LOPSRM: dentro del objeto contratado), no introduce
            // conceptos fuera del catálogo. Solo se ajustan los existentes (cantidad) o el plazo.
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `El convenio no puede agregar el concepto nuevo "${c.clave}": por convenio solo se AJUSTAN (ampliar/reducir la cantidad) los conceptos existentes o se cambia el plazo (art. 59 LOPSRM). No se agregan conceptos nuevos.`, conceptoNuevoProhibido: String(c.clave) });
          }
        }
        // Monto CANÓNICO desde el catálogo VIVO (fuente única, al centavo) y sincroniza la cabecera.
        montoNuevo = (await client.query('SELECT COALESCE(SUM(ROUND(cantidad*pu,2)),0)::numeric(18,2) AS m FROM contrato_conceptos WHERE contrato_id=$1', [contratoId])).rows[0].m;
        await client.query('UPDATE contratos SET monto=$1 WHERE id=$2', [montoNuevo, contratoId]);
      }

      // (D) Deltas y clasificación CANÓNICOS (NUMERIC en SQL la división de monto) desde el estado YA
      //     modificado. El convenio SIEMPRE se funda en art. 59 (el 59 Bis es un derecho adicional).
      const deltaMontoPct = (await client.query('SELECT CASE WHEN $2::numeric>0 THEN ROUND((($1::numeric-$2::numeric)/$2::numeric)*100,2) ELSE NULL END AS d', [montoNuevo, montoAnterior])).rows[0].d;
      const deltaPlazoPct = (tocaPlazo && plazoAnterior > 0) ? (((plazoNuevoFinal - plazoAnterior) / plazoAnterior) * 100).toFixed(2) : null;
      const absM = deltaMontoPct != null ? Math.abs(Number(deltaMontoPct)) : null;
      const absP = deltaPlazoPct != null ? Math.abs(Number(deltaPlazoPct)) : null;
      const reqSfp = (absM != null && absM > UMBRAL_SFP) || (absP != null && absP > UMBRAL_SFP);
      const reqAjuste = (absM != null && absM > UMBRAL_AJUSTE) || (absP != null && absP > UMBRAL_AJUSTE);
      // AVISO de variación (criterio del equipo): superar el 25% (LIMITE_PCT) del monto o el plazo NO
      // bloquea; marca un aviso referido al art. 59 LOPSRM. Parametrizable (CONVENIO_LIMITE_VARIACION_PCT).
      const avisoVariacion = (LIMITE_PCT > 0) && ((absM != null && absM > LIMITE_PCT) || (absP != null && absP > LIMITE_PCT));
      const fundamento = 'art59';

      // (E) Registrar el convenio (INMUTABLE) con el monto/delta CANÓNICOS.
      const numeroConv = Number((await client.query('SELECT COALESCE(MAX(numero),0)+1 AS n FROM convenios_modificatorios WHERE contrato_id = $1', [contratoId])).rows[0].n);
      const folioFinal = folio || `CM-${String(numeroConv).padStart(3, '0')}`;

      // O6 — NOTA AUTOMÁTICA de bitácora del convenio (art. 123 fr. III / 125 fr. I RLOPSRM). Si HAY
      // bitácora abierta se asienta EN VIVO (folio atómico) y se LIGA en el INSERT (nota_id) — se crea
      // ANTES del INSERT para NO necesitar un UPDATE (el trigger de inmutabilidad solo permite ligar la
      // nota una vez). Si NO hay bitácora, se DIFIERE (nota_id NULL) y se asentará al abrir la bitácora
      // (abrirBitacora). Emisor = el RESIDENTE del contrato (nota de consecuencia, art. 53 LOPSRM +
      // art. 125 fr. I g RLOPSRM; ver más abajo). Todo en la MISMA
      // transacción: si el re-cuadre (F) falla, también revierte la nota.
      const bit = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [contratoId]);
      let notaConv = null;
      if (bit.rowCount > 0) {
        const { asunto, contenido } = textoNotaConvenio({
          folio: folioFinal, tipo, deltaMontoPct, deltaPlazoPct, motivo, diferida: false
        });
        // O-PROFE: la nota del CONVENIO es de CONSECUENCIA → la AVALA el RESIDENTE del contrato (art. 53
        // LOPSRM), no quien registra (puede ser dependencia). Emisor = residente_id del contrato.
        notaConv = await insertarNotaAtomica(client, {
          bitacoraId: bit.rows[0].id, tipo: 'res_convenios', asunto, contenido,
          emisorId: contrato.residente_id || req.user.id, tag: 'convenio'
        });
      }

      // ITEM 3.2 (art. 59 párr. 3 LOPSRM): el convenio NACE 'registrado' con autorizado_por=NULL. El ACTO
      // de autorización (sella autorizado_por/autorizado_en) lo hace después el servidor FACULTADO vía
      // POST /:convenioId/autorizar (autorizarConvenio). Separa el registro/sustento (residente, art. 99
      // p1) del acto formal de autorización (servidor facultado, art. 59 p3 + art. 99 p5).
      const conv = await client.query(
        `INSERT INTO convenios_modificatorios
           (contrato_id, numero, folio, tipo, fundamento, motivo, monto_anterior, monto_nuevo,
            plazo_anterior_dias, plazo_nuevo_dias, delta_monto_pct, delta_plazo_pct,
            requiere_revision_sfp, requiere_ajuste_costos, estado, autorizado_por, nota_id, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'registrado',NULL,$15,$16) RETURNING id`,
        [contratoId, numeroConv, folioFinal, tipo, fundamento, motivo,
         montoAnterior, montoNuevo, plazoAnterior, plazoNuevoFinal, deltaMontoPct, deltaPlazoPct, reqSfp, reqAjuste,
         notaConv ? notaConv.id : null, req.user.id] // BUG #13: registrado_por = JWT (separación de funciones)
      );
      const convenioId = conv.rows[0].id;

      // (F) Re-cuadre del programa + nueva versión (solo si trae programa).
      let nuevaVerId = null;
      if (traePrograma) {
        // Periodos vigentes (incluye los recién añadidos por plazo). es_futuro = inicio > HOY REAL del servidor
        // (nunca la fecha simulada del selector: las escrituras usan la fecha real).
        const periodos = await client.query('SELECT id, numero, (inicio > CURRENT_DATE) AS es_futuro FROM contrato_periodos WHERE contrato_id = $1', [contratoId]);
        const idPorPeriodo = new Map(periodos.rows.map((r) => [Number(r.numero), r.id]));
        const esFuturoPorId = new Map(periodos.rows.map((r) => [Number(r.id), r.es_futuro]));
        const numeroPorId = new Map(periodos.rows.map((r) => [Number(r.id), Number(r.numero)]));
        const celdasResueltas = [];
        const incoming = new Map(); // `${ccId}:${pId}` -> cantidad entrante
        for (const cel of celdas) {
          const ccId = idPorClave.get(String(cel.clave));
          const pId = idPorPeriodo.get(Number(cel.periodoNumero));
          if (!ccId) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Celda de clave inexistente "${cel.clave}"` }); }
          if (!pId) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Celda de periodo inexistente #${cel.periodoNumero}` }); }
          celdasResueltas.push({ contrato_concepto_id: ccId, contrato_periodo_id: pId, cantidad: cel.cantidad });
          incoming.set(`${ccId}:${pId}`, Number(cel.cantidad));
        }
        // REGLA DE ORO: en los periodos ACTUAL/PASADOS (no-futuros) las celdas NO pueden cambiar respecto al
        // programa vigente (solo se reacomoda el trabajo FUTURO). Protege lo ya ejecutado/estimado y las FKs;
        // vale para los 4 tipos (incluida la cajita de monto/mixto: el delta va a periodos futuros).
        const claves = new Set([...storedCeldas.keys(), ...incoming.keys()]);
        for (const key of claves) {
          const pId = Number(key.split(':')[1]);
          if (esFuturoPorId.get(pId)) continue; // el FUTURO sí es editable
          const antes = storedCeldas.get(key) || 0;
          const ahora = incoming.get(key) || 0;
          if (Math.abs(ahora - antes) > 1e-6) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: `No se puede modificar el periodo #${numeroPorId.get(pId)}: es un periodo ACTUAL o PASADO. Solo se reacomoda el trabajo de periodos FUTUROS (protege lo ya ejecutado/estimado).`, periodoNoFuturo: numeroPorId.get(pId) });
          }
        }
        await guardarMatriz(client, contratoId, celdasResueltas, { convenioId });  // re-cuadre, exento del freeze
        await client.query('UPDATE programa_version SET vigente=false, supersedido_en=NOW() WHERE contrato_id=$1 AND vigente', [contratoId]);
        nuevaVerId = await snapshotVersion(client, contratoId, numeroVer + 1, convenioId, true);
      }

      await client.query('COMMIT');
      // nota_diferida: el convenio quedó registrado pero aún no hay bitácora → su nota se asienta al abrir.
      const notaDiferida = bit.rowCount === 0;
      return res.status(201).json({
        ok: true, contrato_id: contratoId, convenio_id: convenioId, numero: numeroConv, tipo, fundamento, folio: folioFinal,
        monto_anterior: montoAnterior, monto_nuevo: montoNuevo, plazo_anterior_dias: plazoAnterior, plazo_nuevo_dias: plazoNuevoFinal,
        delta_monto_pct: deltaMontoPct != null ? Number(deltaMontoPct) : null, delta_plazo_pct: deltaPlazoPct != null ? Number(deltaPlazoPct) : null,
        requiere_revision_sfp: reqSfp, requiere_ajuste_costos: reqAjuste, programa_version_id: nuevaVerId,
        periodos_anadidos: periodosAnadidos ? periodosAnadidos.anadidos : 0, // D4 (B8): periodos añadidos al final

        // ITEM 3.2: el convenio queda REGISTRADO; el acto de autorización del servidor facultado es posterior.
        estado: 'registrado',
        aviso_autorizacion: 'El convenio quedó REGISTRADO; pendiente de AUTORIZACIÓN del servidor facultado (dependencia) — art. 59 párr. 3 LOPSRM.',
        aviso_variacion: avisoVariacion
          ? `La variación supera el ${LIMITE_PCT}% del monto o plazo original: se registra el convenio (es un AVISO, no un bloqueo). Modificación fundada en el art. 59 LOPSRM; el umbral del 25% es referencia administrativa de revisión (RLOPSRM art. 102).`
          : null,
        nota: notaConv ? { id: notaConv.id, numero: notaConv.numero, tipo: notaConv.tipo, tag: notaConv.tag } : null,
        nota_diferida: notaDiferida,
        aviso: notaDiferida ? 'El convenio quedó registrado; su nota de bitácora se asentará automáticamente al abrir la bitácora.' : null
      });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      if (e && e.code === 'PROGRAMA_DESCUADRE') return res.status(400).json({ error: e.message, detalles: e.detalles });
      if (e && (e.code === 'PROGRAMA_AJENO' || e.code === 'PROGRAMA_CONGELADO')) return res.status(409).json({ error: e.message });
      if (e && e.code === '22003') return res.status(400).json({ error: 'El monto del convenio desborda el rango permitido' });
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('[crearConvenio]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/convenios/:convenioId/autorizar — ACTO formal de AUTORIZACIÓN del servidor FACULTADO.
// ITEM 3.2 (Oleada 3). Fundamento verificado en docs/legal: LOPSRM art. 59 párr. 3 (el convenio debe
// ser AUTORIZADO por la persona servidora pública facultada en los lineamientos, art. 1 Quinquies) +
// RLOPSRM art. 99 párr. 5 (suscripción por el servidor facultado, distinto del residente que sustenta el
// dictamen, art. 99 p1) + art. 102 fr. I-III (variación > 25% exige autorización/soporte = oficio).
// El rol facultado se mapea a 'dependencia' (servidor que firma/suscribe el contrato). Append-only: sella
// estado='autorizado' + autorizado_por + autorizado_en (una sola vez; el trigger blinda la transición).
//
// ALCANCE (Etapa 1): este acto SELLA la autorización. La modificación MATERIAL del programa/monto se
// aplica HOY en el registro (crearConvenio) como antes; diferir el EFECTO material hasta este punto exige
// rehacer cómo HU-12/HU-06 leen el catálogo vivo → follow-on para Maiki (documentado en el reporte).
async function autorizarConvenio(req, res) {
  const convenioId = Number(req.params.convenioId);
  if (!Number.isInteger(convenioId) || convenioId <= 0) return res.status(400).json({ error: 'convenio inválido' });
  // AUTORIDAD = servidor facultado (art. 59 p3 + art. 99 p5; coincide con permisos.js HU-03 nivel 'E').
  if (req.user.rol !== 'dependencia') return res.status(403).json({ error: 'Solo el servidor facultado (dependencia) puede autorizar el convenio (art. 59 LOPSRM)' });
  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureRegistradoPor().catch(() => {}); // BUG #13: la columna registrado_por debe existir para el chequeo
      const cv = await client.query(
        `SELECT cm.id, cm.contrato_id, cm.estado, cm.delta_monto_pct, cm.delta_plazo_pct, cm.registrado_por,
                c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
           FROM convenios_modificatorios cm JOIN contratos c ON c.id = cm.contrato_id
          WHERE cm.id = $1 FOR UPDATE OF cm`, [convenioId]);
      if (cv.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Convenio no encontrado' }); }
      const conv = cv.rows[0];
      if (!esParteOSupervision(req.user, conv)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No tienes acceso a este convenio' }); }
      if (conv.estado !== 'registrado') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'El convenio ya está autorizado; el acto de autorización es único (art. 59 LOPSRM)' }); }
      // D1 (01-jul, DECISIÓN de Maiki) — la SEPARACIÓN DE FUNCIONES del bug #13 (oleada 3) se RELAJA: la
      // DEPENDENCIA es la autoridad ÚNICA del convenio y puede REGISTRAR/promover Y AUTORIZAR el mismo
      // convenio. Se ELIMINA el bloqueo `autorizado_por === registrado_por` que impedía a la dependencia
      // autorizar lo que ella misma promovió. `registrado_por` se sigue persistiendo (rastro de auditoría:
      // quién promovió), pero YA NO bloquea. El requisito real (art. 59 párr. 3 LOPSRM) se mantiene: solo el
      // servidor facultado (rol 'dependencia') autoriza — ese gate de rol sigue arriba. La confirmación
      // "¿estás seguro?" se pide en el frontend (Mockup M1) para que el acto definitivo sea consciente.
      // FIX #3 (22-jun) — contrato cerrado (finiquito) = SOLO-LECTURA (art. 64 LOPSRM).
      if (await contratoCerrado(client, conv.contrato_id)) { await client.query('ROLLBACK'); return res.status(409).json({ error: msgCerrado('no se autorizan convenios') }); }

      // H7-B7-2 (25-jun, decisión de Maik) — exigir el oficio/soporte de aprobación (PDF) cargado para autorizar
      // TODO convenio (no solo >25%), conforme art. 99 RLOPSRM (soporte/dictamen previo de cualquier convenio).
      // El umbral del 25% (art. 102) ya no condiciona la EXIGENCIA del documento; sigue marcando el aviso SFP aparte.
      const ofi = await client.query('SELECT 1 FROM contrato_documentos WHERE convenio_id = $1 LIMIT 1', [convenioId]);
      if (ofi.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Antes de autorizar, carga el oficio/soporte de aprobación del convenio en PDF (art. 99 RLOPSRM: todo convenio requiere su soporte documental).' });
      }

      const upd = await client.query(
        `UPDATE convenios_modificatorios SET estado = 'autorizado', autorizado_por = $2, autorizado_en = NOW()
           WHERE id = $1 RETURNING id, estado, autorizado_por, autorizado_en`,
        [convenioId, req.user.id]);
      await client.query('COMMIT');
      return res.status(200).json({ ok: true, ...upd.rows[0] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('[autorizarConvenio]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/convenios/:convenioId/oficio — sube el OFICIO DE APROBACIÓN del convenio (PDF en BYTEA).
// Revisión profe 16-jun: "el soporte es que te lo aprobaron… falta la sección del documento de
// aprobación, es un oficio". Se REUSA contrato_documentos (tipo='oficio_convenio', ligado por
// convenio_id). Append-only: UN oficio por convenio, inmutable. Autoridad = la misma que registra el
// convenio (dependencia o residente/creador del contrato). El archivo lo recibe multer (req.file).
async function subirOficioConvenio(req, res) {
  try {
    const convenioId = Number(req.params.convenioId);
    if (!Number.isInteger(convenioId) || convenioId <= 0) return res.status(400).json({ error: 'convenio inválido' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Falta el archivo PDF (campo "documento")' });
    const { buffer, originalname, mimetype, size } = req.file;
    // Backstop: revalidar magic bytes %PDF (no confiar solo en el mimetype declarado).
    if (!(buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)) {
      return res.status(400).json({ error: 'El archivo no es un PDF válido' });
    }
    const cv = await pool.query(
      `SELECT cm.id, cm.contrato_id, c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM convenios_modificatorios cm JOIN contratos c ON c.id = cm.contrato_id WHERE cm.id = $1`, [convenioId]);
    if (cv.rowCount === 0) return res.status(404).json({ error: 'Convenio no encontrado' });
    const row = cv.rows[0];
    // Autoridad (= crearConvenio): la aprobación la sustenta la dependencia o el residente/creador (art. 99).
    const puede = req.user.rol === 'dependencia' || row.residente_id === req.user.id || row.created_by === req.user.id;
    if (!puede) return res.status(403).json({ error: 'Solo la dependencia o el residente asignado puede subir el oficio de aprobación del convenio' });
    // Append-only: un oficio por convenio (inmutable; el índice parcial uq_contrato_doc_oficio_convenio lo respalda).
    const ya = await pool.query('SELECT id FROM contrato_documentos WHERE convenio_id = $1 LIMIT 1', [convenioId]);
    if (ya.rowCount > 0) return res.status(409).json({ error: 'El convenio ya tiene su oficio de aprobación; es inmutable y no se reemplaza' });
    const r = await pool.query(
      `INSERT INTO contrato_documentos (contrato_id, convenio_id, tipo, nombre, mime, tamano, contenido)
       VALUES ($1, $2, 'oficio_convenio', $3, $4, $5, $6)
       RETURNING id, nombre, mime, tamano, subido_en`,
      [row.contrato_id, convenioId, originalname, mimetype, size, buffer]);
    return res.status(201).json(r.rows[0]);
  } catch (err) { console.error('[subirOficioConvenio]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/convenios/:convenioId/oficio — visualiza/descarga el oficio de aprobación (acotado por participación).
async function descargarOficioConvenio(req, res) {
  try {
    const convenioId = Number(req.params.convenioId);
    if (!Number.isInteger(convenioId) || convenioId <= 0) return res.status(400).json({ error: 'convenio inválido' });
    const cv = await pool.query(
      `SELECT cm.contrato_id, c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM convenios_modificatorios cm JOIN contratos c ON c.id = cm.contrato_id WHERE cm.id = $1`, [convenioId]);
    if (cv.rowCount === 0) return res.status(404).json({ error: 'Convenio no encontrado' });
    if (!esParteOSupervision(req.user, cv.rows[0])) return res.status(403).json({ error: 'No tienes acceso a este convenio' });
    const r = await pool.query(
      'SELECT nombre, mime, tamano, contenido FROM contrato_documentos WHERE convenio_id = $1 ORDER BY subido_en DESC LIMIT 1', [convenioId]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Este convenio no tiene oficio de aprobación cargado' });
    const doc = r.rows[0];
    res.setHeader('Content-Type', doc.mime || 'application/pdf');
    res.setHeader('Content-Length', doc.tamano);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.nombre || 'oficio.pdf')}"`);
    return res.status(200).send(doc.contenido);
  } catch (err) { console.error('[descargarOficioConvenio]', err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = { listarConvenios, detalleVersion, crearConvenio, autorizarConvenio, subirOficioConvenio, descargarOficioConvenio };
