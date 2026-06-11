import BannerSoloConsulta from './BannerSoloConsulta.jsx';

// UI-1: delega en el componente del sistema de diseño (mismo TEXTO "solo consulta", que es
// contrato de la suite). Se conserva este archivo porque lo importan muchas vistas.
export default function AvisoSoloLectura() {
  return <BannerSoloConsulta />;
}
