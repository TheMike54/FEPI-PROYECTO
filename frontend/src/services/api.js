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
  health: () => request('/health'),
  login: (credenciales) => request('/auth/login', { method: 'POST', body: JSON.stringify(credenciales) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  // O3: catálogo PÚBLICO de empresas para el autocomplete del registro (no requiere token).
  listarEmpresas: () => request('/auth/empresas'),
  listarUsuarios: (estado) => request(`/usuarios${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`),
  // Cuentas aprobadas asignables al equipo del contrato (rol: contratista|supervision).
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
  // HU-07: alertas de atraso por concepto del catálogo (config + evaluación de disparo).
  alertasDeContrato: (contratoId) => request(`/alertas/contrato/${contratoId}`),
  crearAlerta: (payload) => request('/alertas', { method: 'POST', body: JSON.stringify(payload) }),
  toggleAlerta: (id, payload) => request(`/alertas/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  eliminarAlerta: (id) => request(`/alertas/${id}`, { method: 'DELETE' }),
  // HU-14 (Equipo 3): historial del ciclo de cobro (cada estimación con su estado y transiciones,
  // orden cronológico). Acotado por participación en el backend.
  historialEstimaciones: (contratoId) => request(`/estimaciones-ciclo/contrato/${contratoId}/historial`),
  // HU-06: trabajos terminados (avance ejecutado por concepto). Lectura por participación;
  // escritura solo contratista (lo valida el backend). art. 118 bloquea (409); la nota tipo
  // `avance` es requerida si cantidad > 0; el periodo se deriva de la fecha.
  trabajosDeContrato: (contratoId) => request(`/trabajos/contrato/${contratoId}`),
  registrarAvance: (payload) => request('/trabajos', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarAvance: (id, payload) => request(`/trabajos/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  eliminarAvance: (id) => request(`/trabajos/${id}`, { method: 'DELETE' }),
  // HU-13: envío de la estimación. Sella la fecha (enviada_en/por) y avanza a 'enviada'.
  // Solo el superintendente del contrato (lo valida el backend); arranca el plazo art. 54.
  enviarEstimacion: (id) => request(`/estimaciones-ciclo/estimacion/${id}/enviar`, { method: 'POST' }),
  // HU-03 (Fundación): convenios modificatorios (art. 59 LOPSRM). El backend YA EXISTE
  // (tabla inmutable + versionado del programa). Lectura por participación; crear = solo
  // dependencia/residente/created_by (lo valida el backend). El monto/deltas/flags SFP(art.102)
  // y ajuste(art.59 Bis) son server-side; aquí solo se consume.
  convenios: (contratoId) => request(`/convenios/contrato/${contratoId}`),
  versionPrograma: (versionId) => request(`/convenios/version/${versionId}`),
  crearConvenio: (contratoId, payload) => request(`/convenios/contrato/${contratoId}`, { method: 'POST', body: JSON.stringify(payload) })
};
