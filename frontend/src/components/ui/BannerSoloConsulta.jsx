// UI-1: banner de vista en solo consulta, restilado a la paleta institucional.
// ⚠️ El TEXTO es contrato de la suite (expectAvisoSoloConsulta busca "solo consulta"): NO cambiarlo.
export default function BannerSoloConsulta() {
  return (
    <div className="bg-pagina border-l-[3px] border-borde-fuerte px-4 py-2 mb-4 rounded-r-md text-sm text-tinta-sec flex items-center gap-2">
      <span>🔒</span>
      <span>Vista de solo consulta para tu rol.</span>
    </div>
  );
}
