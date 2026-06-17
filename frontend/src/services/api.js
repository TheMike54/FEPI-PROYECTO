const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = localStorage.getItem('sigecop_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (credenciales) => request('/auth/login', { method: 'POST', body: JSON.stringify(credenciales) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  // O3: catálogo PÚBLICO de empresas para el autocomplete del registro (no requiere token).
  listarEmpresas: () => request('/auth/empresas'),
  listarUsuarios: (estado) => request(`/usuarios${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`),
  // Cuentas aprobadas asignables al equipo/roster del contrato (rol: contratista|supervision|dependencia|residente).
  listarAsignables: (rol) => request(`/usuarios/asignables?rol=${encodeURIComponent(rol)}`),
  aprobarUsuario: (id, rol) => request(`/usuarios/${id}/aprobar`, { method: 'PATCH', body: JSON.stringify({ rol }) }),
  rechazarUsuario: (id) => request(`/usuarios/${id}/rechazar`, { method: 'PATCH' }),
  crearContrato: (payload) => request('/contratos', { method: 'POST', body: JSON.stringify(payload) }),
  listarContratos: () => request('/contratos'),
  detalleContrato: (id) => request(`/contratos/${id}`),
  // A2: programa de obra (matriz concepto × periodo). Lectura por participación; edición
  // solo el residente asignado (lo valida el backend).
  leerProgramaObra: (contratoId) => request(`/contratos/${contratoId}/programa`),
  guardarProgramaObra: (contratoId, payload) => request(`/contratos/${contratoId}/programa`, { method: 'PUT', body: JSON.stringify(payload) }),
  // O2: plan de amortización del anticipo (Fase A, lectura por participación).
  planAmortizacion: (contratoId) => request(`/contratos/${contratoId}/plan-amortizacion`),
  // PDF firmado del contrato (HU-01). La subida es multipart y la descarga binaria,
  // asi que NO pasan por request() (que asume JSON).
  // 4.4: `tipo` opcional ('contrato' por defecto | 'anticipo_autorizacion'). Sin tipo se
  // comporta igual que antes (compatibilidad).
  documentoMeta: (id, tipo) => request(`/contratos/${id}/documento/meta${tipo ? `?tipo=${encodeURIComponent(tipo)}` : ''}`),
  subirDocumento: (id, file, tipo) => {
    const fd = new FormData();
    fd.append('documento', file);
    const token = localStorage.getItem('sigecop_token');
    // OJO: no fijar Content-Type; el navegador pone el boundary del multipart.
    return fetch(`${API_URL}/contratos/${id}/documento${tipo ? `?tipo=${encodeURIComponent(tipo)}` : ''}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd
    }).then(async (res) => {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const err = new Error(data?.error || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return data;
    });
  },
  descargarDocumento: async (id, tipo) => {
    const token = localStorage.getItem('sigecop_token');
    const res = await fetch(`${API_URL}/contratos/${id}/documento${tipo ? `?tipo=${encodeURIComponent(tipo)}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = JSON.parse(await res.text())?.error || msg; } catch (_) { /* binario/vacio */ }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return res.blob();
  },
  abrirBitacora: (payload) => request('/bitacora/apertura', { method: 'POST', body: JSON.stringify(payload) }),
  bitacoraDeContrato: (contratoId) => request(`/bitacora/contrato/${contratoId}`),
  // Cada quien firma SU parte desde su cuenta; bandeja de pendientes del usuario.
  firmarApertura: (aperturaId) => request(`/bitacora/${aperturaId}/firmar`, { method: 'POST' }),
  pendientesPorFirmar: () => request('/bitacora/pendientes'),
  // HU-09: notas tipificadas de bitácora.
  notaTipos: () => request('/bitacora/nota-tipos'),
  listarNotas: (aperturaId) => request(`/bitacora/${aperturaId}/notas`),
  // HU-10: notas de la bitácora de un contrato (el UI no maneja aperturaId).
  notasDeContrato: (contratoId) => request(`/bitacora/contrato/${contratoId}/notas`),
  emitirNota: (aperturaId, payload) => request(`/bitacora/${aperturaId}/notas`, { method: 'POST', body: JSON.stringify(payload) }),
  anularNota: (notaId, payload) => request(`/bitacora/notas/${notaId}/anular`, { method: 'POST', body: JSON.stringify(payload) }),
  vincularNota: (notaId, payload) => request(`/bitacora/notas/${notaId}/vincular`, { method: 'POST', body: JSON.stringify(payload) }),
  // Firma/aceptación de una nota por la contraparte (no la apertura; esa va por firmarApertura).
  firmarNota: (notaId) => request(`/bitacora/notas/${notaId}/firmar`, { method: 'POST' }),
  // HU-21: registro del pago efectuado.
  registrarPago: (payload) => request('/pagos', { method: 'POST', body: JSON.stringify(payload) }),
  listarPagos: (contratoId) => request(`/pagos/contrato/${contratoId}`),
  // HU-17: tablero agregado de estimaciones (acotado por participación en el backend).
  tableroEstimaciones: () => request('/tablero/estimaciones'),
  // HU-20: tránsito a pago (suficiencia art. 24 + soportes + semáforo plazo + instrucción de pago).
  transitoEstimacion: (estimacionId) => request(`/instruccion-pago/estimacion/${estimacionId}`),
  cargarSoporteTransito: (estimacionId, payload) => request(`/instruccion-pago/estimacion/${estimacionId}/soportes`, { method: 'POST', body: JSON.stringify(payload) }),
  generarInstruccionPago: (estimacionId) => request(`/instruccion-pago/estimacion/${estimacionId}`, { method: 'POST' }),
  consultarPresupuesto: (ejercicio, dependencia) => request(`/instruccion-pago/presupuesto?ejercicio=${encodeURIComponent(ejercicio)}&dependencia=${encodeURIComponent(dependencia)}`),
  crearPresupuesto: (payload) => request('/instruccion-pago/presupuesto', { method: 'POST', body: JSON.stringify(payload) }),
  // HU-18: portafolio ejecutivo con semáforos por contrato (agregado + acotado por participación).
  portafolio: () => request('/portafolio'),
  // HU-24 (FASE 4): finiquito y cierre del contrato (art. 64 LOPSRM / 168-172 RLOPSRM). El saldo lo
  // deriva el backend; ajustes_finales es parametrizable [validar profe].
  finiquitoPrep: (contratoId, ajustes) => request(`/finiquito/contrato/${contratoId}${ajustes != null && ajustes !== '' ? `?ajustes=${encodeURIComponent(ajustes)}` : ''}`),
  cerrarFiniquito: (contratoId, payload) => request(`/finiquito/contrato/${contratoId}`, { method: 'POST', body: JSON.stringify(payload || {}) }),
  // HU-02 (sesión E2): fianzas y garantías (art. 48 LOPSRM / 91 RLOPSRM). CRUD + endosos + PDF de la póliza.
  garantiasDeContrato: (contratoId) => request(`/garantias/contrato/${contratoId}`),
  crearGarantia: (contratoId, payload) => request(`/garantias/contrato/${contratoId}`, { method: 'POST', body: JSON.stringify(payload) }),
  editarGarantia: (garantiaId, payload) => request(`/garantias/${garantiaId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  registrarEndoso: (garantiaId, payload) => request(`/garantias/${garantiaId}/endoso`, { method: 'POST', body: JSON.stringify(payload) }),
  subirPdfGarantia: (garantiaId, file) => {
    const fd = new FormData(); fd.append('documento', file);
    const token = localStorage.getItem('sigecop_token');
    return fetch(`${API_URL}/garantias/${garantiaId}/pdf`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
      .then(async (res) => { const t = await res.text(); const d = t ? JSON.parse(t) : null; if (!res.ok) { const e = new Error(d?.error || `HTTP ${res.status}`); e.status = res.status; throw e; } return d; });
  },
  descargarPdfGarantia: async (garantiaId) => {
    const token = localStorage.getItem('sigecop_token');
    const res = await fetch(`${API_URL}/garantias/${garantiaId}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) { let m = `HTTP ${res.status}`; try { m = JSON.parse(await res.text())?.error || m; } catch (_) { /* binario */ } const e = new Error(m); e.status = res.status; throw e; }
    return res.blob();
  },
  // HU-11 (sesión E2): minutas, visitas y acuerdos (art. 123 fr. III RLOPSRM). CRUD + PDF + vínculo a nota.
  minutasDeContrato: (contratoId) => request(`/minutas/contrato/${contratoId}`),
  crearMinuta: (contratoId, payload) => request(`/minutas/contrato/${contratoId}`, { method: 'POST', body: JSON.stringify(payload) }),
  vincularNotaMinuta: (minutaId, notaId) => request(`/minutas/${minutaId}/nota`, { method: 'PATCH', body: JSON.stringify({ nota_id: notaId }) }),
  visitasDeContrato: (contratoId) => request(`/minutas/contrato/${contratoId}/visitas`),
  crearVisita: (contratoId, payload) => request(`/minutas/contrato/${contratoId}/visitas`, { method: 'POST', body: JSON.stringify(payload) }),
  vincularNotaVisita: (visitaId, notaId) => request(`/minutas/visita/${visitaId}/nota`, { method: 'PATCH', body: JSON.stringify({ nota_id: notaId }) }),
  subirPdfMinuta: (minutaId, file) => {
    const fd = new FormData(); fd.append('documento', file);
    const token = localStorage.getItem('sigecop_token');
    return fetch(`${API_URL}/minutas/${minutaId}/pdf`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
      .then(async (res) => { const t = await res.text(); const d = t ? JSON.parse(t) : null; if (!res.ok) { const e = new Error(d?.error || `HTTP ${res.status}`); e.status = res.status; throw e; } return d; });
  },
  descargarPdfMinuta: async (minutaId) => {
    const token = localStorage.getItem('sigecop_token');
    const res = await fetch(`${API_URL}/minutas/${minutaId}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) { let m = `HTTP ${res.status}`; try { m = JSON.parse(await res.text())?.error || m; } catch (_) { /* binario */ } const e = new Error(m); e.status = res.status; throw e; }
    return res.blob();
  },
  // HU-12: estimaciones (integración + consulta + avance para el preview).
  avanceContrato: (contratoId) => request(`/estimaciones/contrato/${contratoId}/avance`),
  estimacionesDeContrato: (contratoId) => request(`/estimaciones/contrato/${contratoId}`),
  // Etapa A (solo lectura): datos derivados para la pantalla única (semáforo de plan, saldos, barras).
  // periodoFin opcional: si se pasa, el planeado se acota a ese periodo (mismo corte que valida el server).
  preparacionEstimacion: (contratoId, periodoFin) => request(`/estimacion-prep/contrato/${contratoId}${periodoFin ? `?periodo_fin=${encodeURIComponent(periodoFin)}` : ''}`),
  detalleEstimacion: (id) => request(`/estimaciones/${id}`),
  integrarEstimacion: (payload) => request('/estimaciones', { method: 'POST', body: JSON.stringify(payload) }),
  // Pasada F: roster del contrato (sustitución de personas, art. 125 fr. I g RLOPSRM). Lectura por
  // participación; sustituir = dependencia o residente asignado (lo valida el backend).
  rosterContrato: (contratoId) => request(`/roster/contrato/${contratoId}`),
  sustituirPersona: (contratoId, payload) => request(`/roster/contrato/${contratoId}/sustituir`, { method: 'POST', body: JSON.stringify(payload) }),
  // HU-07 v2 (O5): ATRASO POR CONCEPTO automático, en UNIDADES (sin umbral/config). El backend
  // devuelve { periodo_actual, total_atrasos, atrasos:[{concepto_label, unidad, programado_acumulado,
  // ejecutado_acumulado, deficit}] } con solo los conceptos cuyo déficit (programado al periodo
  // vigente − ejecutado) > 0. Acotado por participación.
  alertasDeContrato: (contratoId) => request(`/alertas/contrato/${contratoId}`),
  // Badge del login: { conceptos, contratos } con déficit, acotado por participación.
  resumenAtrasos: () => request('/alertas/resumen'),
  // Asentar el atraso de un concepto en la bitácora (residente; exige bitácora abierta).
  asentarAtraso: (contratoId, payload) => request(`/alertas/contrato/${contratoId}/asentar`, { method: 'POST', body: JSON.stringify(payload) }),
  // HU-14 (Equipo 3): historial del ciclo de cobro (cada estimación con su estado y transiciones,
  // orden cronológico). Acotado por participación en el backend.
  historialEstimaciones: (contratoId) => request(`/estimaciones-ciclo/contrato/${contratoId}/historial`),
  // HU-06 v2 (O4): trabajos terminados (avance ejecutado por concepto). Lectura por participación;
  // escritura solo contratista (lo valida el backend). El periodo se SELECCIONA (payload.periodo_numero);
  // el backend BLOQUEA por art. 118 (acumulado > contratado) y AVISA (201 + aviso_programa, O-PROFE: ya no
  // bloquea) si excede lo programado del periodo o el concepto no estaba programado; y
  // GENERA la nota de bitácora tipo `avance` (diferida si no hay bitácora). payload: {contrato_concepto_id,
  // periodo_numero, cantidad, observaciones}.
  trabajosDeContrato: (contratoId) => request(`/trabajos/contrato/${contratoId}`),
  registrarAvance: (payload) => request('/trabajos', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarAvance: (id, payload) => request(`/trabajos/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  eliminarAvance: (id) => request(`/trabajos/${id}`, { method: 'DELETE' }),
  // HU-13: PRESENTACIÓN de la estimación por el CONTRATISTA (art. 54 LOPSRM). Reusa el endpoint /enviar
  // (path estable por compat); sella enviada_en/por (la PRESENTACIÓN, arranca el plazo) y avanza
  // 'integrada' (Integrada) → 'enviada' (Presentada). Solo el superintendente del contrato (lo valida el backend).
  enviarEstimacion: (id) => request(`/estimaciones-ciclo/estimacion/${id}/enviar`, { method: 'POST' }),
  // HU-15 (Equipo 3): recepción/revisión/autorización REAL del art. 54. Lectura por participación; las
  // acciones las gatea el backend por rol (supervisión=registra/turna, residencia=autoriza/rechaza).
  // El semáforo de 15 días se deriva en el frontend desde enviada_en (la PRESENTACIÓN, sello de HU-13).
  revisionEstimacion: (id) => request(`/estimaciones-ciclo/estimacion/${id}/revision`),
  crearObservacionEstimacion: (id, payload) => request(`/estimaciones-ciclo/estimacion/${id}/observaciones`, { method: 'POST', body: JSON.stringify(payload) }),
  eliminarObservacionEstimacion: (id, obsId) => request(`/estimaciones-ciclo/estimacion/${id}/observaciones/${obsId}`, { method: 'DELETE' }),
  turnarEstimacion: (id, payload) => request(`/estimaciones-ciclo/estimacion/${id}/turnar`, { method: 'POST', body: JSON.stringify(payload || {}) }),
  autorizarEstimacion: (id) => request(`/estimaciones-ciclo/estimacion/${id}/autorizar`, { method: 'POST' }),
  rechazarEstimacion: (id, payload) => request(`/estimaciones-ciclo/estimacion/${id}/rechazar`, { method: 'POST', body: JSON.stringify(payload) }),
  // HU-16 (Equipo 3): reingreso de la estimación RECHAZADA (id = la rechazada). Crea la nueva
  // versión como bloque INDEPENDIENTE ligado vía reemplaza_a (atómico, server-side); NO reinicia
  // el plazo del art. 54 (se deriva en lectura desde la enviada_en de la rechazada). Solo el
  // superintendente del contrato (lo valida el backend). payload: { confirmacion: true }.
  reingresarEstimacion: (id, payload) => request(`/estimaciones-ciclo/estimacion/${id}/reingresar`, { method: 'POST', body: JSON.stringify(payload || {}) }),
  // HU-03 (Fundación): convenios modificatorios (art. 59 LOPSRM). El backend YA EXISTE
  // (tabla inmutable + versionado del programa). Lectura por participación; crear = solo
  // dependencia/residente/created_by (lo valida el backend). El monto/deltas/flags SFP(art.102)
  // y ajuste(art.59 Bis) son server-side; aquí solo se consume.
  convenios: (contratoId) => request(`/convenios/contrato/${contratoId}`),
  versionPrograma: (versionId) => request(`/convenios/version/${versionId}`),
  crearConvenio: (contratoId, payload) => request(`/convenios/contrato/${contratoId}`, { method: 'POST', body: JSON.stringify(payload) }),
  // FASE 0C (profe 16-jun): OFICIO DE APROBACIÓN del convenio. Subida multipart + descarga binaria
  // (mismo patrón que el PDF del contrato: NO pasan por request(), que asume JSON).
  subirOficioConvenio: (convenioId, file) => {
    const fd = new FormData();
    fd.append('documento', file);
    const token = localStorage.getItem('sigecop_token');
    return fetch(`${API_URL}/convenios/${convenioId}/oficio`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd
    }).then(async (res) => {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) { const err = new Error(data?.error || `HTTP ${res.status}`); err.status = res.status; throw err; }
      return data;
    });
  },
  descargarOficioConvenio: async (convenioId) => {
    const token = localStorage.getItem('sigecop_token');
    const res = await fetch(`${API_URL}/convenios/${convenioId}/oficio`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = JSON.parse(await res.text())?.error || msg; } catch (_) { /* binario/vacio */ }
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return res.blob();
  }
};
