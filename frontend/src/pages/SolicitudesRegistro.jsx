import { useEffect, useState, useCallback } from 'react';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { ROLES } from '../data/permisos.js';
import { api } from '../services/api.js';

export default function SolicitudesRegistro() {
  const { showToast } = useToast();
  const { rol, token } = useSesion();
  const [solicitudes, setSolicitudes] = useState([]);
  const [rolElegido, setRolElegido] = useState({}); // { [id]: rolId }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(null); // id en proceso

  // En modo demostración (rol fijado sin login real) no hay token: el panel no
  // puede consultar la API. Se avisa en vez de quedar en error perpetuo.
  const sinToken = !token;

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.listarUsuarios('pendiente');
      setSolicitudes(data);
      // La dependencia DEBE elegir el rol a otorgar (no se hereda el solicitado).
      setRolElegido(Object.fromEntries(data.map((u) => [u.id, ''])));
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las solicitudes');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (sinToken) {
      setCargando(false);
      return;
    }
    cargar();
  }, [sinToken, cargar]);

  const aprobar = async (id) => {
    const rol = rolElegido[id];
    if (!rol) { showToast('Elige el rol a otorgar antes de aprobar.'); return; }
    setProcesando(id);
    try {
      await api.aprobarUsuario(id, rol);
      setSolicitudes((prev) => prev.filter((u) => u.id !== id));
      showToast('Solicitud aprobada. El usuario ya puede iniciar sesión.');
    } catch (err) {
      showToast(err.message || 'No se pudo aprobar');
    } finally {
      setProcesando(null);
    }
  };

  const rechazar = async (id) => {
    setProcesando(id);
    try {
      await api.rechazarUsuario(id);
      setSolicitudes((prev) => prev.filter((u) => u.id !== id));
      showToast('Solicitud rechazada.');
    } catch (err) {
      showToast(err.message || 'No se pudo rechazar');
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Solicitudes de registro' }
        ]}
      />

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-sigecop-blue">
          Solicitudes de registro
        </h1>
      </div>

      <p className="text-sm text-slate-600 mb-6 max-w-3xl">
        Cuentas que se auto-registraron y esperan aprobación. Confirma el rol
        definitivo y aprueba para habilitar el acceso, o rechaza la solicitud.
      </p>

      {rol !== 'dependencia' && (
        <div className="mb-6 rounded-md border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Esta administración es exclusiva del rol <strong>Dependencia</strong>.
        </div>
      )}

      {sinToken ? (
        <div data-testid="solicitudes-sin-sesion" className="rounded-md border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          Inicia sesión como Dependencia (no en modo demostración) para gestionar
          las solicitudes de registro contra el servidor.
        </div>
      ) : cargando ? (
        <div className="text-sm text-slate-500">Cargando solicitudes…</div>
      ) : error ? (
        <div data-testid="solicitudes-error" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : solicitudes.length === 0 ? (
        <div data-testid="solicitudes-vacio" className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No hay solicitudes pendientes.
        </div>
      ) : (
        <div data-testid="solicitudes-panel" className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Correo</th>
                <th className="text-left px-4 py-3">Rol solicitado</th>
                <th className="text-left px-4 py-3">Rol a asignar</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {solicitudes.map((u) => (
                <tr key={u.id} data-testid="fila-solicitud" data-email={u.email}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {ROLES.find((r) => r.id === u.rol_solicitado)?.nombre || u.rol_solicitado || '— sin especificar —'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      data-testid="select-rol"
                      className="sg-input py-1"
                      value={rolElegido[u.id] ?? ''}
                      onChange={(e) =>
                        setRolElegido((prev) => ({ ...prev, [u.id]: e.target.value }))
                      }
                      disabled={procesando === u.id}
                    >
                      <option value="">— Elige rol —</option>
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        data-testid="btn-aprobar"
                        onClick={() => aprobar(u.id)}
                        disabled={procesando === u.id}
                        className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        data-testid="btn-rechazar"
                        onClick={() => rechazar(u.id)}
                        disabled={procesando === u.id}
                        className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
