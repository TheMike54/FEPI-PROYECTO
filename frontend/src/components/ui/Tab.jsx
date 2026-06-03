import { useState } from 'react';

// Tabs. Compatible hacia atras: si no se pasan `active`/`onTabChange`, usa estado
// interno (comportamiento original). Si se pasan, queda controlado (para navegar
// a la pestana con error). `tabsConError` (Set de indices) pinta un punto rojo.
// alta-v2 (1.2): `tabsBloqueados` (Set de indices, opcional) desactiva pestañas a las que
// aún no se puede saltar (pasos posteriores a uno inválido). La pestaña ACTIVA nunca se
// bloquea. Sin el prop, no hay bloqueo (retrocompatible).
export default function Tabs({ tabs, initial = 0, active: activeProp, onTabChange, tabsConError, tabsBloqueados }) {
  const [activeInt, setActiveInt] = useState(initial);
  const active = activeProp != null ? activeProp : activeInt;
  const setActive = (i) => {
    if (onTabChange) onTabChange(i);
    else setActiveInt(i);
  };
  const ActiveContent = tabs[active]?.content;

  return (
    <div>
      <div className="border-b border-slate-200 overflow-x-auto bg-slate-50 rounded-t-md">
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
                title={bloqueado ? 'Completa los pasos anteriores para desbloquear esta pestaña' : undefined}
                data-bloqueado={bloqueado ? 'true' : undefined}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active === i
                    ? 'border-sigecop-accent text-sigecop-blue bg-white font-semibold'
                    : bloqueado
                      ? 'border-transparent text-slate-300 cursor-not-allowed'
                      : 'border-transparent text-slate-500 hover:text-sigecop-blue'
                }`}
              >
                <span className="text-xs text-slate-400 mr-2">{i + 1}.</span>
                {t.label}
                {bloqueado && <span className="ml-2 align-middle" title="Bloqueada">🔒</span>}
                {conError && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500 align-middle" title="Hay un error en esta pestaña" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-6 bg-white rounded-b-md border-x border-b border-slate-200">
        {ActiveContent}
      </div>
    </div>
  );
}
