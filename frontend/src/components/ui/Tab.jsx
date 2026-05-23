import { useState } from 'react';

export default function Tabs({ tabs, initial = 0 }) {
  const [active, setActive] = useState(initial);
  const ActiveContent = tabs[active]?.content;

  return (
    <div>
      <div className="border-b border-slate-200 overflow-x-auto bg-slate-50 rounded-t-md">
        <div className="flex min-w-max">
          {tabs.map((t, i) => (
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
            </button>
          ))}
        </div>
      </div>
      <div className="p-6 bg-white rounded-b-md border-x border-b border-slate-200">
        {ActiveContent}
      </div>
    </div>
  );
}
