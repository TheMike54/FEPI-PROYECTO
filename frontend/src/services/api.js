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
  crearContrato: (payload) => request('/contratos', { method: 'POST', body: JSON.stringify(payload) }),
  listarContratos: () => request('/contratos'),
  detalleContrato: (id) => request(`/contratos/${id}`),
  abrirBitacora: (payload) => request('/bitacora/apertura', { method: 'POST', body: JSON.stringify(payload) })
};
