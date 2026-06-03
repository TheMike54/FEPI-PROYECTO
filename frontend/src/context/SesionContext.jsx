import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { nivelDe } from '../data/permisos.js';
import { api } from '../services/api.js';

// alta-v2: se eliminó el "modo proyecto". La app es SIEMPRE modo aplicación; el rol viene
// del login real (HU-00). Ya no hay atajo de demostración ni toggle de modo.
// Las vistas consumen useSesion() / useVistaHU().

const SesionContext = createContext(null);
const TOKEN_KEY = 'sigecop_token';
const USER_KEY = 'sigecop_user';

export function SesionProvider({ children }) {
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
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUsuario(null);
    setRol(null);
  }, []);

  const salirRol = useCallback(() => setRol(null), []);

  const value = useMemo(
    () => ({ rol, usuario, token, setRol, salirRol, login, logout }),
    [rol, usuario, token, salirRol, login, logout]
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

// Hook que cada vista usa para decidir qué renderizar en función del rol.
// huId: 'HU-XX'. (alta-v2: se eliminó el "modo proyecto"; la app es siempre modo aplicación.)
// Devuelve: { soloLectura, sinAcceso, nivel }
export function useVistaHU(huId) {
  const { rol } = useSesion();
  const nivel = nivelDe(huId, rol);
  // Control de acceso por rol: solo 'E' (ejecuta) permite editar; 'C' (consulta) y null (sin
  // acceso) quedan en solo lectura. 'sinAcceso' lo usa el ruteo para bloquear el deep-link a
  // una HU que el rol no puede ver.
  return {
    soloLectura: nivel !== 'E',
    sinAcceso: nivel === null,
    nivel
  };
}
