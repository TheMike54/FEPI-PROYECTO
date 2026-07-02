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
  onConceptoField, onAddConcepto, onRemoveConcepto, onCelda, onAmpliar, onAjuste,
  resumen, montoNuevo, cuadra, permiteAjuste = false,
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
        <p className="text-xs text-slate-600 mb-3" data-testid="cm-catalogo-ayuda">
          El <strong>monto se DERIVA</strong> = Σ ROUND(cantidad × P.U., 2), al centavo (art. 45 fr. IX RLOPSRM).
          {permiteAjuste ? (
            <> Con la <strong>cajita de Ajuste (+/−)</strong> amplías o reduces la CANTIDAD de un concepto
              existente; la <em>Cant. original</em> queda congelada y la <em>Cant. final</em> = original + ajuste.
              El <strong>P.U. y la clave NO cambian</strong> (art. 59 LOPSRM). El delta afecta SOLO trabajo
              FUTURO (regla de oro). <strong>No se agregan conceptos nuevos.</strong></>
          ) : (
            <> Este tipo de convenio deja el <strong>catálogo CONGELADO</strong>: las cantidades NO se
              modifican, solo se <strong>reacomoda el calendario</strong> (usa un convenio de Monto o Mixto
              para cambiar cantidades).</>
          )}
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
                      {permiteAjuste && !esAmpl ? (
                        // CAJITA (monto/mixto): Cant. original CONGELADA · Ajuste (+/−) editable · Cant. final calculada.
                        // El delta lo reparte el usuario en periodos FUTUROS (regla de oro; el backend lo revalida).
                        (() => {
                          const orig = round3(Number(c.cantidadOriginal ?? c.cantidad) || 0);
                          const final = round3(Number(c.cantidad) || 0);
                          const ajusteNum = round3(final - orig);
                          return (
                            <div className="space-y-1 min-w-[7rem]">
                              <div className="flex items-center justify-between gap-1 text-[11px]">
                                <span className="text-slate-400">orig.</span>
                                <span className="font-mono text-slate-500 bg-slate-100 border border-borde rounded px-1.5 py-0.5" title="Cantidad original CONGELADA (no editable)" data-testid={`cm-cant-original-${i}`}>{orig}</span>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] text-guinda font-semibold">±</span>
                                <input
                                  type="number" step="0.001"
                                  className="sg-input text-right w-24"
                                  placeholder="0"
                                  value={c.ajuste ?? ''}
                                  onChange={(e) => onAjuste(i, e.target.value)}
                                  disabled={soloLectura}
                                  title="Ajuste (+/−) a la cantidad. El delta solo puede ejecutarse en periodos FUTUROS (protege lo ya ejecutado/estimado, art. 59 LOPSRM)."
                                  data-testid={`cm-concepto-ajuste-${i}`}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1 text-xs border-t border-borde pt-1">
                                <span className="text-slate-500">final</span>
                                <span className={`font-mono font-bold ${Math.abs(ajusteNum) > 1e-6 ? 'text-guinda' : 'text-sigecop-blue'}`} data-testid={`cm-cant-final-${i}`}>{final}</span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        // Catálogo CONGELADO (programa/plazo) o fila de ampliación: cantidad en SOLO LECTURA.
                        <input type="number" className="sg-input text-right bg-slate-100 text-slate-600" value={c.cantidad} readOnly disabled title={permiteAjuste ? 'Ampliación: cantidad heredada' : 'Catálogo CONGELADO: este convenio no cambia cantidades, solo reacomoda el calendario (art. 59 LOPSRM).'} data-testid={`cm-concepto-cantidad-${i}`} />
                      )}
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
                      {/* BUG #11 (Oleada 3): se RETIRARON «+ Ampliar» y «✕ quitar»: por convenio no se agregan
                          ni quitan conceptos; solo se AJUSTA la cantidad de los existentes (o el plazo). */}
                      <span className="text-[11px] text-slate-400">—</span>
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
        {/* BUG #11 (Oleada 3): se RETIRÓ «+ Agregar concepto adicional (nuevo)». Un convenio no introduce
            conceptos fuera del catálogo (art. 59 LOPSRM): solo ajusta la cantidad de los existentes o el plazo. */}
      </div>

      {/* --- Matriz editable concepto × periodo (cuadre 100% por concepto) --- */}
      <div>
        <h3 className="text-base font-bold text-sigecop-blue mb-1">Programa de obra (catálogo × periodos)</h3>
        <p className="text-xs text-slate-600 mb-3">
          Reparte cada concepto en los periodos del contrato. La suma por concepto debe
          <strong> cuadrar al 100%</strong> de lo contratado (restante = 0); el backend lo revalida en SQL.
          <br />
          <span className="inline-flex items-center gap-1"><span>🔒</span> Los periodos <strong>ACTUAL y PASADOS</strong> están congelados (intocables); solo el <strong>FUTURO</strong> se reacomoda —
          protege lo ya ejecutado/estimado.</span>
          <span className="ml-2 text-emerald-700">Las columnas <strong>NUEVO</strong> aparecen cuando el convenio amplía el plazo (periodos añadidos al final).</span>
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
                    <th key={p.numero} className={`text-right px-2 py-2 w-24 ${!p.esFuturo ? 'bg-slate-200/70' : p.esNuevo ? 'bg-emerald-50' : ''}`} title={`${fechaCorta(p.inicio)} – ${fechaCorta(p.fin)}${!p.esFuturo ? ' · periodo ACTUAL/PASADO (intocable)' : p.esNuevo ? ' · periodo NUEVO (por ampliación de plazo)' : ' · periodo FUTURO (editable)'}`}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        {!p.esFuturo && <span title="Periodo ACTUAL o PASADO: intocable">🔒</span>}
                        P{p.numero}
                      </span>
                      <div className="text-[10px] font-normal text-sigecop-accent">{fechaCorta(p.inicio)}</div>
                      {p.esNuevo && <div className="text-[9px] font-bold text-emerald-700" data-testid={`cm-periodo-nuevo-${p.numero}`}>NUEVO</div>}
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
                      {periodos.map((p) => {
                        // REGLA DE ORO: los periodos ACTUAL/PASADOS son intocables (protegen lo ya
                        // ejecutado/estimado); solo el FUTURO se reacomoda. El backend lo revalida (409).
                        const congelado = soloLectura || !p.esFuturo;
                        return (
                          <td key={p.numero} className={`px-1 py-1 ${!p.esFuturo ? 'bg-slate-100' : p.esNuevo ? 'bg-emerald-50/50' : ''}`}>
                            <input
                              type="number" min="0" step="0.001"
                              className={`sg-input text-right text-xs w-20 ${!p.esFuturo ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : ''}`}
                              value={celdas[`${c.rid}:${p.numero}`] || ''}
                              onChange={(e) => onCelda(c.rid, p.numero, e.target.value)}
                              disabled={congelado}
                              title={!p.esFuturo
                                ? `Periodo ${p.numero} ACTUAL o PASADO: intocable. Solo se reacomoda el trabajo de periodos FUTUROS (protege lo ya ejecutado/estimado).`
                                : 'Reparte la cantidad del concepto en los periodos FUTUROS; la suma por concepto debe cuadrar al 100%.'}
                              data-testid={`cm-celda-${i}-${p.numero}`}
                            />
                          </td>
                        );
                      })}
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
