import { Link } from 'react-router-dom';

export default function Breadcrumb({ items }) {
  return (
    <nav className="text-xs text-slate-500 mb-2" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link to={item.href} className="hover:text-sigecop-blue transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-semibold text-slate-700' : ''}>{item.label}</span>
              )}
              {!isLast && <span className="text-slate-400 mx-1">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
