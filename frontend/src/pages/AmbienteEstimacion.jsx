import { Navigate } from 'react-router-dom';

// FASE 3 (rediseño por bloques) — el "Recorrido por bloques" de estimación DEJÓ de ser una pantalla
// aparte: el flujo de "Nueva estimación" YA ES el wizard de pasos (Periodo → Generadores → Carátula →
// Soportes/Notas → Integrar y presentar) que vive en `IntegracionEstimacion` (/estimaciones/integracion),
// reusando la captura real de HU-12/HU-13. Este cascarón de enlaces queda obsoleto y REDIRIGE al wizard.
// La ruta se conserva (App.jsx congelado); solo cambia a un redirect — cero rutas nuevas.
export default function AmbienteEstimacion() {
  return <Navigate to="/estimaciones/integracion" replace />;
}
