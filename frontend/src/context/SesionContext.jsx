import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { nivelDe } from '../data/permisos.js';
import { api } from '../services/api.js';

// El rol HOY puede venir del login real (HU-00) o del atajo de demostración.
// Las vistas consumen useSesion() / useVistaHU() sin enterarse de cuál.

const SesionContext = createContext(null);
const TOKEN_KEY = 'sigecop_token';
const USER_KEY = 'sigecop_user';

export function SesionProvider({ children }) {
  const [modo, setModo] = useState('proyecto');
  const [rol, setRol] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);

  // Restaura sesión persistida en localStorage (un F5 no pierde el login).
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (!t || !u) return;
    try {
      const parsed = JSON.parse(u);
      setToken(t);
      setUsuario(parsed);
      setRol(parsed.rol);
      setModo('aplicacion');
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { token: tk, user } = await api.login({ email, password });
    localStorage.setItem(TOKEN_KEY, tk);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setToken(tk);
    setUsuario(user);
    setRol(user.rol);
    setModo('aplicacion');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUsuario(null);
    setRol(null);
    setModo('proyecto');
  }, []);

  const salirRol = useCallback(() => setRol(null), []);

  // Alternar modo NO borra el rol: el rol se conserva al pasar de proyecto a
  // aplicación y viceversa. El rol solo se limpia con logout o "Cambiar de rol"
  // (salirRol), que llevan al selector. Así "modo proyecto" también opera con un rol.
  const cambiarModo = useCallback((nuevoModo) => setModo(nuevoModo), []);

  const value = useMemo(
    () => ({ modo, rol, usuario, token, setModo: cambiarModo, setRol, salirRol, login, logout }),
    [modo, rol, usuario, token, cambiarModo, salirRol, login, logout]
  );

  return (
    <SesionContext.Provider value={value}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return ctx;
}

// Hook que cada vista usa para decidir qué renderizar en función del modo y rol.
// huId: 'HU-XX'.
// Devuelve: { enModoApp, mostrarMeta, soloLectura, nivel }
export function useVistaHU(huId) {
  const { modo, rol } = useSesion();
  const enModoApp = modo === 'aplicacion';
  const nivel = nivelDe(huId, rol);
  // El control de acceso por rol aplica en AMBOS modos (proyecto y aplicación):
  // solo 'E' (ejecuta) permite editar; 'C' (consulta) y null (sin acceso) quedan en
  // solo lectura. 'sinAcceso' lo usa el ruteo para bloquear el deep-link a una HU
  // que el rol no puede ver.
  return {
    enModoApp,
    mostrarMeta: !enModoApp,
    soloLectura: nivel !== 'E',
    sinAcceso: nivel === null,
    nivel
  };
}
