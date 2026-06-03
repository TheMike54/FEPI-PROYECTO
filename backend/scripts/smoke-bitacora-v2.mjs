// Smoke funcional de la pasada de Bitácora (HU-08/09/10) contra el backend local.
// Verifica: apertura = nota #1; candado de emisión (no emitir sin firma completa);
// firma de la apertura por TODOS; emisión post-firma (folio #2); firma de nota por la
// contraparte (no por el emisor); guard de anular la apertura. Ejecutar: node este.mjs
const BASE = 'http://localhost:4000/api';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FALLO:', m); } };

async function req(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const login = async (email) => (await req('POST', '/auth/login', null, { email, password: 'Sigecop2026!' })).data;

(async () => {
  const R = await login('residente@sigecop.test');
  const S = await login('contratista@sigecop.test');
  const V = await login('supervision@sigecop.test');
  ok(R?.token && S?.token && V?.token, 'login residente + superintendente + supervisión');
  const idS = S.user.id, idV = V.user.id;

  // 1) Crear contrato (residente) con equipo completo + programa 100%.
  const folio = 'BIT-SMOKE-' + Date.now();
  const cr = await req('POST', '/contratos', R.token, {
    folio, tipo: 'Obra pública sobre la base de precios unitarios', objeto: 'Obra smoke bitácora',
    contratista: 'Constructora Smoke', dependencia: 'Dependencia Smoke', plazoDias: 60, fechaInicio: '2026-06-01',
    superintendenteId: idS, supervisionId: idV, anticipoPct: null, juridicos: {},
    conceptos: [{ clave: 'A1', concepto: 'Concepto smoke', unidad: 'm³', cantidad: 100, pu: 50 }],
    ciclo: 'mensual', programa: [{ clave: 'A1', periodoNumero: 1, cantidad: 100 }], garantias: []
  });
  ok(cr.status === 201 && cr.data?.id, `crear contrato → 201 (status ${cr.status})`);
  const contratoId = cr.data.id;

  // 2) Apertura (residente) con datos mínimos art. 123 fr. III.
  const ap = await req('POST', '/bitacora/apertura', R.token, {
    contratoId, fechaEntregaSitio: '2026-06-01', plazoFirmaDias: 2,
    domicilioDependencia: 'Av. Siempre Viva 1', telefonoDependencia: '7471234567',
    domicilioContratista: 'Calle Obra 2', telefonoContratista: '7479876543',
    descripcionTrabajos: 'Construcción de X', caracteristicasSitio: 'Terreno plano, clima cálido'
  });
  ok(ap.status === 201 && ap.data?.id, `apertura → 201 (status ${ap.status})`);
  const aperturaId = ap.data.id;

  // 3) PUNTO 1: la apertura ES la nota #1 (tipo apertura).
  let notas = (await req('GET', `/bitacora/contrato/${contratoId}/notas`, R.token)).data;
  const n1 = notas?.notas?.find((n) => n.numero === 1);
  ok(n1 && n1.tipo === 'apertura', `nota #1 existe y es tipo 'apertura' (${n1?.tipo})`);
  ok(notas?.notas?.length === 1, `solo existe la nota #1 tras aperturar (hay ${notas?.notas?.length})`);

  // 4) PUNTO 3: candado de emisión — NO se puede emitir sin firma completa de la apertura.
  let em = await req('POST', `/bitacora/${aperturaId}/notas`, R.token, { tipo: 'res_estimaciones', contenido: 'intento sin firma' });
  ok(em.status === 409, `emitir SIN firma completa → 409 candado (status ${em.status})`);

  // 5) PUNTO 2: firma de la apertura por TODOS los participantes.
  const fR = await req('POST', `/bitacora/${aperturaId}/firmar`, R.token);
  const fS = await req('POST', `/bitacora/${aperturaId}/firmar`, S.token);
  // Aún falta supervisión → sigue bloqueado.
  em = await req('POST', `/bitacora/${aperturaId}/notas`, R.token, { tipo: 'res_estimaciones', contenido: 'aún falta 1 firma' });
  ok(em.status === 409, `con 2 de 3 firmas → emisión sigue bloqueada (status ${em.status})`);
  const fV = await req('POST', `/bitacora/${aperturaId}/firmar`, V.token);
  ok(fR.status === 200 && fS.status === 200 && fV.status === 200 && fV.data?.completa === true,
     `firmas residente+superintendente+supervisión → apertura COMPLETA (completa=${fV.data?.completa})`);

  // 6) Emisión post-firma: ahora sí, y la nota arranca en folio #2.
  em = await req('POST', `/bitacora/${aperturaId}/notas`, R.token, { tipo: 'res_estimaciones', contenido: 'Autorizo estimación 1', tag: 'EST-1' });
  ok(em.status === 201 && em.data?.numero === 2, `emitir con apertura firmada → 201 folio #2 (status ${em.status}, folio ${em.data?.numero})`);
  ok(em.data?.tag === 'EST-1', `la nota guardó el tag de búsqueda (${em.data?.tag})`);
  const nota2 = em.data.id;

  // 7) PUNTO 2 (firma de nota por la contraparte): el superintendente firma la nota del residente.
  const fnS = await req('POST', `/bitacora/notas/${nota2}/firmar`, S.token);
  ok(fnS.status === 201 && fnS.data?.firmado, `contraparte (superintendente) firma la nota #2 → 201`);
  const fnR = await req('POST', `/bitacora/notas/${nota2}/firmar`, R.token);
  ok(fnR.status === 409, `el EMISOR no puede firmar su propia nota (ya firmó al emitir) → 409 (status ${fnR.status})`);

  // BUG 2: con SOLO emisor (R) + superintendente (S) y FALTANDO supervisión (V), la nota NO está
  // 'firmada' todavía (sigue en plazo, no tácita).
  let notasNow = (await req('GET', `/bitacora/contrato/${contratoId}/notas`, R.token)).data;
  let n2 = notasNow?.notas?.find((n) => n.numero === 2);
  ok(n2 && n2.aceptacion !== 'firmada', `nota #2 con firma INCOMPLETA (falta supervisión) NO es 'firmada' (es '${n2?.aceptacion}')`);
  // Al firmar también la supervisión se completan TODAS las firmas requeridas → 'firmada' YA (sin
  // esperar a que venza el plazo). Esta era la causa del bug: el estado ignoraba las firmas.
  const fnV = await req('POST', `/bitacora/notas/${nota2}/firmar`, V.token);
  ok(fnV.status === 201, `supervisión firma la nota #2 → 201`);
  notasNow = (await req('GET', `/bitacora/contrato/${contratoId}/notas`, R.token)).data;
  n2 = notasNow?.notas?.find((n) => n.numero === 2);
  ok(n2 && n2.aceptacion === 'firmada', `nota #2 con TODAS las firmas requeridas → estado 'firmada' (es '${n2?.aceptacion}')`);

  // 8) PUNTO 7: la apertura (#1) no se anula; una nota normal (sin firmar) sí, generando correctiva.
  const anAp = await req('POST', `/bitacora/notas/${n1.id}/anular`, R.token, { contenido: 'x' });
  ok(anAp.status === 403, `anular la apertura (#1) → 403 bloqueado (status ${anAp.status})`);
  const em3 = await req('POST', `/bitacora/${aperturaId}/notas`, R.token, { tipo: 'res_estimaciones', contenido: 'nota a corregir' });
  const nota3 = em3.data.id;
  const an3 = await req('POST', `/bitacora/notas/${nota3}/anular`, R.token, { contenido: 'Dice: 1 / Debe decir: 2' });
  ok(an3.status === 201 && an3.data?.correctiva?.numero === 4, `anular nota #3 (emisor) → correctiva #4 (status ${an3.status}, folio ${an3.data?.correctiva?.numero})`);

  // 9) tipos por rol: el catálogo activo del residente trae los granulares art. 125 fr. I.
  const tipos = (await req('GET', '/bitacora/nota-tipos', R.token)).data;
  const resAct = tipos.filter((t) => t.rol_emisor === 'residente' && t.activo);
  ok(resAct.some((t) => t.clave === 'res_sustitucion') && resAct.some((t) => t.clave === 'res_suspension'),
     `catálogo trae tipos granulares del residente (art. 125 fr. I): ${resAct.length} activos`);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('SMOKE ERROR', e); process.exit(2); });
