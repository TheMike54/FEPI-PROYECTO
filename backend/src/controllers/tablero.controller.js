// HU-17 (Equipo 3): Tablero de estimaciones. Vista AGREGADA del ciclo de las
// estimaciones, acotada por participación (lib/acceso.js): los roles operativos
// (residente, contratista, supervisión) solo ven los contratos donde son parte;
// dependencia y finanzas ven todos (ROLES_VEN_TODO).
//
// Es SOLO LECTURA: no muta nada. NO toca el core de estimación (HU-12, congelado);
// se construye ALREDEDOR leyendo la carátula ya calculada (subtotal/neto) y el
// estado del ciclo. Toda agregación (conteos y MONTOS por estado y por contrato)
// se hace SERVER-SIDE — fuente única de verdad — usando los montos EXACTOS que
// HU-12 congeló al integrar (cuadre al centavo).
//
// Forward-compatible: hoy las estimaciones nacen 'integrada' y casi no avanzan
// (el ciclo enviada/autorizada/pagada lo cierran HU-13/15/20/21). Las
// agregaciones recorren los CINCO estados válidos del CHECK de schema.sql, así
// que se enriquecen solas cuando el ciclo empiece a producir esos estados.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
// LENTE DE SIMULACIÓN — SOLO LECTURA: "hoy" simulado opcional (?fecha_ref) para la antigüedad en estado.
const { fechaRefDe } = require('../lib/fechaRef');

// Catálogo canónico de estados. Son EXACTAMENTE los del CHECK de
// estimaciones.estado en schema.sql (integrada/enviada/autorizada/pagada/rechazada).
// RECONCILIACIÓN O7↔HU-15 (11-jun): con HU-15 integrado, el flujo REAL del art. 54 es: el contratista
// INTEGRA (HU-12) y PRESENTA (HU-13, integrada->enviada="Presentada"); SUPERVISIÓN revisa/turna y la
// RESIDENCIA autoriza/rechaza (HU-15, enviada->autorizada/rechazada); finanzas PAGA (HU-21). SOLO cambian
// etiquetas y next-actor (sin migrar datos). `responsable` = rol que debe ACTUAR a continuación:
//   · integrada  (Integrada)  -> el contratista PRESENTA (HU-13; PERMISOS[HU-13].contratista='E')
//   · enviada    (Presentada) -> SUPERVISIÓN revisa/turna y RESIDENCIA autoriza/rechaza (HU-15)
//   · autorizada (Autorizada) -> finanzas registra el pago (HU-21; finanzas 'E')
//   · pagada     -> terminal, sin siguiente actor
//   · rechazada  -> contratista reingresa (HU-16; contratista 'E')
// `enGrid`: CA-1 — el tablero NO muestra 'rechazada' en el grid (vive en HU-14); sí cuenta como métrica.
const ESTADOS = [
  { estado: 'integrada',  etiqueta: 'Integrada',  responsable: 'contratista', enGrid: true },
  { estado: 'enviada',    etiqueta: 'Presentada', responsable: 'supervision', enGrid: true },
  { estado: 'autorizada', etiqueta: 'Autorizada', responsable: 'finanzas',    enGrid: true },
  { estado: 'pagada',     etiqueta: 'Pagada',     responsable: null,          enGrid: true },
  { estado: 'rechazada',  etiqueta: 'Rechazada',  responsable: 'contratista', enGrid: false },
];
const ESTADO_META = new Map(ESTADOS.map((e) => [e.estado, e]));

// Mis pendientes: estado actual -> rol(es) que deben actuar + acción concreta (reconciliación O7↔HU-15).
// Anclado a la máquina de estados y a PERMISOS (frontend/src/data/permisos.js).
// Una estimación es "pendiente" de un usuario si su estado exige una acción que SU rol ejecuta.
const PENDIENTE_POR_ESTADO = {
  integrada:  { roles: ['contratista'],              accion: 'Presentar la estimación (art. 54 LOPSRM, HU-13)' },
  enviada:    { roles: ['supervision', 'residente'], accion: 'Revisar/turnar y autorizar la estimación presentada (HU-15)' },
  autorizada: { roles: ['finanzas'],                 accion: 'Registrar el pago de la estimación autorizada (HU-21)' },
  rechazada:  { roles: ['contratista'],              accion: 'Reingresar la estimación rechazada (HU-16)' },
};

// Centavos como número, para sumar sin perder precisión y reformatear al final.
const N = (x) => Number(x || 0);
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Etiqueta de periodo legible y ORDENABLE: AAAA-MM del periodo_fin. El periodo de
// una estimación no excede un mes (art. 54), así que el mes de cierre lo identifica.
function periodoLabel(periodoFin) {
  // periodoFin llega como 'AAAA-MM-DD' (string) o Date; normalizamos a 'AAAA-MM'.
  const s = typeof periodoFin === 'string' ? periodoFin : new Date(periodoFin).toISOString();
  return s.slice(0, 7);
}

// GET /api/tablero/estimaciones — tablero agregado acotado por participación.
// Sin parámetros: agrega TODO lo que el usuario puede ver. (Acotamiento real en
// JS reusando esParteOSupervision, igual que los GET de estimaciones.controller.)
async function tableroEstimaciones(req, res) {
  try {
    // HU-17 (22-jun) — CA-5: a Finanzas el sistema le OCULTA el tablero. Antes solo se ocultaba en la UI
    // (permisos.js finanzas:null); ahora se bloquea también server-side (coherente con lo que ve el usuario).
    if (req.user.rol === 'finanzas') return res.status(403).json({ error: 'El tablero de estimaciones no está disponible para Finanzas.' });
    const fechaRef = fechaRefDe(req); // SOLO LECTURA: "hoy" simulado o null (=> hoy real); no persiste nada
    // Trae las estimaciones con la carátula (montos congelados) + los punteros del
    // contrato para el acotamiento. dias_en_estado se DERIVA en SQL desde el sello
    // más reciente disponible (enviada_en si ya se envió; si no, integrada_en);
    // GREATEST(0, ...) evita negativos por relojes. El "hoy" del cálculo es fecha_ref (simulada) o real.
    const q = await pool.query(
      `SELECT e.id, e.contrato_id, e.numero, e.estado,
              e.subtotal, e.neto, e.periodo_inicio, e.periodo_fin,
              e.integrada_en, e.enviada_en,
              GREATEST(0, (COALESCE($1::date, CURRENT_DATE) - COALESCE(e.enviada_en::date, e.integrada_en::date))) AS dias_en_estado,
              c.folio, c.contratista,
              c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM estimaciones e
         JOIN contratos c ON c.id = e.contrato_id
        ORDER BY c.folio, e.numero`,
      [fechaRef]
    );

    // Acotamiento por participación: misma regla que los demás controllers.
    const visibles = q.rows.filter((row) => esParteOSupervision(req.user, row));

    // --- Agregación por estado (los 5, aunque haya 0: forward-compatible) ---
    const aggEstado = new Map(
      ESTADOS.map((e) => [e.estado, { ...e, n: 0, monto_neto: 0, monto_subtotal: 0, suma_dias: 0 }])
    );
    // --- Agregación por contrato ---
    const aggContrato = new Map();
    // --- Tarjetas del grid (excluye rechazadas, CA-1) y catálogo de periodos ---
    const tarjetas = [];
    const periodos = new Set();
    // --- Totales de cartera ---
    let montoEstimado = 0; // Σ neto de NO rechazadas (consistente con HU-12)
    let montoPagado = 0;   // Σ neto de pagadas

    for (const row of visibles) {
      const meta = ESTADO_META.get(row.estado) || { etiqueta: row.estado, responsable: null, enGrid: false };
      const neto = N(row.neto);
      const subtotal = N(row.subtotal);
      const pLabel = periodoLabel(row.periodo_fin);

      const a = aggEstado.get(row.estado);
      if (a) {
        a.n += 1;
        a.monto_neto = r2(a.monto_neto + neto);
        a.monto_subtotal = r2(a.monto_subtotal + subtotal);
        a.suma_dias += N(row.dias_en_estado);
      }

      if (!aggContrato.has(row.contrato_id)) {
        aggContrato.set(row.contrato_id, {
          contrato_id: row.contrato_id, folio: row.folio, contratista: row.contratista,
          n: 0, monto_neto: 0, monto_pagado: 0,
        });
      }
      const ac = aggContrato.get(row.contrato_id);
      ac.n += 1;
      if (row.estado !== 'rechazada') ac.monto_neto = r2(ac.monto_neto + neto);
      if (row.estado === 'pagada') ac.monto_pagado = r2(ac.monto_pagado + neto);

      if (row.estado !== 'rechazada') montoEstimado = r2(montoEstimado + neto);
      if (row.estado === 'pagada') montoPagado = r2(montoPagado + neto);

      if (meta.enGrid) {
        periodos.add(pLabel);
        tarjetas.push({
          id: row.id,
          contrato_id: row.contrato_id,
          folio: row.folio,
          numero: row.numero,
          estado: row.estado,
          etiqueta: meta.etiqueta,
          responsable: meta.responsable,        // next-actor (puede ser null en 'pagada')
          periodo: pLabel,
          periodo_inicio: row.periodo_inicio,
          periodo_fin: row.periodo_fin,
          neto: neto.toFixed(2),
          subtotal: subtotal.toFixed(2),
          dias_en_estado: N(row.dias_en_estado),
        });
      }
    }

    // por_estado en orden canónico, con antigüedad promedio derivada.
    const por_estado = ESTADOS.map((e) => {
      const a = aggEstado.get(e.estado);
      return {
        estado: e.estado,
        etiqueta: e.etiqueta,
        responsable: e.responsable,
        en_grid: e.enGrid,
        n: a.n,
        monto_neto: a.monto_neto.toFixed(2),
        monto_subtotal: a.monto_subtotal.toFixed(2),
        antiguedad_prom_dias: a.n > 0 ? Math.round((a.suma_dias / a.n) * 10) / 10 : null,
      };
    });

    const por_contrato = [...aggContrato.values()]
      .sort((x, y) => x.folio.localeCompare(y.folio))
      .map((c) => ({ ...c, monto_neto: c.monto_neto.toFixed(2), monto_pagado: c.monto_pagado.toFixed(2) }));

    // Mis pendientes: estimaciones visibles cuyo estado exige una acción del rol
    // del usuario autenticado (req.user.rol del JWT, no del body).
    const mis_pendientes = [];
    for (const row of visibles) {
      const regla = PENDIENTE_POR_ESTADO[row.estado];
      if (!regla || !regla.roles.includes(req.user.rol)) continue;
      mis_pendientes.push({
        estimacion_id: row.id,
        contrato_id: row.contrato_id,
        folio: row.folio,
        numero: row.numero,
        estado: row.estado,
        accion: regla.accion,
        neto: N(row.neto).toFixed(2),
      });
    }

    return res.status(200).json({
      rol: req.user.rol,
      totales: {
        contratos: aggContrato.size,
        estimaciones: visibles.length,
        monto_estimado: montoEstimado.toFixed(2),   // Σ neto no rechazadas
        monto_pagado: montoPagado.toFixed(2),
        monto_pendiente: r2(montoEstimado - montoPagado).toFixed(2),
      },
      por_estado,
      por_contrato,
      estimaciones: tarjetas,                         // ya excluye rechazadas (CA-1)
      periodos: [...periodos].sort(),
      mis_pendientes,
    });
  } catch (err) {
    console.error('[tableroEstimaciones]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { tableroEstimaciones };
