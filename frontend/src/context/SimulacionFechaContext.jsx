import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  getFechaSimulada, hoyRealISO, setFechaSimulada, sumarMeses,
} from '../lib/fechaSimulada.js';

// CONTEXTO GLOBAL de la FECHA DE SIMULACIÓN (lente de solo lectura). Guarda la fecha con la que el
// frontend "ve" el sistema (alertas de atraso, vencimientos de plazos/notas, semáforos). Por defecto
// null = usa la fecha REAL del sistema.
//
// ⚠️ SEGURIDAD: esto NO escribe nada en la BD. Solo cambia la fecha de REFERENCIA con la que se pide y
// muestra el cálculo (services/api.js agrega ?fecha_ref SOLO a GET; las escrituras usan la fecha real
// del servidor). Ver lib/fechaSimulada.js.
//
// El estado se inicializa desde localStorage (el Layout —y este provider— se re-montan en cada
// navegación, igual que ContratoActivoContext; persistir en localStorage lo hace sobrevivir). Al
// aplicar una fecha se recarga la app (window.location.reload) para que TODA la vista —datos del
// backend (vía fecha_ref) y cálculos de "hoy" en cliente (CurvaAvance)— se recompute de forma
// consistente con la nueva fecha de referencia. Es un cambio deliberado de "reloj del sistema".
const Ctx = createContext(null);

export function SimulacionFechaProvider({ children }) {
  const [fechaSimulada, setFS] = useState(() => getFechaSimulada());
  const hoyReal = hoyRealISO();
  const esSimulando = fechaSimulada != null && fechaSimulada !== hoyReal;

  // Persiste la fecha y recarga para recomputar TODA la vista con la nueva referencia. iso === hoy real
  // (o vacío) => se limpia la simulación (vuelve a tiempo real).
  const aplicar = useCallback((iso) => {
    const objetivo = iso && iso !== hoyReal ? iso : null;
    const actual = getFechaSimulada();
    setFechaSimulada(objetivo);          // localStorage (fuente que lee services/api.js)
    setFS(objetivo);                     // estado local (por si no recargáramos)
    // Evita recargas inútiles si no cambió realmente el valor efectivo.
    if ((objetivo || null) !== (actual || null) && typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [hoyReal]);

  const setFecha = useCallback((iso) => aplicar(iso), [aplicar]);
  const volverAHoy = useCallback(() => aplicar(null), [aplicar]);
  const periodoAnterior = useCallback(
    () => aplicar(sumarMeses(fechaSimulada || hoyReal, -1)), [aplicar, fechaSimulada, hoyReal]
  );
  const periodoSiguiente = useCallback(
    () => aplicar(sumarMeses(fechaSimulada || hoyReal, +1)), [aplicar, fechaSimulada, hoyReal]
  );

  const value = useMemo(() => ({
    fechaSimulada,                       // 'AAAA-MM-DD' simulada o null
    fechaRef: fechaSimulada || hoyReal,  // "hoy" efectivo que ve el frontend
    hoyReal,
    esSimulando,
    setFecha, volverAHoy, periodoAnterior, periodoSiguiente,
  }), [fechaSimulada, hoyReal, esSimulando, setFecha, volverAHoy, periodoAnterior, periodoSiguiente]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const VACIO = {
  fechaSimulada: null, fechaRef: hoyRealISO(), hoyReal: hoyRealISO(), esSimulando: false,
  setFecha: () => {}, volverAHoy: () => {}, periodoAnterior: () => {}, periodoSiguiente: () => {},
};
export function useSimulacionFecha() { return useContext(Ctx) || VACIO; }
