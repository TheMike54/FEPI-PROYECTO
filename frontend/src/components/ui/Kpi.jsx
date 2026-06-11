// UI-1: indicador numérico (KPI) sobre tarjeta blanca.
// tono: 'base' (tinta) · 'exito' · 'aviso' · 'peligro' · 'guinda'.
const TONO = {
  base: 'text-tinta',
  exito: 'text-exito',
  aviso: 'text-aviso',
  peligro: 'text-peligro',
  guinda: 'text-guinda'
};

export default function Kpi({ label, valor, sub, tono = 'base', testid }) {
  return (
    <div className="bg-white border border-borde rounded-lg p-4" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-wider text-tinta-sec font-medium">{label}</div>
      <div className={`text-3xl font-semibold mt-1 ${TONO[tono] || TONO.base}`}>{valor}</div>
      {sub && <div className="text-xs text-tinta-sec mt-1">{sub}</div>}
    </div>
  );
}
