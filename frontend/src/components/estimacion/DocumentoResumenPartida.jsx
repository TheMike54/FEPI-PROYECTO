import { monedaMXN as moneda } from '../../utils/formato.js';
import { numeroALetras } from '../../utils/numeroALetras.js';

// DOCUMENTO "RESUMEN POR PARTIDA" (formato GACM, imagen 3.41.18 PM (2)) — H5 del plan de hallazgos.
// Agrupa los conceptos de la estimación por PARTIDA (prefijo de la clave, p.ej. AD.01.B → AD.01) y muestra:
//   · una fila por partida con su importe (Σ importe de sus conceptos) + SUBTOTAL,
//   · el bloque financiero del neto (importe estimación, IVA, amortización + su IVA, 5 al millar, total),
//   · DOS importes con letra (subtotal sin IVA/sin amortización · total neto a recibir),
//   · 4 firmas del ciclo (formuló / revisó / autorizó / Vo.Bo.).
// NO recalcula obra: deriva el IVA (16%) y el neto de los montos YA congelados de la estimación, con la MISMA
// aritmética que la carátula (cuadre EXACTO al centavo). Partida derivada del prefijo de clave (sin esquema
// nuevo; art. 45 ap. A fr. IX RLOPSRM para la clave). El importe con letra es conversión determinista del monto.

const IVA = 0.16;
const r2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

// Partida = primeros dos segmentos de la clave (AD.01.B → AD.01). Sin puntos, la clave completa.
export function partidaDeClave(clave) {
  const s = String(clave || '').trim();
  if (!s) return '—';
  const p = s.split('.');
  return p.length >= 2 ? `${p[0]}.${p[1]}` : s;
}

export default function DocumentoResumenPartida({ estimacion, contrato, clavesPorConcepto = {} }) {
  const e = estimacion || {};
  const c = contrato || {};
  const generadores = Array.isArray(e.generadores) ? e.generadores : [];
  const meta = clavesPorConcepto || {};
  const claveDe = (g) => (meta[g.contrato_concepto_id]?.clave) || g.clave || '—';

  // ── Agrupación por partida (orden por código de partida) ──
  const mapa = new Map();
  for (const g of generadores) {
    const part = partidaDeClave(claveDe(g));
    const prev = mapa.get(part) || { partida: part, importe: 0, conceptos: [] };
    prev.importe = r2(prev.importe + Number(g.importe || 0));
    prev.conceptos.push(g.concepto);
    mapa.set(part, prev);
  }
  const partidas = [...mapa.values()].sort((a, b) => a.partida.localeCompare(b.partida, 'es'));
  const descDe = (row) => (row.conceptos.length === 1 ? row.conceptos[0] : `${row.conceptos.length} conceptos`);

  // ── Bloque financiero (idéntico a la carátula Sección 3) ──
  const subtotal = Number(e.subtotal || 0);
  const amort = Number(e.amortizacion || 0);
  const ret5 = Number(e.retencion || 0);          // 5 al millar (art. 191 LFD / 0.5% SFP)
  const deduc = Number(e.deductivas || 0);
  const netoSinIva = Number(e.neto || 0);
  const retAtraso = r2(subtotal - amort - ret5 - deduc - netoSinIva); // residual (art. 46 Bis)
  const ivaEst = r2(subtotal * IVA);
  const totalEst = r2(subtotal + ivaEst);
  const ivaAmort = r2(amort * IVA);
  const totalAmort = r2(amort + ivaAmort);
  const netoARecibir = r2(totalEst - totalAmort - ret5 - retAtraso - deduc);
  const subtotalPartidas = r2(partidas.reduce((s, p) => s + p.importe, 0));

  const printColor = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' };
  const saltoPagina = { ...printColor, breakBefore: 'page' };

  const FilaFin = ({ etiqueta, valor, fuerte, signo }) => (
    <tr className={`border-t border-borde ${fuerte ? 'font-semibold' : ''}`}>
      <td className="px-3 py-1.5">{etiqueta}</td>
      <td className="px-3 py-1.5 text-right font-mono">{valor == null ? '' : `${signo || ''}${moneda(valor)}`}</td>
    </tr>
  );

  return (
    <div style={saltoPagina} data-testid="documento-resumen-partida">
      <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">Bloque 5 · Resumen por partida (art. 132 RLOPSRM)</div>

      {/* Encabezado institucional + datos del contrato/estimación */}
      <div className="border border-borde rounded-md overflow-hidden mb-3">
        <div className="bg-guinda text-white px-4 py-2 flex items-center justify-between" style={printColor}>
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-90">{c.dependencia || 'Dependencia'}</div>
            <div className="text-sm font-bold">Resumen por partida</div>
          </div>
          <div className="text-right text-[11px]">
            <div>Estimación N.º {e.numero ?? '—'}</div>
          </div>
        </div>
        <table className="w-full text-[11px]">
          <tbody>
            <tr className="border-b border-borde"><td className="px-3 py-1 bg-pagina font-semibold text-slate-600 w-40">Contratista</td><td className="px-3 py-1">{c.contratista || '—'}</td><td className="px-3 py-1 bg-pagina font-semibold text-slate-600 w-40">Contrato</td><td className="px-3 py-1 font-mono">{c.folio || '—'}</td></tr>
            <tr><td className="px-3 py-1 bg-pagina font-semibold text-slate-600">Obra / servicio</td><td className="px-3 py-1" colSpan={3}>{c.objeto || '—'}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Partidas + SUBTOTAL */}
      <div className="overflow-x-auto border border-borde rounded-md">
        <table className="w-full text-[11px]" data-testid="resumen-partida-tabla">
          <thead className="bg-pagina text-slate-700"><tr>
            <th className="text-left px-3 py-2 font-semibold w-28">Núm. de partida</th>
            <th className="text-left px-3 py-2 font-semibold">Descripción</th>
            <th className="text-right px-3 py-2 font-semibold w-40">Importe</th>
          </tr></thead>
          <tbody>
            {partidas.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-3 text-center text-slate-400 italic">Sin conceptos para agrupar.</td></tr>
            ) : partidas.map((p) => (
              <tr key={p.partida} className="border-t border-borde" data-testid={`resumen-partida-${p.partida}`}>
                <td className="px-3 py-1.5 font-mono">{p.partida}</td>
                <td className="px-3 py-1.5">{descDe(p)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{moneda(p.importe)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-guinda bg-guinda-soft font-bold" style={printColor}>
              <td className="px-3 py-2 text-guinda" colSpan={2}>Subtotal (sin IVA)</td>
              <td className="px-3 py-2 text-right font-mono text-guinda" data-testid="resumen-partida-subtotal">{moneda(subtotalPartidas)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bloque financiero del neto */}
      <div className="mt-3 md:w-2/3 md:ml-auto overflow-x-auto border border-borde rounded-md">
        <table className="w-full text-[11px]" data-testid="resumen-partida-financiera">
          <tbody>
            <FilaFin etiqueta="Importe estimación" valor={subtotal} fuerte />
            <FilaFin etiqueta="(+) I.V.A. estimación (16%)" valor={ivaEst} />
            <FilaFin etiqueta="(=) Total estimación" valor={totalEst} fuerte />
            <FilaFin etiqueta={`(−) Amortización anticipo (${Number(e.anticipo_pct_snapshot || 0)}%)`} valor={amort} signo="−" />
            <FilaFin etiqueta="(−) I.V.A. amortización anticipo (16%)" valor={ivaAmort} signo="−" />
            <FilaFin etiqueta="(=) Total amortización" valor={totalAmort} fuerte signo="−" />
            <FilaFin etiqueta="(−) Retenciones (atraso, art. 46 Bis)" valor={retAtraso > 0 ? retAtraso : null} signo="−" />
            <FilaFin etiqueta="(−) Trabajos no ejecutados / deductivas" valor={deduc > 0 ? deduc : null} signo="−" />
            <FilaFin etiqueta="(−) 5 al millar SFP (art. 191 LFD)" valor={ret5} signo="−" />
            <tr className="bg-guinda-soft font-bold" style={printColor}>
              <td className="px-3 py-2 text-guinda text-sm">Total a recibir (incluye IVA)</td>
              <td className="px-3 py-2 text-right font-mono text-guinda text-sm" data-testid="resumen-partida-total">{moneda(netoARecibir)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Importes con letra (dos variantes, como la imagen) */}
      <div className="grid md:grid-cols-2 gap-3 mt-3 text-[11px]">
        <div className="border border-borde rounded-md px-3 py-2 bg-pagina">
          <div className="font-semibold text-slate-700" data-testid="resumen-partida-letra-subtotal">({numeroALetras(subtotal)})</div>
          <div className="text-slate-500 mt-0.5">Importa la presente estimación, la cantidad de (sin IVA y sin amortización de anticipo).</div>
        </div>
        <div className="border border-borde rounded-md px-3 py-2 bg-pagina">
          <div className="font-semibold text-slate-700" data-testid="resumen-partida-letra-total">({numeroALetras(netoARecibir)})</div>
          <div className="text-slate-500 mt-0.5">Total con letra (con amortización, IVA y retención del 0.5% de la SFP).</div>
        </div>
      </div>

      {/* 4 firmas del ciclo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs mt-4" style={{ breakInside: 'avoid' }}>
        {[
          { rol: 'Formuló', sub: 'Contratista · superintendente', nombre: c.superintendente_nombre || c.contratista },
          { rol: 'Revisó', sub: 'Supervisión externa', nombre: c.supervision_nombre },
          { rol: 'Autorizó', sub: 'Residencia de obra', nombre: c.residente_nombre },
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
  );
}
