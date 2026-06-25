import { useEffect } from 'react';
import { monedaMXN as moneda } from '../../utils/formato.js';

// G3 (23-jun) · REDISEÑO 24-jun (Maiki) — DOCUMENTO IMPRIMIBLE de la carátula de estimación (formato GACM,
// art. 132 RLOPSRM). Replica el patrón window.print de DocumentoNota/DocumentoFiniquito (clase
// body.doc-nota-abierto + data-print-area + @media print en styles/index.css). NO recalcula nada: lee la
// estimación YA materializada (api.detalleEstimacion → caratula + acumulados + generadores) y el contrato
// (selected). TODO sale de campos reales del payload; lo que no viene (no hay filas) sale con encabezados y
// sin datos, nunca inventado. Sin IVA (art. 2 fr. XIX RLOPSRM); amortización art. 143 fr. I; 5 al millar
// art. 191 LFD; retención por atraso art. 46 Bis LOPSRM.
//
// Estructura del mockup: banda guinda (Estimación N.º X · periodo) → datos del contrato → Bloque 1 Importes
// (sin IVA) → Bloque 2 Amortización del anticipo → Bloque 3 Neto a pagar (caja guinda) → nota legal →
// Resumen de conceptos (números generadores, con fila total) → firmas Elaboró/Revisó/Autorizó/Vo.Bo.

// Formateo de fecha tz-safe (las fechas vienen como 'YYYY-MM-DD'/ISO; evitamos el corrimiento de Date()).
const fechaMX = (s) => {
  if (!s) return '—';
  const p = String(s).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(s);
};
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 }));
const pctTxt = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
const r4 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 1e4) / 1e4;

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
  // deductivas − retención atraso). Se deriva para que el documento cuadre EXACTO al centavo.
  const r2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
  const retencionAtraso = r2(Number(e.subtotal || 0) - Number(e.amortizacion || 0) - Number(e.retencion || 0) - Number(e.deductivas || 0) - Number(e.neto || 0));
  // Total de la columna Importe del resumen (Σ ROUND(cant×pu,2)); cuadra con el subtotal de la carátula.
  const totalImporte = generadores.reduce((s, g) => s + Number(g.importe || 0), 0);

  // print-color-adjust local: fuerza que los fondos guinda salgan en el PDF (los navegadores los omiten por
  // defecto). Acotado al documento; NO toca el CSS global ni otras impresiones.
  const printColor = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black bg-opacity-40 p-4 overflow-auto" data-testid="documento-caratula">
      <div className="bg-white rounded-md shadow-lg max-w-4xl w-full my-6" data-print-area style={printColor}>
        {/* Barra de acciones (NO se imprime) */}
        <div className="px-6 py-3 border-b border-borde flex items-center justify-between" data-print-ocultar>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Carátula de estimación (art. 132 RLOPSRM)</h3>
          <div className="flex gap-2">
            <button type="button" className="sg-btn-primary" onClick={() => window.print()} data-testid="btn-imprimir-caratula">🖨 Imprimir / PDF</button>
            <button type="button" className="text-slate-500 hover:text-slate-800 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
          </div>
        </div>

        {/* Banda guinda: Estimación N.º X · periodo */}
        <div className="bg-guinda text-white px-8 py-4" style={printColor}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-90">SIGECOP · Sistema de Gestión de Contratos de Obra Pública</div>
              <div className="text-xl font-bold leading-tight">Estimación N.º {e.numero ?? '—'}</div>
            </div>
            <div className="text-right text-xs">
              <div className="uppercase tracking-wider opacity-90">Periodo</div>
              <div className="font-semibold text-sm">{fechaMX(e.periodo_inicio)} – {fechaMX(e.periodo_fin)}</div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 text-sm text-tinta leading-relaxed space-y-5">
          <div className="text-[11px] text-slate-500 -mt-2">
            Carátula conforme al art. 132 RLOPSRM · importes <strong>sin IVA</strong> (art. 2 fr. XIX RLOPSRM).
          </div>

          {/* Datos del contrato: Contratista (EMPRESA) vs Superintendente (PERSONA) separados */}
          <table className="w-full text-sm border border-borde rounded-md overflow-hidden" data-testid="caratula-doc-encabezado">
            <tbody>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600 w-64">Descripción de la obra o servicio</td><td className="px-3 py-2">{c.objeto || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Contrato</td><td className="px-3 py-2 font-mono">{c.folio || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Fecha del contrato</td><td className="px-3 py-2">{fechaMX(c.fecha_inicio)}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Contratista (empresa)</td><td className="px-3 py-2">{c.contratista || '—'}</td></tr>
              <tr><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Superintendente (responsable designado)</td><td className="px-3 py-2">{c.superintendente_nombre || '—'}</td></tr>
            </tbody>
          </table>

          {/* ── BLOQUE 1 · Importes (sin IVA) ──────────────────────────────────────────────────────────── */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">Bloque 1 · Importes (sin IVA)</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-sm" data-testid="caratula-doc-acumulados">
                <thead className="bg-pagina text-slate-700"><tr><th className="text-left px-4 py-2 font-semibold">Concepto</th><th className="text-right px-4 py-2 font-semibold">Importe</th><th className="text-right px-4 py-2 font-semibold w-24">%</th></tr></thead>
                <tbody>
                  {sinIva ? (
                    <>
                      <tr className="border-t border-borde"><td className="px-4 py-2">Importe del contrato</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.importe_contrato)}</td><td className="px-4 py-2 text-right text-slate-400">100%</td></tr>
                      <tr className="border-t border-borde"><td className="px-4 py-2">Estimado acumulado anterior</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.estimado_acumulado_anterior)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(sinIva.estimado_acumulado_anterior_pct)}</td></tr>
                      <tr className="border-t border-borde"><td className="px-4 py-2">(+) Importe de esta estimación</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.estimacion_actual)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(sinIva.estimacion_actual_pct)}</td></tr>
                      <tr className="border-t border-borde font-semibold"><td className="px-4 py-2">(=) Estimado acumulado actual</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.estimado_acumulado_actual)}</td><td className="px-4 py-2 text-right">{pctTxt(sinIva.estimado_acumulado_actual_pct)}</td></tr>
                      <tr className="border-t border-borde font-semibold text-guinda"><td className="px-4 py-2">Saldo por estimar</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.saldo_por_estimar)}</td><td className="px-4 py-2 text-right">{pctTxt(sinIva.saldo_por_estimar_pct)}</td></tr>
                    </>
                  ) : (
                    <tr><td colSpan={3} className="px-4 py-3 text-center text-slate-400 italic">Sin acumulados disponibles.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── BLOQUE 2 · Amortización del anticipo ───────────────────────────────────────────────────── */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">Bloque 2 · Amortización del anticipo (art. 143 fr. I RLOPSRM)</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-sm" data-testid="caratula-doc-amortizacion">
                <thead className="bg-pagina text-slate-700"><tr><th className="text-left px-4 py-2 font-semibold">Concepto</th><th className="text-right px-4 py-2 font-semibold">Importe</th><th className="text-right px-4 py-2 font-semibold w-24">%</th></tr></thead>
                <tbody>
                  {anticipo ? (
                    <>
                      <tr className="border-t border-borde"><td className="px-4 py-2">Anticipo otorgado</td><td className="px-4 py-2 text-right font-mono">{moneda(anticipo.importe_anticipo)}</td><td className="px-4 py-2 text-right text-slate-400">100%</td></tr>
                      <tr className="border-t border-borde"><td className="px-4 py-2">Amortizado acumulado anterior</td><td className="px-4 py-2 text-right font-mono">{moneda(anticipo.amortizado_acumulado_anterior)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(anticipo.amortizado_acumulado_anterior_pct)}</td></tr>
                      <tr className="border-t border-borde"><td className="px-4 py-2">(+) Amortización de esta estimación</td><td className="px-4 py-2 text-right font-mono">{moneda(anticipo.amortizacion_actual)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(anticipo.amortizacion_actual_pct)}</td></tr>
                      <tr className="border-t border-borde font-semibold text-guinda"><td className="px-4 py-2">Saldo por amortizar</td><td className="px-4 py-2 text-right font-mono">{moneda(anticipo.saldo_por_amortizar)}</td><td className="px-4 py-2 text-right">{pctTxt(anticipo.saldo_por_amortizar_pct)}</td></tr>
                    </>
                  ) : (
                    <tr><td colSpan={3} className="px-4 py-3 text-center text-slate-400 italic">Sin anticipo registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── BLOQUE 3 · Neto a pagar (sin IVA) ──────────────────────────────────────────────────────── */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">Bloque 3 · Neto a pagar (sin IVA)</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-sm" data-testid="caratula-doc-financiera">
                <tbody>
                  <tr className="border-b border-borde"><td className="px-4 py-2">Importe de la estimación (subtotal)</td><td className="px-4 py-2 text-right font-mono">{moneda(e.subtotal)}</td></tr>
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) Amortización del anticipo ({num(e.anticipo_pct_snapshot)}%, art. 143 fr. I RLOPSRM)</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.amortizacion)}</td></tr>
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) Retención 5 al millar (art. 191 LFD)</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.retencion)}</td></tr>
                  {retencionAtraso > 0 && (
                    <tr className="border-b border-borde text-red-700"><td className="px-4 py-2">(−) Retención por atraso (art. 46 Bis LOPSRM)</td><td className="px-4 py-2 text-right font-mono">−{moneda(retencionAtraso)}</td></tr>
                  )}
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) Deductivas</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.deductivas)}</td></tr>
                  <tr className="bg-guinda-soft font-bold" style={printColor}><td className="px-4 py-3 text-guinda text-base">(=) Neto a pagar (sin IVA)</td><td className="px-4 py-3 text-right font-mono text-guinda text-base" data-testid="caratula-doc-neto">{moneda(e.neto)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Integró: {e.integrada_por_nombre || '—'} · {fechaMX(e.integrada_en)}</p>
          </div>

          {/* Nota legal (sin IVA) */}
          <p className="text-[11px] text-slate-500 bg-pagina border border-borde rounded-md px-3 py-2">
            Los importes de esta carátula se expresan <strong>sin IVA</strong> (art. 2 fr. XIX RLOPSRM); el IVA es un
            dato fiscal que se documenta en el <strong>CFDI</strong> del pago, no en la estimación.
          </p>

          {/* Resumen de conceptos (números generadores) — formato GACM con fila total */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">Resumen de conceptos (números generadores)</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-[11px]" data-testid="caratula-doc-generadores">
                <thead className="bg-pagina text-slate-700">
                  <tr>
                    <th className="text-left p-2 font-semibold">#</th>
                    <th className="text-left p-2 font-semibold">Concepto</th>
                    <th className="text-left p-2 font-semibold">Unidad</th>
                    <th className="text-right p-2 font-semibold">Según proyecto</th>
                    <th className="text-right p-2 font-semibold">Acum. anterior</th>
                    <th className="text-right p-2 font-semibold">De esta estim.</th>
                    <th className="text-right p-2 font-semibold">Total estimado</th>
                    <th className="text-right p-2 font-semibold">Por ejecutar</th>
                    <th className="text-right p-2 font-semibold">P.U.</th>
                    <th className="text-right p-2 font-semibold">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {generadores.length === 0 ? (
                    <tr><td colSpan={10} className="p-3 text-center text-slate-400 italic">Sin generadores.</td></tr>
                  ) : (
                    <>
                      {generadores.map((g) => (
                        <tr key={g.id} className="border-t border-borde">
                          <td className="p-2 text-slate-500">{g.orden ?? '—'}</td>
                          <td className="p-2">{g.concepto}</td>
                          <td className="p-2 text-slate-500">{g.unidad}</td>
                          <td className="p-2 text-right">{num(g.cantidad_contratada)}</td>
                          <td className="p-2 text-right">{num(g.cantidad_anterior_acum)}</td>
                          <td className="p-2 text-right">{num(g.cantidad_periodo)}</td>
                          <td className="p-2 text-right">{num(g.acumulado)}</td>
                          <td className="p-2 text-right">{num(r4(Number(g.cantidad_contratada || 0) - Number(g.acumulado || 0)))}</td>
                          <td className="p-2 text-right font-mono">{moneda(g.pu_snapshot)}</td>
                          <td className="p-2 text-right font-mono">{moneda(g.importe)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-guinda bg-guinda-soft font-bold" style={printColor}>
                        <td className="p-2 text-guinda" colSpan={9}>Total (Σ importe del periodo)</td>
                        <td className="p-2 text-right font-mono text-guinda" data-testid="caratula-doc-total-importe">{moneda(totalImporte)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Firmas (formato GACM): Elaboró / Revisó / Autorizó / Vo.Bo. */}
          <div className="pt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Firmas</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
              {[
                { rol: 'Elaboró', sub: 'Superintendente de obra', nombre: c.superintendente_nombre },
                { rol: 'Revisó', sub: 'Supervisión externa', nombre: c.supervision_nombre },
                { rol: 'Autorizó', sub: 'Residente de obra', nombre: c.residente_nombre },
                { rol: 'Vo.Bo.', sub: 'Dependencia', nombre: c.dependencia },
              ].map((f, i) => (
                <div key={i}>
                  <div className="border-t border-tinta h-10 mb-1" />
                  <div className="font-bold text-guinda uppercase tracking-wider text-[11px]">{f.rol}</div>
                  <div className="font-semibold text-slate-700">{f.nombre || '—'}</div>
                  <div className="text-[11px] text-slate-500">{f.sub}</div>
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
