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

  const cambiarModo = useCallback((nuevoModo) => {
    setModo(nuevoModo);
    if (nuevoModo === 'proyecto') setRol(null);
  }, []);

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
  return {
    enModoApp,
    mostrarMeta: !enModoApp,
    soloLectura: enModoApp && nivel === 'C',
    nivel
  };
}
