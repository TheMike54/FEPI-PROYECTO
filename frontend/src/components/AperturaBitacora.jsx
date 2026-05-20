import { Link } from 'react-router-dom';

const PARTES = [
  {
    num: 1,
    titulo: 'Contratante',
    subtitulo: 'Dependencia',
    nombre: 'Secretaría de Obras Públicas (demo)',
    firmante: 'Ing. Director de Obras Públicas',
    detalles: [
      { label: 'Cargo', valor: 'Director de Obras Públicas' },
      { label: 'Oficio de designación', valor: 'SOP/DIR/2026-018' }
    ]
  },
  {
    num: 2,
    titulo: 'Supervisión',
    subtitulo: 'Externa contratada',
    nombre: 'Supervisión Externa Demo S.A. de C.V.',
    firmante: 'Ing. Supervisor Responsable',
    detalles: [
      { label: 'Cédula profesional', valor: '1234567' },
      { label: 'Contrato de supervisión', valor: 'SUP-2026-DEMO-001' }
    ]
  },
  {
    num: 3,
    titulo: 'Contratista',
    subtitulo: 'Persona moral adjudicada',
    nombre: 'Contratista Demo S.A.',
    firmante: 'Lic. Representante Legal',
    detalles: [
      { label: 'Poder notarial', valor: 'Escritura Núm. 12,345' },
      { label: 'RFC', valor: 'CDE260519XYZ' }
    ]
  }
];

export default function AperturaBitacora() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <nav className="text-xs text-slate-500 mb-1">
            <Link to="/" className="hover:text-sigecop-blue">Inicio</Link>
            <span className="mx-2">/</span>
            <span>Bitácora</span>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Apertura</span>
          </nav>
          <h1 className="text-2xl font-bold text-sigecop-blue">Apertura formal de la bitácora</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-md">
          <div className="text-xs text-sigecop-blue font-semibold uppercase">Contrato seleccionado</div>
          <div className="font-bold text-slate-900 mt-1">OP-2026-DEMO-001</div>
          <div className="text-sm text-slate-700">Rehabilitación de pavimento — tramo demo Sprint 0</div>
          <div className="text-xs text-slate-500 mt-1">Monto: $1,500,000.00 · Plazo: 120 días</div>
        </div>

        <div className="space-y-4">
          {PARTES.map((p) => (
            <div key={p.num} className="sg-card">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-sigecop-blue text-white flex items-center justify-center font-bold text-lg">
                    {p.num}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-sigecop-accent uppercase tracking-wide">
                      Parte {p.num} · {p.titulo}
                    </span>
                    <span className="text-xs text-slate-500">({p.subtitulo})</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{p.nombre}</div>
                  <div className="text-sm text-slate-700">Firmante: {p.firmante}</div>
                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {p.detalles.map((d) => (
                      <div key={d.label}>
                        <dt className="text-xs uppercase text-slate-500">{d.label}</dt>
                        <dd className="text-slate-800">{d.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-block px-2 py-1 text-xs rounded bg-sigecop-amber-bg text-sigecop-amber-attention font-medium">
                    Pendiente de firma
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 rounded-md text-sm">
          <div className="font-semibold text-sigecop-green-validation mb-1">Fundamento legal</div>
          <p className="text-slate-800">
            Art. 46 último párrafo de la <strong>LOPSRM</strong> y arts. 122–123 del <strong>RLOPSRM</strong>:
            la bitácora de obra debe abrirse de manera formal el día del inicio de los trabajos, con la
            participación de la dependencia contratante, la supervisión y el contratista.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link to="/" className="px-4 py-2 text-slate-600 hover:text-slate-900">Cancelar</Link>
          <button type="button" className="sg-btn-primary">
            Abrir bitácora oficialmente
          </button>
        </div>
      </main>
    </div>
  );
}
