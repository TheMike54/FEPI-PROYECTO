import AppShell from '../ui/AppShell.jsx';
import { ContratoActivoProvider } from '../../context/ContratoActivoContext.jsx';
import { SimulacionFechaProvider } from '../../context/SimulacionFechaContext.jsx';

// UI-1 (10-jun): el shell vive en components/ui/AppShell.jsx (barra guinda + filo dorado,
// sidebar claro). Layout se conserva como punto de montaje porque App.jsx (zona congelada)
// lo importa: así el swap de cara no toca el router ni las guardas.
//
// SimulacionFechaProvider (lente de fecha, SOLO LECTURA) se monta aquí —no en App.jsx (congelado)—,
// igual que ContratoActivoProvider. Envuelve al shell para que la pastilla de la barra superior y
// las vistas puedan leer la fecha de referencia simulada.
export default function Layout({ children }) {
  return (
    <SimulacionFechaProvider>
      <ContratoActivoProvider>
        <AppShell>{children}</AppShell>
      </ContratoActivoProvider>
    </SimulacionFechaProvider>
  );
}
