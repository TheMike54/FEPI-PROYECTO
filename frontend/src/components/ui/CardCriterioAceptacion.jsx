export default function CardCriterioAceptacion({ numero, texto }) {
  return (
    <div className="bg-green-50 border-l-4 border-sigecop-green-validation rounded-r-md px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-sigecop-green-validation text-white flex items-center justify-center text-xs font-bold">
          {numero}
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-sigecop-green-validation uppercase tracking-wide mb-1">
            CA-{numero}
          </div>
          <p className="text-sm text-slate-800">{texto}</p>
          <div className="mt-2 flex gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-1">
              <input type="checkbox" className="rounded text-sigecop-green-validation" /> Sí
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" className="rounded text-red-600" /> No
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
