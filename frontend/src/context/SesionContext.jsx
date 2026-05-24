import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { nivelDe } from '../data/permisos.js';

// El rol HOY viene del selector de demostración. En el futuro vendrá del login
// real (token JWT de HU-00). Las vistas consumen useSesion() sin cambiar.

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [modo, setModo] = useState('proyecto');
  const [rol, setRol] = useState(null);

  const salirRol = useCallback(() => setRol(null), []);

  const cambiarModo = useCallback((nuevoModo) => {
    setModo(nuevoModo);
    if (nuevoModo === 'proyecto') setRol(null);
  }, []);

  // Memoizamos el value para no causar re-renders innecesarios en todos los
  // consumidores cuando el Provider se re-renderiza sin cambios en modo/rol.
  const value = useMemo(
    () => ({ modo, rol, setModo: cambiarModo, setRol, salirRol }),
    [modo, rol, cambiarModo, salirRol]
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
