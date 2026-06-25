// HU-03 Fase 2 — Editor de catálogo + matriz para convenios de monto/programa/mixto.
// Espeja el capturador del ALTA (TabCatalogo + TabProgramaMatriz): el monto se DERIVA
// (Σ ROUND(cant×pu,2), art. 45 fr. IX RLOPSRM) y el programa debe CUADRAR al 100% por
// concepto (Σ celdas = contratado; RLOPSRM art. 45-A-X + LOPSRM art. 52). El backend es la
// fuente de la verdad: revalida cuadre + la regla de NO reducir por debajo de lo ya estimado (criterio de
// diseño del equipo, sin cita legal directa) + guardrail de variación; aquí solo se guía la captura.
//
// Reglas del catálogo NUEVO (las exige el backend, crearConvenio):
//   · debe incluir TODOS los conceptos existentes (no se pueden borrar) → fila existente sin "✕"
//     y con la clave en solo-lectura (el backend casa por clave);
//   · se pueden AGREGAR conceptos nuevos (clave libre, borrables antes de guardar);
//   · los periodos son los VIGENTES del contrato (no se regeneran en Etapa 1).
//
// B4 (24-jun, Variante B + Opción 1) — AMPLIAR un concepto existente: agregar MÁS cantidad del MISMO
// concepto. Se modela como una fila ADICIONAL con clave derivada (CONC-01-A) que HEREDA el P.U. del
// original (art. 59 LOPSRM: las cantidades adicionales se pagan al P.U. pactado). El original queda
// CONGELADO y visible; la ampliación tiene P.U. bloqueado (candado) y muestra el TOTAL del concepto.
// El panel "Ampliar" vive en la página (ConveniosModificatorios); aquí solo se pinta la fila resultante
// (no editable salvo quitarla) y el botón que dispara el panel.
//
// Componente PRESENTACIONAL: el estado (conceptos/celdas) y las derivaciones (resumen/monto/
// cuadre) viven en la página (ConveniosModificatorios), que también las usa para el gating y el
// payload. Aquí solo se pinta y se emiten cambios por callbacks.

import { fmtMXN } from '../../utils/formato.js';

const TOL = 0.0005; // espejo de TOL_PROGRAMA del alta/backend (media milésima)
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const round3 = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
const fechaCorta = (iso) => {
  const p = String(iso || '').slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : '';
};

export default function EditorProgramaConvenio({
  conceptos, periodos, celdas, soloLectura,
  onConceptoField, onAddConcepto, onRemoveConcepto, onCelda, onAmpliar,
  resumen, montoNuevo, cuadra,
}) {
  const hayPeriodos = periodos.length > 0;

  // B4 — total de ampliaciones por clave de original (para mostrar el TOTAL del concepto en su renglón).
  const amplPorClave = {};
  for (const c of conceptos) if (c.amplia_a) amplPorClave[c.amplia_a] = (amplPorClave[c.amplia_a] || 0) + (Number(c.cantidad) || 0);

  return (
    <div className="space-y-6" data-testid="editor-programa-convenio">
      {/* --- Catálogo editable (monto derivado al centavo) --- */}
      <div>
        <h3 className="text-base font-bold text-sigecop-blue mb-1">Catálogo de conceptos (nuevo)</h3>
        <p className="text-xs text-slate-600 mb-3">
          El <strong>monto se DERIVA</strong> = Σ ROUND(cantidad × P.U., 2), al centavo (art. 45 fr. IX RLOPSRM).
          Los conceptos <strong>originales se CONGELAN</strong>; para más volumen del mismo concepto usa
          <strong> «Ampliar»</strong> (hereda el P.U., art. 59 LOPSRM), o agrega conceptos <strong>ADICIONALES</strong> nuevos.
        </p>
        <div className="overflow-x-auto border border-borde rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-sigecop-blue-light text-sigecop-blue">
              <tr>
                <th className="text-left px-3 py-2 w-28">Clave</th>
                <th className="text-left px-3 py-2">Concepto</th>
                <th className="text-left px-3 py-2 w-24">Unidad</th>
                <th className="text-right px-3 py-2 w-28">Cantidad</th>
                <th className="text-right px-3 py-2 w-32">P.U.</th>
                <th className="text-right px-3 py-2 w-36">Importe</th>
                <th className="w-28 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {conceptos.map((c, i) => {
                const importe = round2((Number(c.cantidad) || 0) * (Number(c.pu) || 0));
                const esAmpl = !!c.amplia_a;                 // fila de ampliación (Opción 1)
                const bloqueado = soloLectura || c.existente || esAmpl; // congelado: original o ampliación
                const totalConcepto = c.existente && amplPorClave[c.clave]
                  ? round3((Number(c.cantidad) || 0) + amplPorClave[c.clave]) : null;
                return (
                  <tr key={c.rid} className={`border-t border-borde ${esAmpl ? 'bg-guinda-soft/60' : ''}`} data-testid={`cm-fila-${i}`}>
                    <td className="px-2 py-1 align-top">
                      <input
                        className="sg-input font-mono text-xs"
                        maxLength={40}
                        placeholder="p.ej. AD.02"
                        value={c.clave || ''}
                        onChange={(e) => onConceptoField(i, 'clave', e.target.value)}
                        disabled={bloqueado}
                        title={c.existente ? 'Concepto existente: la clave no se cambia (el backend casa por clave)' : esAmpl ? 'Ampliación: clave derivada del original' : undefined}
                        data-testid={`cm-concepto-clave-${i}`}
                      />
                    </td>
                    <td className="px-2 py-1 align-top">
                      <input className="sg-input" value={c.concepto || ''} onChange={(e) => onConceptoField(i, 'concepto', e.target.value)} disabled={bloqueado} title={c.existente ? 'Concepto existente: su descripción no se altera por convenio' : undefined} data-testid={`cm-concepto-nombre-${i}`} />
                      {esAmpl && (
                        <div className="mt-1 text-[11px] text-guinda font-semibold" data-testid={`cm-ampl-chip-${i}`}>↳ Ampliación de {c.amplia_a}</div>
                      )}
                      {totalConcepto != null && (
                        <div className="mt-1 text-[11px] text-sigecop-blue" data-testid={`cm-total-concepto-${i}`}>Total del concepto: <span className="font-mono font-semibold">{totalConcepto}</span> ({c.cantidad} + {amplPorClave[c.clave]} ampliación)</div>
                      )}
                    </td>
                    <td className="px-2 py-1 align-top">
                      <input className="sg-input" maxLength={20} value={c.unidad || ''} onChange={(e) => onConceptoField(i, 'unidad', e.target.value)} disabled={bloqueado} data-testid={`cm-concepto-unidad-${i}`} />
                    </td>
                    <td className="px-2 py-1 align-top">
                      {/* FIX 22-jun (profe): los conceptos ORIGINALES se CONGELAN; el extra va por «Ampliar» (B4) o como adicional. */}
                      <input type="number" min="0" step="0.001" className="sg-input text-right" value={c.cantidad} onChange={(e) => onConceptoField(i, 'cantidad', e.target.value)} disabled={bloqueado} title={c.existente ? 'Concepto original CONGELADO: usa «Ampliar» para más cantidad' : esAmpl ? 'Cantidad de la ampliación (definida en el panel «Ampliar»)' : undefined} data-testid={`cm-concepto-cantidad-${i}`} />
                    </td>
                    <td className="px-2 py-1 align-top">
                      <div className="flex items-center justify-end gap-1">
                        {esAmpl && <span className="text-slate-400" title="P.U. heredado del original (art. 59 LOPSRM)">🔒</span>}
                        <input type="number" min="0" step="0.0001" className="sg-input text-right" value={c.pu} onChange={(e) => onConceptoField(i, 'pu', e.target.value)} disabled={bloqueado} title={c.existente ? 'Concepto original CONGELADO: no se modifica por convenio' : esAmpl ? 'P.U. heredado del original (art. 59 LOPSRM): no se teclea' : undefined} data-testid={`cm-concepto-pu-${i}`} />
                      </div>
                      {esAmpl && (
                        <div className="mt-1 text-right"><span className="text-[10px] font-bold bg-sigecop-blue-light text-sigecop-blue border border-sigecop-blue/20 rounded px-1.5 py-0.5">P.U. heredado · art. 59 LOPSRM</span></div>
                      )}
                    </td>
                    <td className="px-2 py-1 align-top text-right font-semibold text-slate-700" data-testid={`cm-concepto-importe-${i}`}>{fmtMXN.format(importe)}</td>
                    <td className="px-2 py-1 text-center align-top whitespace-nowrap">
                      {/* B4: «Ampliar» en los originales; ✕ en los conceptos nuevos (adicionales y ampliaciones). */}
                      {c.existente && !soloLectura && hayPeriodos && (
                        <button type="button" onClick={() => onAmpliar(c.rid)} className="text-xs font-semibold text-guinda hover:underline" title="Agregar más cantidad de este concepto (art. 59 LOPSRM)" data-testid={`cm-ampliar-${i}`}>+ Ampliar</button>
                      )}
                      {!c.existente && (
                        <button type="button" onClick={() => onRemoveConcepto(i)} disabled={soloLectura} className="text-red-500 hover:text-red-700 disabled:opacity-30" title={esAmpl ? 'Quitar ampliación' : 'Quitar concepto nuevo'} data-testid={`cm-concepto-quitar-${i}`}>✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {conceptos.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">Sin conceptos.</td></tr>
              )}
            </tbody>
            {conceptos.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-borde-fuerte bg-pagina">
                  <td colSpan={5} className="px-3 py-2 text-right font-semibold text-slate-700">Monto nuevo (Σ importes)</td>
                  <td className="px-3 py-2 text-right font-bold text-sigecop-blue whitespace-nowrap" data-testid="cm-monto-nuevo">{fmtMXN.format(Number(montoNuevo) || 0)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!soloLectura && (
          <button type="button" onClick={onAddConcepto} className="mt-3 text-sm text-sigecop-accent hover:underline" data-testid="cm-agregar-concepto">
            + Agregar concepto adicional (nuevo)
          </button>
        )}
      </div>

      {/* --- Matriz editable concepto × periodo (cuadre 100% por concepto) --- */}
      <div>
        <h3 className="text-base font-bold text-sigecop-blue mb-1">Programa de obra (catálogo × periodos)</h3>
        <p className="text-xs text-slate-600 mb-3">
          Reparte cada concepto en los periodos vigentes del contrato. La suma por concepto debe
          <strong> cuadrar al 100%</strong> de lo contratado (restante = 0); el backend lo revalida en SQL.
        </p>

        {!hayPeriodos ? (
          <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 rounded-r-md" data-testid="cm-sin-periodos">
            Este contrato no tiene periodos en su programa de obra; primero captura el programa de obra para poder distribuir el convenio por periodo.
          </div>
        ) : (
          <div className="overflow-x-auto border border-borde rounded-md">
            <table className="text-sm">
              <thead className="bg-sigecop-blue-light text-sigecop-blue">
                <tr>
                  <th className="text-left px-3 py-2 sticky left-0 bg-sigecop-blue-light w-28">Clave</th>
                  <th className="text-left px-3 py-2 w-48">Concepto</th>
                  {periodos.map((p) => (
                    <th key={p.numero} className="text-right px-2 py-2 w-24" title={`${fechaCorta(p.inicio)} – ${fechaCorta(p.fin)}`}>
                      P{p.numero}
                      <div className="text-[10px] font-normal text-sigecop-accent">{fechaCorta(p.inicio)}</div>
                    </th>
                  ))}
                  <th className="text-right px-2 py-2 w-24">Σ planeado</th>
                  <th className="text-right px-2 py-2 w-24">Contratado</th>
                  <th className="text-right px-2 py-2 w-24">Restante</th>
                </tr>
              </thead>
              <tbody>
                {conceptos.map((c, i) => {
                  const r = resumen[i] || { planeado: 0, contratado: 0, restante: 0 };
                  const ok = Math.abs(r.restante) <= TOL;
                  const esAmpl = !!c.amplia_a;
                  const bloqueado = soloLectura || c.existente || esAmpl;
                  const restCls = ok ? 'text-green-700 font-semibold' : r.restante < 0 ? 'text-red-700 font-bold' : 'text-amber-700';
                  return (
                    <tr key={c.rid} className={`border-t border-borde ${esAmpl ? 'bg-guinda-soft/60' : ''} ${!ok ? (r.restante < 0 ? 'bg-red-50' : 'bg-amber-50') : ''}`}>
                      <td className="px-3 py-1 font-mono text-xs sticky left-0 bg-white">{c.clave || '—'}</td>
                      <td className="px-3 py-1 truncate max-w-[12rem]" title={c.concepto}>{c.concepto || '—'}{esAmpl && <span className="ml-1 text-[10px] text-guinda">(ampl.)</span>}</td>
                      {periodos.map((p) => (
                        <td key={p.numero} className="px-1 py-1">
                          <input
                            type="number" min="0" step="0.001"
                            className="sg-input text-right text-xs w-20"
                            value={celdas[`${c.rid}:${p.numero}`] || ''}
                            onChange={(e) => onCelda(c.rid, p.numero, e.target.value)}
                            disabled={bloqueado}
                            title={c.existente ? 'Programa del concepto original CONGELADO' : esAmpl ? 'Programa de la ampliación (definido en el panel «Ampliar»)' : undefined}
                            data-testid={`cm-celda-${i}-${p.numero}`}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-semibold" data-testid={`cm-planeado-${i}`}>{r.planeado}</td>
                      <td className="px-2 py-1 text-right text-slate-600">{r.contratado}</td>
                      <td className={`px-2 py-1 text-right ${restCls}`} data-testid={`cm-restante-${i}`}>{r.restante}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hayPeriodos && conceptos.length > 0 && (
          cuadra ? (
            <div className="mt-3 px-3 py-2 rounded border text-sm font-medium text-green-700 bg-green-50 border-green-300" data-testid="cm-programa-cuadra">
              ✓ El programa cuadra al 100%: cada concepto suma exactamente lo contratado.
            </div>
          ) : (
            <div className="mt-3 px-3 py-2 rounded border text-sm font-medium text-red-700 bg-red-50 border-red-300" data-testid="cm-programa-descuadre">
              El programa <strong>no cuadra al 100%</strong>: hay conceptos con restante ≠ 0. Ajusta hasta que cada concepto sume exactamente lo contratado.
            </div>
          )
        )}
      </div>
    </div>
  );
}
