// HU-18 (Equipo 3): Portafolio ejecutivo con semáforos. Vista AGREGADA por CONTRATO
// (no por estimación como HU-17). SOLO LECTURA: no muta nada, no toca el core congelado
// (estimaciones/contratos/schema); se construye ALREDEDOR leyendo lo ya calculado.
//
// Acotamiento por participación reusando lib/acceso.js (NO una regla nueva): dependencia/finanzas
// ven TODOS los contratos; los roles operativos (residente/supervisión, niveles 'C' de HU-18 en
// permisos.js) solo los contratos donde son parte. Misma regla que listarContratos/tablero.
//
// FUENTE ÚNICA — NO se reimplementa la verdad del dinero/avance. Se REUSAN las definiciones de:
//   · estimacion-prep.controller.js — avance por VALOR: físico = Σ(cantidad_periodo×pu) de
//     estimaciones NO rechazadas ÷ monto; programado = Σ(programa_obra.cantidad×pu) ÷ monto;
//     financiero = Σ pagos.importe ÷ monto (= financiero_pct canónico, cf. HU-05 financieroMap).
//   · alertas.controller.js (HU-07) — déficit por concepto = programado_acum(≤ periodo vigente)
//     − ejecutado_acum(concepto_avance); mismo CTE que resumenAtrasos.
//   · tablero.controller.js (HU-17) — estados del ciclo (rechazada/enviada) y carátula congelada
//     (retencion_atraso/deductivas) para penalizaciones.
//
// Todo el cálculo y el SEMÁFORO se hacen SERVER-SIDE (fuente única de verdad).
const { pool } = require('../db/pool');
const { ROLES_VEN_TODO, esParteOSupervision } = require('../lib/acceso');

// --- Umbrales del semáforo: CRITERIO DEL EQUIPO (defaults provisionales, configurables) -----------
// No hay fundamento legal del número exacto (los puntos de corte son interpretativos, Nivel 1); son un
// acuerdo del EQUIPO y se ajustan en UN SOLO punto: backend/src/lib/umbrales-semaforo.js. Siguen siendo
// configurables si el profe pide otros valores.
const { DESVIACION_PP, PLAZO_DIAS_VENCIDOS } = require('../lib/umbrales-semaforo');
const UMBRALES = {
  // Factor 1 — avance vs programado: desviación = programado% − físico% (pp). Desviación ≤ 5pp ⟺ avance
  // ≥ 95% del programado (VERDE); 5-15pp ⟺ 85-95% (ÁMBAR); > 15pp ⟺ < 85% (ROJO).
  desviacion_pp: { ok: DESVIACION_PP.ok, alerta: DESVIACION_PP.alerta },
  // Factor 2 — días de plazo legal VENCIDO (fechable: ejecución/art.54): 0 VERDE · 1-10 ÁMBAR · > 10 ROJO.
  dias_vencidos: { ok: PLAZO_DIAS_VENCIDOS.verde_max, alerta: PLAZO_DIAS_VENCIDOS.ambar_max },
  // Factor 3 — pendientes sin atender (conteo): 0 VERDE · 1-2 ÁMBAR · > 2 ROJO (criterio del equipo).
  pendientes: { ok: 0, alerta: 2 },
};
// art. 54 LOPSRM: la residencia revisa la estimación presentada en un plazo no mayor de 15 días naturales;
// pasado ese plazo se considera "vencida". Base legal: art. 54 LOPSRM (los 15 días son de la ley).
const PLAZO_ART54_REVISION_DIAS = 15;
// Misma EPS de cantidad que trabajos/alertas: un déficit por debajo de esto es 0.
const EPS_CANT = 1e-6;

const N = (x) => Number(x || 0);
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const r1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;

// 0 (ok) / 1 (alerta) / 2 (grave) según umbral.
function puntaje(valor, u) {
  if (valor <= u.ok) return 0;
  if (valor <= u.alerta) return 1;
  return 2;
}

// Color del semáforo desde el total de puntos (misma escala que el diseño de HU-18):
// total ≤ 1 → verde · 2-3 → amarillo · ≥ 4 → rojo.
function colorDe(total) {
  if (total <= 1) return 'verde';
  if (total <= 3) return 'amarillo';
  return 'rojo';
}

// GET /api/portafolio — portafolio ejecutivo acotado por participación.
async function portafolio(req, res) {
  try {
    const uid = req.user.id;
    const venTodo = ROLES_VEN_TODO.includes(req.user.rol);

    // 1) Contratos accesibles (misma regla que listarContratos). ejercicio fiscal DERIVADO del
    //    año de fecha_inicio (no existe columna; criterio del equipo: año de inicio = ejercicio
    //    presupuestal); dias_post_termino para el plazo
    //    de ejecución (art. 52/54): días transcurridos desde fecha_termino (0 si aún no vence).
    const cq = await pool.query(
      `SELECT id, folio, contratista, tipo, monto, fecha_inicio, fecha_termino,
              EXTRACT(YEAR FROM fecha_inicio)::int AS ejercicio,
              GREATEST(0, CURRENT_DATE - fecha_termino) AS dias_post_termino,
              created_by, residente_id, superintendente_id, supervision_id,
              (SELECT empresa_id FROM usuarios u WHERE u.id = contratos.dependencia_id) AS dependencia_empresa_id
         FROM contratos
        WHERE $2::boolean
           OR created_by = $1 OR residente_id = $1
           OR superintendente_id = $1 OR supervision_id = $1
        ORDER BY created_at DESC`,
      [uid, venTodo]
    );
    // (Acotamiento por empresa) mismo post-filtro que listarContratos: no cambia la forma de las filas,
    // solo quita las ajenas. Operativos pasan por participación; finanzas transversal; la dependencia se
    // acota a su propia dependencia ahora que la fila trae dependencia_empresa_id y el JWT trae empresa_id.
    const contratos = cq.rows.filter((row) => esParteOSupervision(req.user, row));
    if (contratos.length === 0) {
      return res.status(200).json({
        rol: req.user.rol,
        umbrales: { ...UMBRALES, plazo_art54_revision_dias: PLAZO_ART54_REVISION_DIAS, nota: 'criterio del equipo (defaults provisionales, configurables); el plazo de revisión de 15 días es art. 54 LOPSRM' },
        totales: { contratos: 0, verde: 0, amarillo: 0, rojo: 0 },
        contratos: [],
      });
    }
    const ids = contratos.map((c) => c.id);

    // 2) Avance por VALOR (estimacion-prep): físico total (NO rechazadas) + dos cortes para el
    //    Δ de comparación (cierre del mes actual vs cierre del mes anterior, CA-3 = SOLO avance).
    const av = await pool.query(
      `SELECT cc.contrato_id,
              COALESCE(SUM(CASE WHEN e.estado <> 'rechazada'
                                THEN eg.cantidad_periodo * cc.pu ELSE 0 END), 0) AS fisico_total,
              COALESCE(SUM(CASE WHEN e.estado <> 'rechazada'
                                 AND e.periodo_fin <= (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date
                                THEN eg.cantidad_periodo * cc.pu ELSE 0 END), 0) AS fisico_actual,
              COALESCE(SUM(CASE WHEN e.estado <> 'rechazada'
                                 AND e.periodo_fin <= (date_trunc('month', CURRENT_DATE) - interval '1 day')::date
                                THEN eg.cantidad_periodo * cc.pu ELSE 0 END), 0) AS fisico_anterior
         FROM contrato_conceptos cc
         JOIN estimacion_generadores eg ON eg.contrato_concepto_id = cc.id
         JOIN estimaciones e ON e.id = eg.estimacion_id
        WHERE cc.contrato_id = ANY($1::int[])
        GROUP BY cc.contrato_id`,
      [ids]
    );
    const avMap = new Map(av.rows.map((r) => [r.contrato_id, r]));

    // 3) Programado por VALOR (estimacion-prep): Σ programa_obra.cantidad × pu. celdas>0 = tiene programa.
    const prog = await pool.query(
      `SELECT cc.contrato_id,
              COALESCE(SUM(po.cantidad * cc.pu), 0) AS planeado_valor,
              COUNT(po.id) AS celdas
         FROM contrato_conceptos cc
         JOIN programa_obra po ON po.contrato_concepto_id = cc.id
        WHERE cc.contrato_id = ANY($1::int[])
        GROUP BY cc.contrato_id`,
      [ids]
    );
    const progMap = new Map(prog.rows.map((r) => [r.contrato_id, r]));

    // 4) Financiero (estimacion-prep): Σ pagos.importe.
    const pg = await pool.query(
      `SELECT contrato_id, COALESCE(SUM(importe), 0) AS pagado
         FROM pagos WHERE contrato_id = ANY($1::int[]) GROUP BY contrato_id`,
      [ids]
    );
    const pgMap = new Map(pg.rows.map((r) => [r.contrato_id, N(r.pagado)]));

    // 5) Estimaciones (tablero): penalización real (retencion_atraso + deductivas de NO rechazadas),
    //    rechazadas sin reingreso (estado 'rechazada' sin fila que la apunte por reemplaza_a, HU-16)
    //    y días máximos en estado 'enviada' (art. 54: presentada sin resolver).
    const es = await pool.query(
      `SELECT e.contrato_id,
              COALESCE(SUM(CASE WHEN e.estado <> 'rechazada'
                                THEN e.retencion_atraso + e.deductivas ELSE 0 END), 0) AS penalizacion,
              COUNT(*) FILTER (
                WHERE e.estado = 'rechazada'
                  AND NOT EXISTS (SELECT 1 FROM estimaciones r WHERE r.reemplaza_a = e.id)
              ) AS rechazadas_sin_reingreso,
              COALESCE(MAX(CASE WHEN e.estado = 'enviada'
                                THEN GREATEST(0, CURRENT_DATE - e.enviada_en::date) ELSE 0 END), 0) AS dias_enviada_max
         FROM estimaciones e
        WHERE e.contrato_id = ANY($1::int[])
        GROUP BY e.contrato_id`,
      [ids]
    );
    const esMap = new Map(es.rows.map((r) => [r.contrato_id, r]));

    // 6) Observaciones abiertas (pendientes sin solventar, estimaciones-ciclo).
    const ob = await pool.query(
      `SELECT e.contrato_id, COUNT(*) AS obs_abiertas
         FROM estimacion_observaciones o
         JOIN estimaciones e ON e.id = o.estimacion_id
        WHERE e.contrato_id = ANY($1::int[]) AND o.estado = 'abierta'
        GROUP BY e.contrato_id`,
      [ids]
    );
    const obMap = new Map(ob.rows.map((r) => [r.contrato_id, Number(r.obs_abiertas)]));

    // 7) Déficit físico por concepto (HU-07, mismo CTE que resumenAtrasos): nº de conceptos con
    //    programado_acum(≤ periodo vigente) − ejecutado_acum(concepto_avance) > 0.
    const defi = await pool.query(
      `WITH pa AS (
         SELECT contrato_id, MAX(numero) AS pa_num
           FROM contrato_periodos WHERE inicio <= CURRENT_DATE GROUP BY contrato_id
       ),
       defic AS (
         SELECT cc.contrato_id,
                COALESCE((SELECT SUM(po.cantidad)
                            FROM programa_obra po
                            JOIN contrato_periodos cp ON cp.id = po.contrato_periodo_id
                           WHERE po.contrato_concepto_id = cc.id
                             AND cp.numero <= COALESCE(pa.pa_num, 0)), 0)
              - COALESCE((SELECT SUM(ca.cantidad)
                            FROM concepto_avance ca
                           WHERE ca.contrato_concepto_id = cc.id), 0) AS deficit
           FROM contrato_conceptos cc
           LEFT JOIN pa ON pa.contrato_id = cc.contrato_id
          WHERE cc.contrato_id = ANY($1::int[])
       )
       SELECT contrato_id, COUNT(*) FILTER (WHERE deficit > $2) AS conceptos_atraso
         FROM defic GROUP BY contrato_id`,
      [ids, EPS_CANT]
    );
    const defiMap = new Map(defi.rows.map((r) => [r.contrato_id, Number(r.conceptos_atraso)]));

    // --- Ensamblado + semáforo server-side por contrato ---
    const cuenta = { verde: 0, amarillo: 0, rojo: 0 };
    const filas = contratos.map((c) => {
      const monto = N(c.monto);
      const a = avMap.get(c.id) || {};
      const p = progMap.get(c.id) || {};
      const e = esMap.get(c.id) || {};

      const tienePrograma = Number(p.celdas || 0) > 0;
      const pct = (val) => (monto > 0 ? r2((N(val) / monto) * 100) : null);

      const fisicoPct = pct(a.fisico_total);
      const programadoPct = tienePrograma ? pct(p.planeado_valor) : null;
      const financieroPct = pct(pgMap.get(c.id));
      const desviacion = (tienePrograma && fisicoPct != null && programadoPct != null)
        ? r1(programadoPct - fisicoPct) : null;

      // Comparación CA-3 — SOLO Δ de avance físico (no del semáforo): cierre mes actual vs anterior.
      const fisicoActualPct = pct(a.fisico_actual);
      const fisicoAnteriorPct = pct(a.fisico_anterior);
      const deltaPp = (fisicoActualPct != null && fisicoAnteriorPct != null)
        ? r1(fisicoActualPct - fisicoAnteriorPct) : null;

      // Factor 2 — atrasos en plazos legales FECHABLES. Omitido: vencido-en-autorización/pago
      // (faltan sellos autorizada_en/pagada_en en el esquema; ver ESTADO_ACTUAL §5.2 / §8).
      const diasEjecucion = (fisicoPct != null && fisicoPct < 100) ? Number(c.dias_post_termino || 0) : 0;
      const diasArt54 = Math.max(0, Number(e.dias_enviada_max || 0) - PLAZO_ART54_REVISION_DIAS);
      const diasVencidos = Math.max(diasEjecucion, diasArt54);
      const conceptosAtraso = defiMap.get(c.id) || 0;
      const hayAtrasoFisico = conceptosAtraso > 0;

      // Factor 3 — pendientes sin atender.
      const obsAbiertas = obMap.get(c.id) || 0;
      const rechazadasSinReingreso = Number(e.rechazadas_sin_reingreso || 0);
      const pendientes = obsAbiertas + rechazadasSinReingreso;

      // --- Puntajes ---
      const pAvance = tienePrograma ? puntaje(desviacion, UMBRALES.desviacion_pp) : null;
      let pAtraso = puntaje(diasVencidos, UMBRALES.dias_vencidos);
      // HU-07: un déficit físico eleva el atraso a ámbar mínimo aunque no haya días vencidos fechados.
      if (hayAtrasoFisico && pAtraso === 0) pAtraso = 1;
      const pPend = puntaje(pendientes, UMBRALES.pendientes);

      const disponibles = [pAvance, pAtraso, pPend].filter((x) => x != null);
      const total = disponibles.reduce((s, x) => s + x, 0);
      const color = colorDe(total);
      const parcial = pAvance == null; // sin programa: el factor avance no se evaluó (semáforo parcial)
      cuenta[color] += 1;

      const penalizacion = r2(N(e.penalizacion));

      return {
        contrato_id: c.id,
        folio: c.folio,
        contratista: c.contratista,
        tipo: c.tipo,                 // modalidad de obra (NO el procedimiento de adjudicación)
        ejercicio: c.ejercicio,       // derivado de fecha_inicio (criterio del equipo: año de inicio = ejercicio presupuestal)
        monto: monto.toFixed(2),
        fecha_inicio: c.fecha_inicio,
        fecha_termino: c.fecha_termino,
        avance: {
          fisico_pct: fisicoPct,
          programado_pct: programadoPct,
          financiero_pct: financieroPct,
          desviacion_pp: desviacion,
          tiene_programa: tienePrograma,
        },
        comparacion: {
          avance_actual_pct: fisicoActualPct,
          avance_anterior_pct: fisicoAnteriorPct,
          delta_pp: deltaPp,
        },
        atrasos: {
          dias_vencidos: diasVencidos,
          dias_ejecucion: diasEjecucion,
          dias_art54: diasArt54,
          conceptos_en_atraso: conceptosAtraso,
          omitido: 'vencido-en-autorización/pago (faltan sellos autorizada_en/pagada_en)',
        },
        pendientes: {
          total: pendientes,
          observaciones_abiertas: obsAbiertas,
          rechazadas_sin_reingreso: rechazadasSinReingreso,
        },
        // Penalización REAL (carátula congelada). null cuando no hay retención (la UI muestra "—").
        penalizaciones: penalizacion > 0 ? penalizacion.toFixed(2) : null,
        semaforo: {
          color,
          total,
          parcial,
          nota: parcial ? 'Sin programa de obra: el factor avance vs programado no se evaluó.' : null,
          desglose: [
            {
              factor: 'Avance vs programado',
              valor: tienePrograma ? `${desviacion} pp` : 'sin programa',
              puntos: pAvance,
            },
            {
              factor: 'Atrasos en plazos',
              valor: `${diasVencidos} d${hayAtrasoFisico ? ` · ${conceptosAtraso} concepto(s) en atraso` : ''}`,
              puntos: pAtraso,
            },
            {
              factor: 'Pendientes sin atender',
              valor: pendientes,
              puntos: pPend,
            },
          ],
        },
      };
    });

    return res.status(200).json({
      rol: req.user.rol,
      umbrales: { ...UMBRALES, plazo_art54_revision_dias: PLAZO_ART54_REVISION_DIAS, nota: 'criterio del equipo (defaults provisionales, configurables); el plazo de revisión de 15 días es art. 54 LOPSRM' },
      totales: { contratos: filas.length, ...cuenta },
      contratos: filas,
    });
  } catch (err) {
    console.error('[portafolio]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { portafolio };
