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
  aprobarUsuario: (id, rol) => request(`/usuarios/${id}/aprobar`, { method: 'PATCH', body: JSON.stringify({ rol }) }),
  rechazarUsuario: (id) => request(`/usuarios/${id}/rechazar`, { method: 'PATCH' }),
  crearContrato: (payload) => request('/contratos', { method: 'POST', body: JSON.stringify(payload) }),
  listarContratos: () => request('/contratos'),
  detalleContrato: (id) => request(`/contratos/${id}`),
  // PDF firmado del contrato (HU-01). La subida es multipart y la descarga binaria,
  // asi que NO pasan por request() (que asume JSON).
  documentoMeta: (id) => request(`/contratos/${id}/documento/meta`),
  subirDocumento: (id, file) => {
    const fd = new FormData();
    fd.append('documento', file);
    const token = localStorage.getItem('sigecop_token');
    // OJO: no fijar Content-Type; el navegador pone el boundary del multipart.
    return fetch(`${API_URL}/contratos/${id}/documento`, {
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
  descargarDocumento: async (id) => {
    const token = localStorage.getItem('sigecop_token');
    const res = await fetch(`${API_URL}/contratos/${id}/documento`, {
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
  bitacoraDeContrato: (contratoId) => request(`/bitacora/contrato/${contratoId}`)
};
