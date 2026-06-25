import { useEffect } from 'react';
import { ventanaPeriodo } from '../../services/reportesContrato.js';

// REPORTE 5 (HU-19) · REDISEÑO 24-jun (Maiki) — DOCUMENTO IMPRIMIBLE de la "Bitácora completa".
// Reemplaza el jsPDF crudo por el patrón window.print de la carátula. NO inventa nada: lee las notas reales
// (api.notasDeContrato → { notas, apertura_firmantes }). Cada nota se muestra en un bloque cronológico con
// N.º + tipo, fecha, emisor (rol + nombre), estado de firma y contenido. Las notas ANULADAS salen tachadas y
// enlazadas con su corrección (estado='anulada' + vinculada_a; art. 123 fr. VI RLOPSRM, append-only).

const dISO = (v) => (v == null ? '' : String(v).slice(0, 10));
const fechaHora = (s) => (s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : '—');
const ROL_LABEL = {
  residente: 'Residente', superintendente: 'Superintendente', supervision: 'Supervisión',
  contratista: 'Contratista', dependencia: 'Dependencia'
};
const enVentana = (iso, win) => !win || (dISO(iso) > win.desde && dISO(iso) <= win.hasta);
const aceptacionLabel = (a) => (a === 'firmada' ? 'Firmada' : a === 'pendiente' ? 'Pendiente de firma' : (a || '—'));

export default function DocumentoBitacora({ datos, contrato, periodo, onCerrar }) {
  useEffect(() => {
    document.body.classList.add('doc-nota-abierto');
    return () => document.body.classList.remove('doc-nota-abierto');
  }, []);

  const c = contrato || {};
  const paquete = datos?.notas || null;
  const aperturaFirmantes = Array.isArray(paquete?.apertura_firmantes) ? paquete.apertura_firmantes : [];
  const todas = (paquete?.notas || []).slice().sort((a, b) => dISO(a.fecha).localeCompare(dISO(b.fecha)));
  const win = ventanaPeriodo(todas.map((n) => n.fecha), periodo);
  const notas = todas.filter((n) => enVentana(n.fecha, win));

  // Mapa id → número (para enlazar la corrección "dice/debe decir" por vinculada_a).
  const numeroPorId = new Map(todas.map((n) => [n.id, n.numero]));
  // id de nota → número de la nota que la corrige (la que apunta a ella con vinculada_a).
  const corregidaPor = new Map();
  for (const n of todas) if (n.vinculada_a != null) corregidaPor.set(n.vinculada_a, n.numero);

  const printColor = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' };

  // Firmantes de una nota (apertura usa apertura_firmantes; el resto, emisor + firmas[]).
  const firmantesDe = (n) => {
    if (n.tipo === 'apertura' && aperturaFirmantes.length) {
      return aperturaFirmantes.map((f) => ({ nombre: f.nombre, rol: ROL_LABEL[f.rol_en_firma] || f.rol_en_firma || '—', firmado_en: f.firmado ? f.firmado_en : null }));
    }
    return [
      { nombre: n.emisor_nombre, rol: ROL_LABEL[n.rol_emisor] || 'Emisor', firmado_en: n.firmado_en, esEmisor: true },
      ...(n.firmas || []).map((f) => ({ nombre: f.nombre, rol: ROL_LABEL[f.rol_en_firma] || f.rol_en_firma || '—', firmado_en: f.firmado_en }))
    ];
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black bg-opacity-40 p-4 overflow-auto" data-testid="documento-bitacora">
      <div className="bg-white rounded-md shadow-lg max-w-3xl w-full my-6" data-print-area style={printColor}>
        {/* Barra de acciones (NO se imprime) */}
        <div className="px-6 py-3 border-b border-borde flex items-center justify-between" data-print-ocultar>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Reporte 5 · Bitácora completa</h3>
          <div className="flex gap-2">
            <button type="button" className="sg-btn-primary" onClick={() => window.print()} data-testid="btn-imprimir-bitacora">🖨 Imprimir / PDF</button>
            <button type="button" className="text-slate-500 hover:text-slate-800 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
          </div>
        </div>

        {/* Banda guinda */}
        <div className="bg-guinda text-white px-8 py-4" style={printColor}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-90">SIGECOP · Bitácora de obra (art. 123 LOPSRM / 122-125 RLOPSRM)</div>
              <div className="text-xl font-bold leading-tight">Bitácora completa</div>
            </div>
            <div className="text-right text-xs">
              <div className="uppercase tracking-wider opacity-90">Periodo</div>
              <div className="font-semibold text-sm">{periodo}</div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 text-sm text-tinta leading-relaxed space-y-4">
          {/* Datos del contrato */}
          <div className="text-xs text-slate-600 border-b border-borde pb-3">
            <span className="font-semibold">Contrato:</span> <span className="font-mono">{c.folio || '—'}</span>
            {c.contratista ? ` · ${c.contratista}` : ''}{c.objeto ? ` · ${c.objeto}` : ''}
            <span className="block text-slate-400">{notas.length} nota(s) en el periodo.</span>
          </div>

          {notas.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-6 text-center">Sin notas de bitácora para el periodo seleccionado.</p>
          ) : notas.map((n) => {
            const anulada = n.estado === 'anulada';
            const firmantes = firmantesDe(n);
            const corrigeNum = n.vinculada_a != null ? numeroPorId.get(n.vinculada_a) : null;
            const corregidaPorNum = corregidaPor.get(n.id);
            return (
              <div key={n.id} className={`border rounded-md p-4 ${anulada ? 'border-red-200 bg-red-50/40' : 'border-borde'}`} style={anulada ? printColor : undefined} data-testid={`nota-bloque-${n.numero}`}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className={`font-bold ${anulada ? 'line-through text-slate-500' : 'text-tinta'}`}>
                    Nota N.º {n.numero} · {n.tipo_etiqueta || n.tipo}
                    {anulada && <span className="ml-2 text-[10px] font-bold text-red-700 no-underline">ANULADA</span>}
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">{fechaHora(n.fecha)}</div>
                </div>

                <div className="text-xs text-slate-600 mb-2">
                  <span className="font-semibold">Emisor:</span> {n.emisor_nombre || '—'} ({ROL_LABEL[n.rol_emisor] || n.rol_emisor || '—'})
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="font-semibold">Firma:</span> {aceptacionLabel(n.aceptacion)}
                </div>

                {/* Vínculo de corrección (dice/debe decir) — append-only */}
                {corrigeNum != null && (
                  <div className="text-[11px] text-sigecop-blue mb-2">↳ Corrige la nota N.º {corrigeNum} (dice / debe decir).</div>
                )}
                {corregidaPorNum != null && (
                  <div className="text-[11px] text-red-700 mb-2">↳ Corregida por la nota N.º {corregidaPorNum}.</div>
                )}

                {n.asunto && <div className={`text-sm font-semibold mb-1 ${anulada ? 'line-through text-slate-500' : 'text-tinta'}`}>{n.asunto}</div>}
                <div className={`text-sm whitespace-pre-wrap leading-relaxed ${anulada ? 'line-through text-slate-400' : 'text-tinta'}`}>{n.contenido}</div>

                {/* Firmantes (compacto) */}
                <div className="mt-2 text-[11px] text-slate-500">
                  <span className="font-semibold">Firmas:</span>{' '}
                  {firmantes.length === 0 ? '—' : firmantes.map((f, i) => (
                    <span key={i}>
                      {i > 0 ? ' · ' : ''}{f.nombre || '—'} ({f.rol}){f.esEmisor ? ' [emisor]' : ''} — {f.firmado_en ? fechaHora(f.firmado_en) : 'Pendiente'}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          <p className="text-[11px] text-slate-400 border-t border-borde pt-2">
            Documento generado por SIGECOP a partir de las notas inmutables de la bitácora. Las notas no se editan ni se borran:
            una corrección es una nota NUEVA vinculada (dice / debe decir) y la original queda anulada en el histórico
            (art. 123 fr. VI RLOPSRM). El periodo "{periodo}" acota el rango de fechas sin alterar el contenido (CA-2, HU-19).
          </p>
        </div>
      </div>
    </div>
  );
}
