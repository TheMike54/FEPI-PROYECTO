import { useEffect, useState } from 'react';
import { monedaMXN as moneda } from '../../utils/formato.js';
import { api } from '../../services/api.js';

// DOCUMENTO DE ESTIMACIÓN COMPLETO (formato GACM, art. 132 RLOPSRM) — 4 bloques del mockup APROBADO
// (docs/mockups/estimacion_completa_25jun.html):
//   1) CARÁTULA  → encabezado + 3 secciones (1 Importes sin IVA · 2 Del anticipo · 3 Del neto a recibir)
//                  + 4 firmas (presenta/revisó/autorizó/Vo.Bo.)
//   2) RESUMEN DE GENERADORES → cuadro global por concepto (con clave).
//   3) GENERADOR POR CONCEPTO → uno por concepto: clave/unidad/concepto, catálogo vs ejecutado + reporte fotográfico.
//   4) SOPORTES → reporte fotográfico por generador + notas de bitácora de entrega vinculadas.
//
// NO recalcula los montos de obra: lee la estimación YA materializada (api.detalleEstimacion → caratula +
// acumulados + generadores) y el contrato (selected). TODO sale de campos reales del payload; lo que no
// viene sale con encabezados y sin datos, nunca inventado.
//
// IVA (decisión 25-jun): Secciones 1 y 2 SIN IVA (art. 2 fr. XIX RLOPSRM = monto ejercido sin IVA). La
// Sección 3 "Del neto a recibir" SÍ lleva IVA (16%) por ser el importe efectivamente a pagar; el IVA se
// DERIVA en presentación (no muta la carátula inmutable, que sigue en neto sin IVA). Amortización
// proporcional art. 143 fr. I; 5 al millar art. 191 LFD; retención por atraso art. 46 Bis LOPSRM;
// estimación: el contratista PRESENTA y la residencia AUTORIZA (art. 54 LOPSRM).

const IVA = 0.16;
const fechaMX = (s) => {
  if (!s) return '—';
  const p = String(s).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(s);
};
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 }));
const pctTxt = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
const r4 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 1e4) / 1e4;
const r2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export default function DocumentoCaratula({ estimacion, contrato, clavesPorConcepto = {}, onCerrar }) {
  const e = estimacion || {};
  const c = contrato || {};
  const generadores = Array.isArray(e.generadores) ? e.generadores : [];
  const notas = Array.isArray(e.notas) ? e.notas : [];
  const sinIva = e.acumulados?.sin_iva || null;
  const anticipo = e.acumulados?.anticipo || null;
  const meta = clavesPorConcepto || {};
  const claveDe = (g) => (meta[g.contrato_concepto_id]?.clave) || g.clave || '—';
  const esAdic = (g) => !!(meta[g.contrato_concepto_id]?.es_adicional);
  const porEjecutar = (g) => r4(Number(g.cantidad_contratada || 0) - Number(g.acumulado || 0));

  // ── Reporte fotográfico por generador (art. 132 fr. IV RLOPSRM): se descarga la lista + blob URLs (el
  //    binario va con Authorization, que un <img src> normal no podría enviar). No bloquea el documento. ──
  const [fotos, setFotos] = useState([]);
  const [urls, setUrls] = useState({});
  useEffect(() => {
    document.body.classList.add('doc-nota-abierto');
    return () => document.body.classList.remove('doc-nota-abierto');
  }, []);
  useEffect(() => {
    let vivo = true; const creados = [];
    (async () => {
      if (!e.id) return;
      try {
        const lista = await api.listarFotosEstimacion(e.id);
        const arr = Array.isArray(lista) ? lista : [];
        if (!vivo) return;
        setFotos(arr);
        const m = {};
        await Promise.all(arr.map(async (f) => {
          try { const u = await api.descargarFotoEstimacion(f.id); m[f.id] = u; creados.push(u); } catch { /* skip */ }
        }));
        if (vivo) setUrls(m); else creados.forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } });
      } catch { /* sin fotos: el documento se muestra igual */ }
    })();
    return () => { vivo = false; creados.forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } }); };
  }, [e.id]);
  const fotosDe = (cid) => fotos.filter((f) => Number(f.contrato_concepto_id) === Number(cid));

  // ── Derivaciones financieras (sobre los montos congelados de la carátula; todo en 2 decimales) ──
  const subtotal = Number(e.subtotal || 0);
  const amort = Number(e.amortizacion || 0);
  const ret5 = Number(e.retencion || 0);          // 5 al millar (art. 191 LFD)
  const deduc = Number(e.deductivas || 0);
  const netoSinIva = Number(e.neto || 0);
  // Retención por atraso = residual de la carátula materializada (neto = subtotal − amort − 5almillar −
  // deductivas − retención atraso), derivado para que el documento cuadre EXACTO al centavo.
  const retAtraso = r2(subtotal - amort - ret5 - deduc - netoSinIva);
  const ivaEst = r2(subtotal * IVA);
  const totalEst = r2(subtotal + ivaEst);
  const ivaAmort = r2(amort * IVA);
  const totalAmort = r2(amort + ivaAmort);
  // Neto a recibir CON IVA = total estimación − total amortización − 5 al millar − atraso − deductivas.
  // Equivale a (neto sin IVA) + IVA estimación − IVA amortización → cuadra al centavo con el server.
  const netoARecibir = r2(totalEst - totalAmort - ret5 - retAtraso - deduc);
  // Total de la columna Importe del resumen (Σ ROUND(cant×pu,2)); cuadra con el subtotal de la carátula.
  const totalImporte = generadores.reduce((s, g) => s + Number(g.importe || 0), 0);

  // print-color-adjust local (los navegadores omiten fondos al imprimir). Acotado al documento.
  const printColor = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' };
  const saltoPagina = { ...printColor, breakBefore: 'page' }; // un bloque por página al imprimir
  const noCortar = { breakInside: 'avoid' };

  const Miniaturas = ({ items }) => (
    items.length === 0
      ? <p className="text-[11px] text-slate-400 italic">Sin reporte fotográfico para este generador.</p>
      : (
        <div className="flex flex-wrap gap-2">
          {items.map((f) => (
            <div key={f.id} className="text-center">
              {urls[f.id]
                ? <img src={urls[f.id]} alt={f.nombre || 'foto'} className="w-24 h-24 object-cover rounded border border-borde" />
                : <div className="w-24 h-24 rounded border border-borde bg-pagina flex items-center justify-center text-lg">📷</div>}
              {f.descripcion ? <div className="text-[9px] text-slate-500 w-24 truncate">{f.descripcion}</div> : null}
            </div>
          ))}
        </div>
      )
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black bg-opacity-40 p-4 overflow-auto" data-testid="documento-caratula">
      <div className="bg-white rounded-md shadow-lg max-w-4xl w-full my-6" data-print-area style={printColor}>
        {/* Barra de acciones (NO se imprime) */}
        <div className="px-6 py-3 border-b border-borde flex items-center justify-between" data-print-ocultar>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Documento de estimación (art. 132 RLOPSRM)</h3>
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

          {/* ════════════ BLOQUE 1 · CARÁTULA ════════════ */}
          <div className="text-[11px] text-slate-500 -mt-2">
            <strong className="text-guinda">Bloque 1 · Carátula.</strong> Importes de obra <strong>sin IVA</strong> (art. 2 fr. XIX RLOPSRM); el IVA solo aparece en el neto a recibir (Sección 3).
          </div>

          {/* Encabezado: Contratista (EMPRESA) vs Superintendente (PERSONA) separados */}
          <table className="w-full text-sm border border-borde rounded-md overflow-hidden" data-testid="caratula-doc-encabezado">
            <tbody>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600 w-64">Descripción de la obra o servicio</td><td className="px-3 py-2">{c.objeto || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">No. de contrato</td><td className="px-3 py-2 font-mono">{c.folio || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Fecha del contrato</td><td className="px-3 py-2">{fechaMX(c.fecha_inicio)}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Dependencia</td><td className="px-3 py-2">{c.dependencia || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Contratista (empresa)</td><td className="px-3 py-2">{c.contratista || '—'}</td></tr>
              <tr className="border-b border-borde"><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">Superintendente (responsable designado)</td><td className="px-3 py-2">{c.superintendente_nombre || '—'}</td></tr>
              <tr><td className="px-3 py-2 bg-pagina font-semibold text-slate-600">No. de estimación · % que representa</td><td className="px-3 py-2">N.º {e.numero ?? '—'} · {pctTxt(sinIva?.estimacion_actual_pct)} del contrato</td></tr>
            </tbody>
          </table>

          {/* ── Sección 1 · Importes (sin IVA) ── */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">1 · Importes sin IVA</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-sm" data-testid="caratula-doc-acumulados">
                <thead className="bg-pagina text-slate-700"><tr><th className="text-left px-4 py-2 font-semibold">Concepto</th><th className="text-right px-4 py-2 font-semibold">Importe</th><th className="text-right px-4 py-2 font-semibold w-24">%</th></tr></thead>
                <tbody>
                  {sinIva ? (
                    <>
                      <tr className="border-t border-borde"><td className="px-4 py-2">Importe del contrato</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.importe_contrato)}</td><td className="px-4 py-2 text-right text-slate-400">100%</td></tr>
                      <tr className="border-t border-borde"><td className="px-4 py-2">Importe estimado acumulado anterior</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.estimado_acumulado_anterior)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(sinIva.estimado_acumulado_anterior_pct)}</td></tr>
                      <tr className="border-t border-borde"><td className="px-4 py-2">(+) Importe de esta estimación</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.estimacion_actual)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(sinIva.estimacion_actual_pct)}</td></tr>
                      <tr className="border-t border-borde font-semibold"><td className="px-4 py-2">(=) Importe estimado acumulado actual</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.estimado_acumulado_actual)}</td><td className="px-4 py-2 text-right">{pctTxt(sinIva.estimado_acumulado_actual_pct)}</td></tr>
                      <tr className="border-t border-borde font-semibold text-guinda"><td className="px-4 py-2">Saldo por estimar</td><td className="px-4 py-2 text-right font-mono">{moneda(sinIva.saldo_por_estimar)}</td><td className="px-4 py-2 text-right">{pctTxt(sinIva.saldo_por_estimar_pct)}</td></tr>
                    </>
                  ) : (
                    <tr><td colSpan={3} className="px-4 py-3 text-center text-slate-400 italic">Sin acumulados disponibles.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Sección 2 · Del anticipo ── */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">2 · Del anticipo (amortización proporcional, art. 143 fr. I RLOPSRM)</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-sm" data-testid="caratula-doc-amortizacion">
                <thead className="bg-pagina text-slate-700"><tr><th className="text-left px-4 py-2 font-semibold">Concepto</th><th className="text-right px-4 py-2 font-semibold">Importe</th><th className="text-right px-4 py-2 font-semibold w-24">%</th></tr></thead>
                <tbody>
                  {anticipo ? (
                    <>
                      <tr className="border-t border-borde"><td className="px-4 py-2">Importe del anticipo</td><td className="px-4 py-2 text-right font-mono">{moneda(anticipo.importe_anticipo)}</td><td className="px-4 py-2 text-right text-slate-400">100%</td></tr>
                      <tr className="border-t border-borde"><td className="px-4 py-2">Importe amortizado acumulado anterior</td><td className="px-4 py-2 text-right font-mono">{moneda(anticipo.amortizado_acumulado_anterior)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(anticipo.amortizado_acumulado_anterior_pct)}</td></tr>
                      <tr className="border-t border-borde"><td className="px-4 py-2">(+) Importe de la amortización de esta estimación</td><td className="px-4 py-2 text-right font-mono">{moneda(anticipo.amortizacion_actual)}</td><td className="px-4 py-2 text-right text-slate-500">{pctTxt(anticipo.amortizacion_actual_pct)}</td></tr>
                      <tr className="border-t border-borde font-semibold"><td className="px-4 py-2">(=) Importe amortizado acumulado actual</td><td className="px-4 py-2 text-right font-mono">{moneda(anticipo.amortizado_acumulado_actual)}</td><td className="px-4 py-2 text-right">{pctTxt(anticipo.amortizado_acumulado_actual_pct)}</td></tr>
                      <tr className="border-t border-borde font-semibold text-guinda"><td className="px-4 py-2">Saldo por amortizar</td><td className="px-4 py-2 text-right font-mono">{moneda(anticipo.saldo_por_amortizar)}</td><td className="px-4 py-2 text-right">{pctTxt(anticipo.saldo_por_amortizar_pct)}</td></tr>
                    </>
                  ) : (
                    <tr><td colSpan={3} className="px-4 py-3 text-center text-slate-400 italic">Sin anticipo registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Sección 3 · Del neto a recibir (CON IVA) ── */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">3 · Del neto a recibir (incluye IVA)</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-sm" data-testid="caratula-doc-financiera">
                <tbody>
                  <tr className="border-b border-borde"><td className="px-4 py-2">Importe estimación</td><td className="px-4 py-2 text-right font-mono">{moneda(subtotal)}</td></tr>
                  <tr className="border-b border-borde"><td className="px-4 py-2">(+) I.V.A. estimación (16%)</td><td className="px-4 py-2 text-right font-mono">{moneda(ivaEst)}</td></tr>
                  <tr className="border-b border-borde font-semibold"><td className="px-4 py-2">(=) Total de estimación</td><td className="px-4 py-2 text-right font-mono">{moneda(totalEst)}</td></tr>
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) Amortización del anticipo ({num(e.anticipo_pct_snapshot)}%, art. 143 fr. I RLOPSRM)</td><td className="px-4 py-2 text-right font-mono">−{moneda(amort)}</td></tr>
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) I.V.A. amortización del anticipo (16%)</td><td className="px-4 py-2 text-right font-mono">−{moneda(ivaAmort)}</td></tr>
                  <tr className="border-b border-borde font-semibold"><td className="px-4 py-2">(=) Total amortización</td><td className="px-4 py-2 text-right font-mono">−{moneda(totalAmort)}</td></tr>
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) Retención 5 al millar (art. 191 LFD)</td><td className="px-4 py-2 text-right font-mono">−{moneda(ret5)}</td></tr>
                  {retAtraso > 0 && (
                    <tr className="border-b border-borde text-red-700"><td className="px-4 py-2">(−) Retención por atraso (art. 46 Bis LOPSRM)</td><td className="px-4 py-2 text-right font-mono">−{moneda(retAtraso)}</td></tr>
                  )}
                  <tr className="border-b border-borde"><td className="px-4 py-2">(−) Deductivas / trabajos no ejecutados</td><td className="px-4 py-2 text-right font-mono">−{moneda(deduc)}</td></tr>
                  <tr className="bg-guinda-soft font-bold" style={printColor}><td className="px-4 py-3 text-guinda text-base">(=) Neto a recibir (incluye IVA)</td><td className="px-4 py-3 text-right font-mono text-guinda text-base" data-testid="caratula-doc-neto">{moneda(netoARecibir)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Integró: {e.integrada_por_nombre || '—'} · {fechaMX(e.integrada_en)}</p>
          </div>

          {/* Nota legal */}
          <p className="text-[11px] text-slate-500 bg-pagina border border-borde rounded-md px-3 py-2">
            Importes de obra (Secciones 1 y 2) <strong>sin IVA</strong> (art. 2 fr. XIX RLOPSRM). La Sección 3
            (neto a recibir) incluye el <strong>IVA (16%)</strong> por ser el importe efectivamente a pagar.
            La carátula materializada es <strong>inmutable</strong> una vez integrada (art. 132 RLOPSRM).
          </p>

          {/* Firmas (formato GACM): Presenta / Revisó / Autorizó / Vo.Bo. — empresa + persona */}
          <div className="pt-2" style={noCortar}>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Firmas (art. 54 LOPSRM: el contratista presenta, la residencia autoriza)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
              {[
                { rol: 'Presenta', sub: 'Superintendente · contratista', nombre: c.superintendente_nombre, emp: c.contratista },
                { rol: 'Revisó', sub: 'Supervisión externa', nombre: c.supervision_nombre, emp: null },
                { rol: 'Autorizó', sub: 'Residente de obra', nombre: c.residente_nombre, emp: null },
                { rol: 'Vo.Bo.', sub: 'Dependencia', nombre: c.dependencia, emp: null },
              ].map((f, i) => (
                <div key={i}>
                  <div className="border-t border-tinta h-10 mb-1" />
                  <div className="font-bold text-guinda uppercase tracking-wider text-[11px]">{f.rol}</div>
                  <div className="font-semibold text-slate-700">{f.nombre || '—'}</div>
                  <div className="text-[11px] text-slate-500">{f.sub}</div>
                  {f.emp ? <div className="text-[10px] text-slate-400 italic">{f.emp}</div> : null}
                </div>
              ))}
            </div>
          </div>

          {/* ════════════ BLOQUE 2 · RESUMEN DE GENERADORES ════════════ */}
          <div style={saltoPagina}>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">Bloque 2 · Resumen de generadores (cuadro global por concepto)</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-[11px]" data-testid="caratula-doc-generadores">
                <thead className="bg-pagina text-slate-700">
                  <tr>
                    <th className="text-left p-2 font-semibold">#</th>
                    <th className="text-left p-2 font-semibold">Clave</th>
                    <th className="text-left p-2 font-semibold">Concepto</th>
                    <th className="text-left p-2 font-semibold">Unidad</th>
                    <th className="text-right p-2 font-semibold">Según proyecto</th>
                    <th className="text-right p-2 font-semibold">Hasta est. anterior</th>
                    <th className="text-right p-2 font-semibold">De esta estim.</th>
                    <th className="text-right p-2 font-semibold">Total estimado</th>
                    <th className="text-right p-2 font-semibold">Por ejecutar</th>
                    <th className="text-right p-2 font-semibold">P.U.</th>
                    <th className="text-right p-2 font-semibold">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {generadores.length === 0 ? (
                    <tr><td colSpan={11} className="p-3 text-center text-slate-400 italic">Sin generadores.</td></tr>
                  ) : (
                    <>
                      {generadores.map((g) => (
                        <tr key={g.id} className="border-t border-borde">
                          <td className="p-2 text-slate-500">{g.orden ?? '—'}</td>
                          <td className="p-2 font-mono text-[10px]">{claveDe(g)}{esAdic(g) && <span className="ml-1 px-1 rounded bg-amber-100 text-amber-700 text-[8px] font-bold">ADIC.</span>}</td>
                          <td className="p-2">{g.concepto}</td>
                          <td className="p-2 text-slate-500">{g.unidad}</td>
                          <td className="p-2 text-right">{num(g.cantidad_contratada)}</td>
                          <td className="p-2 text-right">{num(g.cantidad_anterior_acum)}</td>
                          <td className="p-2 text-right">{num(g.cantidad_periodo)}</td>
                          <td className="p-2 text-right">{num(g.acumulado)}</td>
                          <td className="p-2 text-right">{num(porEjecutar(g))}</td>
                          <td className="p-2 text-right font-mono">{moneda(g.pu_snapshot)}</td>
                          <td className="p-2 text-right font-mono">{moneda(g.importe)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-guinda bg-guinda-soft font-bold" style={printColor}>
                        <td className="p-2 text-guinda" colSpan={10}>Total de hoja (Σ importe del periodo, sin IVA)</td>
                        <td className="p-2 text-right font-mono text-guinda" data-testid="caratula-doc-total-importe">{moneda(totalImporte)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Monto derivado como Σ ROUND(cantidad × precio unitario, 2) — cuadre exacto al centavo. Clave de
              concepto del catálogo (art. 45 ap. A fr. IX RLOPSRM).
            </p>
          </div>

          {/* ════════════ BLOQUE 3 · GENERADOR POR CONCEPTO ════════════ */}
          <div style={saltoPagina}>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-2">Bloque 3 · Generador por concepto</div>
            {generadores.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">Sin generadores que detallar.</p>
            ) : (
              <div className="space-y-4">
                {generadores.map((g) => (
                  <div key={g.id} className="border border-borde rounded-md overflow-hidden" style={noCortar} data-testid={`generador-detalle-${g.contrato_concepto_id}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 text-[11px]">
                      <div className="px-3 py-2 border-b border-r border-borde bg-pagina"><div className="text-slate-500 uppercase text-[9px]">Clave</div><div className="font-mono font-semibold">{claveDe(g)}{esAdic(g) && <span className="ml-1 px-1 rounded bg-amber-100 text-amber-700 text-[8px] font-bold">ADIC.</span>}</div></div>
                      <div className="px-3 py-2 border-b border-r border-borde bg-pagina"><div className="text-slate-500 uppercase text-[9px]">Unidad</div><div className="font-semibold">{g.unidad || '—'}</div></div>
                      <div className="px-3 py-2 border-b border-r border-borde bg-pagina"><div className="text-slate-500 uppercase text-[9px]">P.U.</div><div className="font-mono font-semibold">{moneda(g.pu_snapshot)}</div></div>
                      <div className="px-3 py-2 border-b border-borde bg-pagina"><div className="text-slate-500 uppercase text-[9px]">Importe del periodo</div><div className="font-mono font-semibold text-guinda">{moneda(g.importe)}</div></div>
                      <div className="px-3 py-2 col-span-2 md:col-span-4"><div className="text-slate-500 uppercase text-[9px]">Concepto</div><div>{g.concepto}</div></div>
                    </div>
                    <table className="w-full text-[11px] border-t border-borde">
                      <thead className="bg-pagina text-slate-700"><tr>
                        <th className="text-right p-2 font-semibold">Cantidad según proyecto / catálogo</th>
                        <th className="text-right p-2 font-semibold">Acumulado hoja anterior</th>
                        <th className="text-right p-2 font-semibold">Ejecutado del periodo</th>
                        <th className="text-right p-2 font-semibold">Total estimado</th>
                        <th className="text-right p-2 font-semibold">Por ejecutar</th>
                      </tr></thead>
                      <tbody><tr className="border-t border-borde">
                        <td className="p-2 text-right">{num(g.cantidad_contratada)} {g.unidad}</td>
                        <td className="p-2 text-right">{num(g.cantidad_anterior_acum)} {g.unidad}</td>
                        <td className="p-2 text-right font-semibold">{num(g.cantidad_periodo)} {g.unidad}</td>
                        <td className="p-2 text-right">{num(g.acumulado)} {g.unidad}</td>
                        <td className="p-2 text-right">{num(porEjecutar(g))} {g.unidad}</td>
                      </tr></tbody>
                    </table>
                    <div className="px-3 py-2 border-t border-borde">
                      <div className="text-slate-500 uppercase text-[9px] mb-1">Reporte fotográfico del periodo</div>
                      <Miniaturas items={fotosDe(g.contrato_concepto_id)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ════════════ BLOQUE 4 · SOPORTES ════════════ */}
          <div style={saltoPagina}>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-2">Bloque 4 · Soportes (por generador + notas de bitácora de entrega)</div>

            {/* 4a · Reporte fotográfico por generador (soporte vinculado a CADA generador) */}
            <div className="border border-borde rounded-md overflow-hidden mb-4">
              <table className="w-full text-[11px]" data-testid="caratula-doc-soportes-fotos">
                <thead className="bg-pagina text-slate-700"><tr>
                  <th className="text-left p-2 font-semibold">#</th>
                  <th className="text-left p-2 font-semibold">Clave</th>
                  <th className="text-left p-2 font-semibold">Concepto</th>
                  <th className="text-right p-2 font-semibold">Fotos de soporte</th>
                  <th className="text-left p-2 font-semibold">Estado</th>
                </tr></thead>
                <tbody>
                  {generadores.length === 0 ? (
                    <tr><td colSpan={5} className="p-3 text-center text-slate-400 italic">Sin generadores.</td></tr>
                  ) : generadores.map((g) => {
                    const n = fotosDe(g.contrato_concepto_id).length;
                    return (
                      <tr key={g.id} className="border-t border-borde">
                        <td className="p-2 text-slate-500">{g.orden ?? '—'}</td>
                        <td className="p-2 font-mono text-[10px]">{claveDe(g)}</td>
                        <td className="p-2">{g.concepto}</td>
                        <td className="p-2 text-right">{n}</td>
                        <td className="p-2">{n > 0 ? <span className="px-1.5 rounded bg-emerald-100 text-emerald-700 text-[10px]">Con evidencia</span> : <span className="px-1.5 rounded bg-amber-100 text-amber-700 text-[10px]">Pendiente</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4b · Notas de bitácora de entrega vinculadas a la estimación (art. 132 fr. II / 125 RLOPSRM) */}
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Notas de bitácora de entrega vinculadas</div>
            <div className="border border-borde rounded-md overflow-hidden">
              <table className="w-full text-[11px]" data-testid="caratula-doc-soportes-notas">
                <thead className="bg-pagina text-slate-700"><tr>
                  <th className="text-left p-2 font-semibold">Nota N.º</th>
                  <th className="text-left p-2 font-semibold">Tipo</th>
                  <th className="text-left p-2 font-semibold">Asunto</th>
                  <th className="text-left p-2 font-semibold">Fecha</th>
                  <th className="text-left p-2 font-semibold">Estado</th>
                </tr></thead>
                <tbody>
                  {notas.length === 0 ? (
                    <tr><td colSpan={5} className="p-3 text-center text-slate-400 italic">Sin notas de bitácora vinculadas a esta estimación.</td></tr>
                  ) : notas.map((nt) => (
                    <tr key={nt.nota_id} className="border-t border-borde">
                      <td className="p-2 font-mono">{nt.numero ?? '—'}</td>
                      <td className="p-2">{nt.tipo || '—'}</td>
                      <td className="p-2">{nt.asunto || '—'}</td>
                      <td className="p-2">{fechaMX(nt.fecha)}</td>
                      <td className="p-2">{nt.estado || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              El reporte fotográfico se liga a cada generador por concepto (art. 132 fr. IV RLOPSRM). Las notas de
              bitácora respaldan la entrega de los trabajos de la estimación (art. 132 fr. II / art. 125 RLOPSRM).
            </p>
          </div>

          <p className="text-[11px] text-slate-400 border-t border-borde pt-2">
            Documento generado por SIGECOP · formato art. 132 RLOPSRM. Importes de obra sin IVA (art. 2 fr. XIX
            RLOPSRM); el neto a recibir incluye IVA. Carátula inmutable una vez integrada.
          </p>
        </div>
      </div>
    </div>
  );
}
