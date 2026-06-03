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
  // HU-12: estimaciones (integración + consulta + avance para el preview).
  avanceContrato: (contratoId) => request(`/estimaciones/contrato/${contratoId}/avance`),
  estimacionesDeContrato: (contratoId) => request(`/estimaciones/contrato/${contratoId}`),
  detalleEstimacion: (id) => request(`/estimaciones/${id}`),
  integrarEstimacion: (payload) => request('/estimaciones', { method: 'POST', body: JSON.stringify(payload) })
};
