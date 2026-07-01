import { monedaMXN as moneda } from '../../utils/formato.js';

// DOCUMENTO "HOJA GENERADORA" (formato GACM, imagen 3.41.19 PM) — H4 / Mockup M3 del plan de hallazgos.
// UNA hoja por cada concepto CON cantidad en el periodo. Layout de 3 columnas:
//   CATÁLOGO (documento | unidad | cantidad contratada) · EJECUTADO EN EL PERIODO (unidad | cantidad | total)
//   · FOTOGRAFÍA DE LA ACTIVIDAD (reporte fotográfico del generador, art. 132 fr. IV RLOPSRM).
// Pie: TOTAL ESTA HOJA (cantidad del periodo) · ACUMULADO HOJA ANTERIOR (acumulado previo) · 3 firmas
// (residente · supervisor externo · superintendente). No inventa nada: lee cantidades/PU/fotos ya
// materializados de la estimación. Las fotos (blob URLs) las descarga el componente padre y se pasan como props.

const num = (n) => (n == null ? '—' : Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 }));
const fechaMX = (s) => {
  if (!s) return '—';
  const p = String(s).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(s);
};

export default function DocumentoHojaGeneradora({ estimacion, contrato, clavesPorConcepto = {}, fotos = [], urls = {} }) {
  const e = estimacion || {};
  const c = contrato || {};
  const meta = clavesPorConcepto || {};
  const claveDe = (g) => (meta[g.contrato_concepto_id]?.clave) || g.clave || '—';
  const partidaDe = (clave) => {
    const s = String(clave || '').trim();
    const p = s.split('.');
    return p.length >= 2 ? `${p[0]}.${p[1]}` : (s || '—');
  };
  const fotosDe = (cid) => (Array.isArray(fotos) ? fotos.filter((f) => Number(f.contrato_concepto_id) === Number(cid)) : []);

  // Una hoja por concepto CON movimiento en el periodo (cantidad_periodo > 0).
  const hojas = (Array.isArray(e.generadores) ? e.generadores : []).filter((g) => Number(g.cantidad_periodo || 0) > 0);
  const total = hojas.length;

  const printColor = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' };
  const saltoPagina = { ...printColor, breakBefore: 'page' };

  if (total === 0) {
    return (
      <div style={saltoPagina} data-testid="documento-hoja-generadora">
        <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">Bloque 6 · Hojas generadoras (art. 132 fr. IV RLOPSRM)</div>
        <p className="text-[11px] text-slate-400 italic">Sin conceptos con cantidad en el periodo: no hay hojas generadoras que emitir.</p>
      </div>
    );
  }

  return (
    <div style={saltoPagina} data-testid="documento-hoja-generadora">
      <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-2">Bloque 6 · Hojas generadoras (una por concepto, art. 132 fr. IV RLOPSRM)</div>
      <div className="space-y-4">
        {hojas.map((g, i) => {
          const clave = claveDe(g);
          const fs = fotosDe(g.contrato_concepto_id);
          const foto = fs[0] || null;
          return (
            <div key={g.id ?? g.contrato_concepto_id} className="border border-borde rounded-md overflow-hidden" style={{ breakInside: 'avoid', ...printColor }} data-testid={`hoja-generadora-${g.contrato_concepto_id}`}>
              {/* Encabezado GACM */}
              <div className="bg-guinda text-white px-4 py-2 flex items-start justify-between text-[11px]" style={printColor}>
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-90">{c.dependencia || 'Dependencia'}</div>
                  <div className="font-bold text-sm">Hoja generadora {i + 1} de {total}</div>
                </div>
                <div className="text-right">
                  <div>Estimación N.º {e.numero ?? '—'}</div>
                  <div className="opacity-90">Periodo: {fechaMX(e.periodo_inicio)} – {fechaMX(e.periodo_fin)}</div>
                  <div className="opacity-90 font-mono">Contrato: {c.folio || '—'}</div>
                </div>
              </div>

              {/* Datos de obra / partida / clave */}
              <table className="w-full text-[11px] border-b border-borde">
                <tbody>
                  <tr className="border-b border-borde">
                    <td className="px-3 py-1 bg-pagina font-semibold text-slate-600 w-40">Descripción de la obra</td>
                    <td className="px-3 py-1">{c.objeto || '—'}</td>
                    <td className="px-3 py-1 bg-pagina font-semibold text-slate-600 w-24">Partida</td>
                    <td className="px-3 py-1 font-mono">{partidaDe(clave)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1 bg-pagina font-semibold text-slate-600">Ubicación</td>
                    <td className="px-3 py-1">{c.ubicacion || '—'}</td>
                    <td className="px-3 py-1 bg-pagina font-semibold text-slate-600">Clave</td>
                    <td className="px-3 py-1 font-mono">{clave}</td>
                  </tr>
                </tbody>
              </table>

              {/* 3 columnas: catálogo · ejecutado · fotografía */}
              <div className="grid grid-cols-1 md:grid-cols-3 text-[11px]">
                {/* CATÁLOGO */}
                <div className="border-r border-borde">
                  <div className="bg-pagina px-2 py-1 font-semibold text-center text-slate-700 border-b border-borde">Catálogo</div>
                  <table className="w-full">
                    <thead className="text-slate-600"><tr>
                      <th className="text-left px-2 py-1 font-semibold">Documento</th>
                      <th className="text-right px-2 py-1 font-semibold w-14">Unid.</th>
                      <th className="text-right px-2 py-1 font-semibold w-16">Cant.</th>
                    </tr></thead>
                    <tbody><tr className="border-t border-borde align-top">
                      <td className="px-2 py-1">{g.concepto}</td>
                      <td className="px-2 py-1 text-right">{g.unidad || '—'}</td>
                      <td className="px-2 py-1 text-right">{num(g.cantidad_contratada)}</td>
                    </tr></tbody>
                  </table>
                </div>
                {/* EJECUTADO EN EL PERIODO */}
                <div className="border-r border-borde">
                  <div className="bg-pagina px-2 py-1 font-semibold text-center text-slate-700 border-b border-borde">Ejecutado en el periodo</div>
                  <table className="w-full">
                    <thead className="text-slate-600"><tr>
                      <th className="text-right px-2 py-1 font-semibold w-14">Unid.</th>
                      <th className="text-right px-2 py-1 font-semibold">Cantidad</th>
                      <th className="text-right px-2 py-1 font-semibold">Total</th>
                    </tr></thead>
                    <tbody><tr className="border-t border-borde">
                      <td className="px-2 py-1 text-right">{g.unidad || '—'}</td>
                      <td className="px-2 py-1 text-right font-semibold">{num(g.cantidad_periodo)}</td>
                      <td className="px-2 py-1 text-right font-semibold">{num(g.cantidad_periodo)}</td>
                    </tr></tbody>
                  </table>
                  <div className="px-2 py-1 text-[10px] text-slate-500 border-t border-borde">
                    P.U. {moneda(g.pu_snapshot)} · Importe <span className="font-mono text-guinda">{moneda(g.importe)}</span>
                  </div>
                </div>
                {/* FOTOGRAFÍA DE LA ACTIVIDAD */}
                <div>
                  <div className="bg-pagina px-2 py-1 font-semibold text-center text-slate-700 border-b border-borde">Fotografía de la actividad</div>
                  <div className="p-2 flex flex-col items-center gap-1">
                    {foto && urls[foto.id]
                      ? <img src={urls[foto.id]} alt={foto.nombre || 'foto'} className="w-40 h-32 object-cover rounded border border-borde" />
                      : <div className="w-40 h-32 rounded border border-borde bg-pagina flex items-center justify-center text-2xl text-slate-400">📷</div>}
                    <div className="text-[10px] text-slate-600 text-center">{g.concepto}</div>
                    <div className="text-[9px] text-slate-400 text-center">Clave {clave} · {fechaMX(e.periodo_fin)}</div>
                    {fs.length > 1 && <div className="text-[9px] text-slate-400">(+{fs.length - 1} foto{fs.length - 1 === 1 ? '' : 's'} en el expediente)</div>}
                  </div>
                </div>
              </div>

              {/* Totales de la hoja */}
              <div className="grid grid-cols-2 text-[11px] border-t border-borde">
                <div className="px-3 py-1.5 border-r border-borde flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Total esta hoja</span>
                  <span className="font-mono font-semibold">{num(g.cantidad_periodo)} {g.unidad}</span>
                </div>
                <div className="px-3 py-1.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Acumulado hoja anterior</span>
                  <span className="font-mono">{num(g.cantidad_anterior_acum)} {g.unidad}</span>
                </div>
              </div>

              {/* 3 firmas */}
              <div className="grid grid-cols-3 gap-4 text-center text-[11px] px-4 py-3 border-t border-borde" style={{ breakInside: 'avoid' }}>
                {[
                  { rol: 'Residente', nombre: c.residente_nombre },
                  { rol: 'Supervisor externo', nombre: c.supervision_nombre },
                  { rol: 'Superintendente', nombre: c.superintendente_nombre },
                ].map((f, j) => (
                  <div key={j}>
                    <div className="border-t border-tinta h-8 mb-1" />
                    <div className="font-bold text-guinda uppercase tracking-wider text-[10px]">{f.rol}</div>
                    <div className="font-semibold text-slate-700">{f.nombre || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
