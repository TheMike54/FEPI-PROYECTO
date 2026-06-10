import { useState } from 'react';

// Tabs. Compatible hacia atras: si no se pasan `active`/`onTabChange`, usa estado
// interno (comportamiento original). Si se pasan, queda controlado (para navegar
// a la pestana con error). `tabsConError` (Set de indices) pinta un punto rojo.
// alta-v2 (1.2): `tabsBloqueados` (Set de indices, opcional) desactiva pestañas a las que
// aún no se puede saltar (pasos posteriores a uno inválido). La pestaña ACTIVA nunca se
// bloquea. Sin el prop, no hay bloqueo (retrocompatible).
// alta-v5: `tituloBloqueado` (string, opcional) sobreescribe el title/tooltip de las pestañas
// bloqueadas (p.ej. el alta usa navegación lineal: los nombres no navegan durante la captura).
// Sin el prop, conserva el texto por defecto (retrocompatible con las demás vistas).
export default function Tabs({ tabs, initial = 0, active: activeProp, onTabChange, tabsConError, tabsBloqueados, tituloBloqueado }) {
  const [activeInt, setActiveInt] = useState(initial);
  const active = activeProp != null ? activeProp : activeInt;
  const setActive = (i) => {
    if (onTabChange) onTabChange(i);
    else setActiveInt(i);
  };
  const ActiveContent = tabs[active]?.content;

  // UI-1 (10-jun): SOLO clases (paleta guinda institucional). Los nombres de pestaña, el
  // numerado, disabled, title y data-bloqueado son contrato de la suite y no cambian.
  return (
    <div>
      <div className="border-b border-borde overflow-x-auto bg-pagina rounded-t-lg border-x border-t">
        <div className="flex min-w-max">
          {tabs.map((t, i) => {
            const conError = tabsConError && tabsConError.has(i);
            const bloqueado = !!(tabsBloqueados && tabsBloqueados.has(i) && i !== active);
            return (
              <button
                key={i}
                type="button"
                onClick={() => { if (!bloqueado) setActive(i); }}
                disabled={bloqueado}
                title={bloqueado ? (tituloBloqueado || 'Completa los pasos anteriores para desbloquear esta pestaña') : undefined}
                data-bloqueado={bloqueado ? 'true' : undefined}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active === i
                    ? 'border-guinda text-guinda bg-white font-medium'
                    : bloqueado
                      ? 'border-transparent text-tinta-ter cursor-not-allowed'
                      : 'border-transparent text-tinta-sec hover:text-guinda'
                }`}
              >
                <span className="text-xs text-tinta-ter mr-2">{i + 1}.</span>
                {t.label}
                {bloqueado && <span className="ml-2 align-middle" title="Bloqueada">🔒</span>}
                {conError && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-peligro align-middle" title="Hay un error en esta pestaña" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-6 bg-white rounded-b-lg border-x border-b border-borde">
        {ActiveContent}
      </div>
    </div>
  );
}
