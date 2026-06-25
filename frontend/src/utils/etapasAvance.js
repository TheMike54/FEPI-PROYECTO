// B (24-jun) — ETAPAS de avance por versión del programa (Propuesta B aprobada). Una etapa por
// `programa_version`: las NO vigentes quedan CONGELADAS (histórico) y la vigente mide el % NUEVO sobre el
// plan modificado. El punto del profe: el % del plan ORIGINAL no se re-escala al entrar un convenio.
//
// Cómo se parte el avance (no negociable): por la FECHA del convenio. Cada versión define una ventana
// temporal [inicio, fin): el avance cuya `concepto_avance.fecha` cae en la ventana pertenece a esa etapa.
//   · La PRIMERA versión (programa original) toma todo lo previo (inicio = −∞), porque su `created_at` es
//     el instante del convenio (el snapshot v1 se crea al promover el convenio), NO el inicio del contrato.
//     Su FIN es `supersedido_en` = la fecha del convenio. Así el ejecutado PRE-convenio queda en el original.
//   · La versión VIGENTE va de su `created_at` (= fecha del convenio) a +∞: el ejecutado POST-convenio.
//   · Borde: avance con fecha EXACTA del convenio → etapa vigente (fin exclusivo / inicio inclusivo): no se
//     pierde ni se duplica. Avance SIN fecha → etapa vigente (la más reciente), para no perderlo.
//
// Denominador de cada etapa = Σ cantidades del catálogo de ESA versión (v1: 25 600; v2 con adicional: 30 600).
// SOLO lectura de datos que YA existen (programa_version + snapshots + fechas de avance). Sin backend/schema.

const dISO = (v) => (v == null ? '' : String(v).slice(0, 10));
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const mesCorto = (iso) => MESES[Number(dISO(iso).slice(5, 7)) - 1] || '';

// versiones: [{id,numero,convenio_id,vigente,created_at,supersedido_en}] · snapshots: {id → {conceptos,celdas}}
// avances: [{cantidad,fecha}] · hoy: 'AAAA-MM-DD'. Devuelve [] si hay < 2 versiones (sin convenio = vista normal).
export function derivarEtapas({ versiones, snapshots, avances, hoy }) {
  const vs = (versiones || []).slice().sort((a, b) => a.numero - b.numero);
  if (vs.length < 2) return [];
  const av = (avances || []).map((a) => ({ cant: Number(a.cantidad) || 0, f: dISO(a.fecha) }));
  const hoyD = dISO(hoy);
  // Claves por versión (para marcar es_adicional: un concepto es adicional si NO existía en la versión previa).
  const clavesDe = (v) => new Set(((snapshots[v.id]?.conceptos) || []).map((c) => String(c.clave)));

  return vs.map((v, i) => {
    const snap = snapshots[v.id];
    if (!snap) return null;
    const denom = (snap.conceptos || []).reduce((s, c) => s + (Number(c.cantidad) || 0), 0);
    const prevClaves = i > 0 ? clavesDe(vs[i - 1]) : new Set();

    // Periodos de la versión (desde sus celdas snapshot).
    const perMap = new Map();
    for (const cel of (snap.celdas || [])) {
      const n = cel.periodo_numero;
      if (!perMap.has(n)) perMap.set(n, { numero: n, inicio: dISO(cel.periodo_inicio), fin: dISO(cel.periodo_fin), cant: 0 });
      perMap.get(n).cant += Number(cel.cantidad) || 0;
    }
    const periodos = [...perMap.values()].sort((a, b) => a.numero - b.numero);

    const vigente = !v.supersedido_en;
    const inicioVent = (i === 0) ? '' : dISO(v.created_at);             // 1ª versión: −∞ (todo lo previo)
    const finVent = vigente ? '9999-12-31' : dISO(v.supersedido_en);   // fin = fecha del convenio (exclusivo)
    const corte = vigente ? hoyD : finVent;                            // hasta dónde se grafica el ejecutado
    const enVentana = (f) => (f === '' ? vigente : (f >= inicioVent && f < finVent));

    // Ejecutado en ventana, repartido por periodo según la fecha del avance.
    const ejecPorPeriodo = new Map();
    let ejecTotal = 0;
    for (const a of av) {
      if (!enVentana(a.f)) continue;
      ejecTotal += a.cant;
      const p = periodos.find((pp) => a.f >= pp.inicio && a.f <= pp.fin) || periodos[periodos.length - 1];
      if (p) ejecPorPeriodo.set(p.numero, (ejecPorPeriodo.get(p.numero) || 0) + a.cant);
    }

    // Curva: programado y ejecutado acumulados por periodo, ÷ denom. Origen en 0% (inicio del contrato).
    const curva = [{ label: 'Inicio', numero: 0, programado: denom > 0 ? 0 : null, ejecutado: denom > 0 ? 0 : null, financiero: null }];
    let progRun = 0, ejecRun = 0;
    for (const p of periodos) {
      progRun += p.cant;
      ejecRun += ejecPorPeriodo.get(p.numero) || 0;
      const programado = denom > 0 ? Number(((progRun / denom) * 100).toFixed(2)) : null;
      const muestraEjec = p.fin <= corte || (p.inicio <= corte && corte <= p.fin); // ejecutado se detiene en el corte
      const ejecutado = (denom > 0 && muestraEjec) ? Number(((ejecRun / denom) * 100).toFixed(2)) : null;
      curva.push({ label: mesCorto(p.fin), numero: p.numero, programado, ejecutado, financiero: null });
    }

    // KPIs: ejecutado de la etapa (CONGELADO si es histórica) y programado al corte.
    const kpiEjecutado = denom > 0 ? Number(((ejecTotal / denom) * 100).toFixed(1)) : null;
    let progAlCorte = 0;
    for (const p of periodos) if (p.inicio <= corte) progAlCorte += p.cant;
    const kpiProgramado = denom > 0 ? Number(((progAlCorte / denom) * 100).toFixed(1)) : null;

    // PROGRAMA de obra de ESTA versión, adaptado al shape de MatrizProgramaLectura (ids sintéticos = clave/numero,
    // mismo patrón que ConveniosModificatorios.snapshotAMatriz). es_adicional = concepto que no existía en la versión previa.
    const programa = {
      ciclo: `versión ${v.numero}${vigente ? ' (vigente)' : ' (histórico)'}`,
      monto: v.monto != null ? Number(v.monto) : null,
      plazoDias: v.plazo_dias != null ? Number(v.plazo_dias) : null,
      periodos: periodos.map((p) => ({ id: p.numero, numero: p.numero, inicio: p.inicio, fin: p.fin })),
      conceptos: (snap.conceptos || []).map((c) => ({
        id: String(c.clave), clave: c.clave, concepto: c.concepto, unidad: c.unidad,
        cantidad: Number(c.cantidad) || 0,
        es_adicional: i > 0 && !prevClaves.has(String(c.clave)),
      })),
      celdas: (snap.celdas || []).map((cel) => ({
        contrato_concepto_id: String(cel.concepto_clave), contrato_periodo_id: cel.periodo_numero, cantidad: Number(cel.cantidad) || 0,
      })),
    };

    return {
      versionId: v.id, numero: v.numero, vigente, convenioId: v.convenio_id,
      denom, nPeriodos: periodos.length,
      fechaInicio: periodos[0]?.inicio || inicioVent,
      fechaCorte: vigente ? hoyD : finVent,
      curva, kpiProgramado, kpiEjecutado, programa,
    };
  }).filter(Boolean);
}
