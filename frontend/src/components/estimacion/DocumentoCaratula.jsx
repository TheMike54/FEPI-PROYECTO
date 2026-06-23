import { useEffect } from 'react';
import { monedaMXN as moneda } from '../../utils/formato.js';

// G3 (23-jun) — DOCUMENTO IMPRIMIBLE de la carátula de estimación (formato GACM, art. 132 RLOPSRM).
// Replica el patrón window.print de DocumentoNota/DocumentoFiniquito (clase body.doc-nota-abierto +
// data-print-area + @media print en index.css). NO recalcula nada: lee la estimación YA materializada
// (api.detalleEstimacion → caratula + acumulados + generadores) y el contrato (selected). Sin IVA
// (art. 2 fr. XIX RLOPSRM); amortización art. 143 fr. I; retención 5 al millar art. 191 LFD.

// Formateo de fecha tz-safe (las fechas vienen como 'YYYY-MM-DD'/ISO; evitamos el corrimiento de Date()).
const fechaMX = (s) => {
  if (!s) return '—';
  const p = String(s).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(s);
};
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 }));
const pctTxt = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);

export default function DocumentoCaratula({ estimacion, contrato, onCerrar }) {
  useEffect(() => {
    document.body.classList.add('doc-nota-abierto');
    return () => document.body.classList.remove('doc-nota-abierto');
  }, []);

  const e = estimacion || {};
  const c = contrato || {};
  const generadores = Array.isArray(e.generadores) ? e.generadores : [];
  const sinIva = e.acumulados?.sin_iva || null;
  const anticipo = e.acumulados?.anticipo || null;

  // Retención por atraso = residual de la carátula materializada (neto = subtotal − amort − 5almillar −
  // deductivas − retención atraso). Se deriva para que el documento cuadre exacto al centavo.
  const r2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
  const retencionAtraso = r2(Number(e.subtotal || 0) - Number(e.amortizacion || 0) - Number(e.retencion || 0) - Number(e.deductivas || 0) - Number(e.neto || 0));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black bg-opacity-40 p-4 overflow-auto" data-testid="documento-caratula">
      <div className="bg-white rounded-md shadow-lg max-w-4xl w-full my-6" data-print-area>
        <div className="px-6 py-3 border-b border-borde flex items-center justify-between" data-print-ocultar>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Carátula de estimación (art. 132 RLOPSRM)</h3>
          <div className="flex gap-2">
            <button type="button" className="sg-btn-primary" onClick={() => window.print()} data-testid="btn-imprimir-caratula">🖨 Imprimir / PDF</button>
            <button type="button" className="text-slate-500 hover:text-slate-800 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
          </div>
        </div>

        <div className="p-6 text-sm text-tinta leading-relaxed space-y-4">
          {/* Membrete */}
          <div className="text-center border-b border-borde pb-3">
            <div className="font-bold text-base text-guinda">SIGECOP — Sistema de Gestión de Contratos de Obra Pública</div>
            <div className="text-xs text-slate-500">Carátula de estimación · formato conforme al art. 132 RLOPSRM · importes sin IVA (art. 2 fr. XIX RLOPSRM)</div>
          </div>

          {/* Encabezado GACM: contrato + distinción CONTRATISTA (empresa) vs SUPERINTENDENTE (persona) */}
          <table className="w-full text-sm border border-borde rounded-md overflow-hidden" data-testid="caratula-doc-encabezado">
            <tbody>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600 w-64">Descripción de la obra o servicio</td><td className="px-3 py-2">{c.objeto || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Contrato</td><td className="px-3 py-2 font-mono">{c.folio || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Fecha del contrato</td><td className="px-3 py-2">{fechaMX(c.fecha_inicio)}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Contratista (empresa)</td><td className="px-3 py-2">{c.contratista || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Superintendente (responsable designado)</td><td className="px-3 py-2">{c.superintendente_nombre || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Estimación</td><td className="px-3 py-2 font-semibold">No. {e.numero ?? '—'}</td></tr>
              <tr><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Periodo</td><td className="px-3 py-2">{fechaMX(e.periodo_inicio)} – {fechaMX(e.periodo_fin)}</td></tr>
            </tbody>
          </table>

          {/* Resumen de generadores (conceptos a cobrar del periodo) */}
          <div>
            <div className="font-semibold text-slate-700 mb-1">Resumen de conceptos (números generadores)</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-sm" data-testid="caratula-doc-generadores">
                <thead className="bg-pagina text-slate-700">
                  <tr>
                    <th className="text-left p-2 font-semibold">Concepto</th>
                    <th className="text-left p-2 font-semibold">Unidad</th>
                    <th className="text-right p-2 font-semibold">P.U.</th>
                    <th className="text-right p-2 font-semibold">Cant. del periodo</th>
                    <th className="text-right p-2 font-semibold">Acumulado / contratado</th>
                    <th className="text-right p-2 font-semibold">Importe</th>
                    <th className="text-right p-2 font-semibold">% avance</th>
                  </tr>
                </thead>
                <tbody>
                  {generadores.length === 0 ? (
                    <tr><td colSpan={7} className="p-3 text-center text-slate-400 italic">Sin generadores.</td></tr>
                  ) : generadores.map((g) => (
                    <tr key={g.id} className="border-t border-borde">
                      <td className="p-2">{g.concepto}</td>
                      <td className="p-2 text-slate-500">{g.unidad}</td>
                      <td className="p-2 text-right font-mono text-xs">{moneda(g.pu_snapshot)}</td>
                      <td className="p-2 text-right">{num(g.cantidad_periodo)}</td>
                      <td className="p-2 text-right">{num(g.acumulado)} <span className="text-slate-400 text-xs">/ {num(g.cantidad_contratada)}</span></td>
                      <td className="p-2 text-right font-mono">{moneda(g.importe)}</td>
                      <td className="p-2 text-right">{pctTxt(g.avance_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Carátula financiera (sin IVA) */}
          <div>
            <div className="font-semibold text-slate-700 mb-1">Carátula (sin IVA)</div>
            <div className="overflow-x-auto border border-borde rounded-md max-w-xl">
              <table className="w-full text-sm" data-testid="caratula-doc-financiera">
                <tbody>
                  <tr className="border-b border-borde"><td className="px-4 py-2">Importe de la estimación (subtotal)</td><td className="px-4 py-2 text-right font-mono">{moneda(e.subtotal)}</td></tr>
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) Amortización del anticipo ({num(e.anticipo_pct_snapshot)}%, art. 143 fr. I RLOPSRM)</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.amortizacion)}</td></tr>
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) Retención 5 al millar (art. 191 LFD)</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.retencion)}</td></tr>
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) Deductivas</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.deductivas)}</td></tr>
                  {retencionAtraso > 0 && (
                    <tr className="border-b border-borde text-red-700"><td className="px-4 py-2">(−) Retención por atraso (art. 46 Bis LOPSRM)</td><td className="px-4 py-2 text-right font-mono">−{moneda(retencionAtraso)}</td></tr>
                  )}
                  <tr className="bg-guinda-soft font-bold"><td className="px-4 py-2 text-guinda">(=) Neto a pagar (sin IVA)</td><td className="px-4 py-2 text-right font-mono text-guinda" data-testid="caratula-doc-neto">{moneda(e.neto)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Integró: {e.integrada_por_nombre || '—'} · {fechaMX(e.integrada_en)}</p>
          </div>

          {/* Acumulados del contrato (sin IVA) */}
          {sinIva && (
            <div>
              <div className="font-semibold text-slate-700 mb-1">Acumulados del contrato (sin IVA)</div>
              <div className="overflow-x-auto border border-borde rounded-md max-w-xl">
                <table className="w-full text-sm" data-testid="caratula-doc-acumulados">
                  <thead className="bg-pagina text-slate-700"><tr><th className="text-left px-4 py-2 font-semibold">Concepto</th><th className="text-right px-4 py-2 font-semibold">Importe</th><th className="text-right px-4 py-2 font-semibold w-20">%</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-borde"><td className="px-4 py-2">Importe del contrato</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.importe_contrato)}</td><td className="px-4 py-2 text-right text-slate-400">100%</td></tr>
                    <tr className="border-t border-borde"><td className="px-4 py-2">Estimado acumulado anterior</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.estimado_acumulado_anterior)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(sinIva.estimado_acumulado_anterior_pct)}</td></tr>
                    <tr className="border-t border-borde"><td className="px-4 py-2">(+) Importe de esta estimación</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.estimacion_actual)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(sinIva.estimacion_actual_pct)}</td></tr>
                    <tr className="border-t border-borde font-semibold"><td className="px-4 py-2">(=) Estimado acumulado</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.estimado_acumulado_actual)}</td><td className="px-4 py-2 text-right">{pctTxt(sinIva.estimado_acumulado_actual_pct)}</td></tr>
                    <tr className="border-t border-borde font-semibold text-guinda"><td className="px-4 py-2">Saldo por estimar</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.saldo_por_estimar)}</td><td className="px-4 py-2 text-right">{pctTxt(sinIva.saldo_por_estimar_pct)}</td></tr>
                  </tbody>
                </table>
              </div>
              {anticipo && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Anticipo: {moneda(anticipo.importe_anticipo)} · amortizado acumulado {moneda(anticipo.amortizado_acumulado_actual)} · saldo por amortizar {moneda(anticipo.saldo_por_amortizar)} (art. 143 fr. I RLOPSRM).
                </p>
              )}
            </div>
          )}

          {/* Firmas (formato GACM) */}
          <div className="pt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Firmas</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
              {[
                { rol: 'Residente de obra', nombre: c.residente_nombre },
                { rol: 'Superintendente', nombre: c.superintendente_nombre },
                { rol: 'Supervisión externa', nombre: c.supervision_nombre },
                { rol: 'Autorizó (dependencia)', nombre: c.dependencia },
              ].map((f, i) => (
                <div key={i}>
                  <div className="border-t border-tinta h-10 mb-1" />
                  <div className="font-semibold text-slate-700">{f.nombre || '—'}</div>
                  <div className="text-[11px] text-slate-500">{f.rol}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 border-t border-borde pt-2">
            Documento generado por SIGECOP. La estimación se calcula sin IVA (art. 2 fr. XIX RLOPSRM); el IVA es un
            dato fiscal del CFDI. Carátula inmutable una vez integrada (art. 132 RLOPSRM).
          </p>
        </div>
      </div>
    </div>
  );
}
