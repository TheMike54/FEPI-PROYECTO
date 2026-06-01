import { useState } from 'react';

// Tabs. Compatible hacia atras: si no se pasan `active`/`onTabChange`, usa estado
// interno (comportamiento original). Si se pasan, queda controlado (para navegar
// a la pestana con error). `tabsConError` (Set de indices) pinta un punto rojo.
export default function Tabs({ tabs, initial = 0, active: activeProp, onTabChange, tabsConError }) {
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
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active === i
                    ? 'border-sigecop-accent text-sigecop-blue bg-white font-semibold'
                    : 'border-transparent text-slate-500 hover:text-sigecop-blue'
                }`}
              >
                <span className="text-xs text-slate-400 mr-2">{i + 1}.</span>
                {t.label}
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
