import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSesion } from './SesionContext.jsx';
import { api } from '../services/api.js';

// 3A — CONTRATO ACTIVO GLOBAL (versión mínima). Contexto NUEVO: NO toca SesionContext ni el login.
// El contrato se elige UNA vez (modal al entrar) y todas las pantallas de contrato lo heredan. Persiste en
// localStorage; adopta ?contrato=ID de deep-links. Las vistas multi-contrato (portafolio/tablero/padrón) lo ignoran.
const Ctx = createContext(null);
const LS_KEY = 'sigecop.contratoActivo';
// BUG 1 — dueño (user id) del contrato activo guardado. Permite descartar el contrato si entra OTRA cuenta
// (ninguna cuenta hereda el de otra) y relanzar el modal. Vive aquí (NO en SesionContext, congelado).
const LS_USER = 'sigecop.contratoActivoUser';

// Cache a nivel módulo: el Layout (y por tanto el provider) se re-monta en cada navegación porque App.jsx usa
// <WithLayout> por ruta; este cache evita re-pedir la lista de contratos en cada salto.
let _cacheContratos = null;

export function ContratoActivoProvider({ children }) {
  const { token, usuario } = useSesion();
  const uid = usuario?.id != null ? String(usuario.id) : (usuario?.email || null); // BUG 1 — cuenta dueña
  const [sp] = useSearchParams();
  const [contratos, setContratos] = useState(() => _cacheContratos || []);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [contratoId, setContratoId] = useState(() => {
    try {
      const stored = localStorage.getItem(LS_KEY) || '';
      if (!stored) return '';
      // BUG 1 — en LOGIN, uid ya está disponible → solo restaura si es la MISMA cuenta (evita herencia y
      // parpadeo). En F5, uid aún es null (la sesión se restaura en un effect) → restaura optimista y el
      // effect de abajo valida en cuanto se conoce la cuenta.
      if (uid == null) return stored;
      return localStorage.getItem(LS_USER) === uid ? stored : '';
    } catch { return ''; }
  });
  const [forzarSeleccion, setForzarSeleccion] = useState(false);

  // BUG 1 — el contrato activo NO se hereda entre cuentas ni queda pegado tras cerrar sesión: se descarta al
  // cerrar sesión (si el provider sigue montado) y al entrar con una cuenta DISTINTA a la última (compara uid),
  // relanzando el modal "Elige tu contrato". También invalida el cache de la lista para no mostrar la de otra cuenta.
  useEffect(() => {
    try {
      if (!token) {
        localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_USER);
        _cacheContratos = null;
        if (contratoId) setContratoId('');
        return;
      }
      if (!uid) return; // sesión restaurándose: aún no se conoce la cuenta
      if (localStorage.getItem(LS_USER) !== uid) {
        localStorage.removeItem(LS_KEY);
        localStorage.setItem(LS_USER, uid);
        _cacheContratos = null;
        if (contratoId) setContratoId('');
      }
    } catch { /* noop */ }
  }, [token, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) { _cacheContratos = null; setContratos([]); return; }
    if (_cacheContratos) { setContratos(_cacheContratos); return; }
    let vivo = true;
    setCargandoLista(true);
    api.listarContratos()
      .then((l) => { const arr = Array.isArray(l) ? l : []; _cacheContratos = arr; if (vivo) setContratos(arr); })
      .catch(() => { if (vivo) setContratos([]); })
      .finally(() => { if (vivo) setCargandoLista(false); });
    return () => { vivo = false; };
  }, [token]);

  const setContratoActivo = useCallback((id) => {
    const v = id ? String(id) : '';
    setContratoId(v);
    setForzarSeleccion(false);
    try {
      if (v) { localStorage.setItem(LS_KEY, v); if (uid) localStorage.setItem(LS_USER, uid); } // BUG 1: graba el dueño
      else { localStorage.removeItem(LS_KEY); }
    } catch { /* noop */ }
  }, [uid]);
  // BUG 1 — olvidar el contrato activo. Lo llaman los botones "Cerrar sesión" (el logout no alcanza a correr
  // dentro del provider porque el Layout se desmonta al salir). Limpia contrato + dueño + cache de lista.
  const olvidarContrato = useCallback(() => {
    try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_USER); } catch { /* noop */ }
    _cacheContratos = null;
    setContratoId('');
    setForzarSeleccion(false);
  }, []);
  const pedirCambio = useCallback(() => setForzarSeleccion(true), []);
  const cancelarCambio = useCallback(() => setForzarSeleccion(false), []);

  // Deep-link: ?contrato=ID adopta el contrato como activo (un enlace directo no debe quedar bloqueado por el modal).
  const q = sp.get('contrato');
  useEffect(() => {
    if (q && String(q) !== String(contratoId)) setContratoActivo(q);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const contrato = useMemo(
    () => contratos.find((c) => String(c.id) === String(contratoId)) || null,
    [contratos, contratoId]
  );

  const value = useMemo(() => ({
    contratos, cargandoLista, contratoId, contrato, forzarSeleccion,
    setContratoActivo, pedirCambio, cancelarCambio, olvidarContrato,
  }), [contratos, cargandoLista, contratoId, contrato, forzarSeleccion, setContratoActivo, pedirCambio, cancelarCambio, olvidarContrato]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const VACIO = {
  contratos: [], cargandoLista: false, contratoId: '', contrato: null, forzarSeleccion: false,
  setContratoActivo: () => {}, pedirCambio: () => {}, cancelarCambio: () => {}, olvidarContrato: () => {},
};
export function useContratoActivo() { return useContext(Ctx) || VACIO; }
