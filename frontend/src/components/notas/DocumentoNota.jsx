import { useEffect } from 'react';

// O8 (b) — VISTA "DOCUMENTO" de una nota de bitácora: plantilla imprimible (membrete + encabezado con
// contrato/folio/fecha-hora + cuerpo + firmantes con rol y hora de firma). Patrón de impresión de O9
// (window.print + @media print). Sirve también como el "PDF" de la nota que se adjunta a la estimación
// (O8 a). Solo LECTURA: la nota es INMUTABLE (no se edita aquí). Recibe la nota (con sus firmas embebidas,
// tal como las devuelve el backend en notasDeContrato) y el contrato (folio/objeto) para el membrete.

const folioFmt = (n) => (n == null ? '—' : 'BIT-' + String(n).padStart(4, '0'));
const ROL_LABEL = {
  residente: 'Residente', superintendente: 'Superintendente', supervision: 'Supervisión',
  contratista: 'Contratista', dependencia: 'Dependencia'
};
const fechaHora = (s) => (s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : '—');

export default function DocumentoNota({ nota, contrato, aperturaFirmantes, onCerrar }) {
  // Alcance de impresión: al montar marca el <body> para que el @media print (styles/index.css) imprima
  // SOLO este documento (truco de visibility). Se limpia al desmontar → no afecta otras impresiones (p.ej.
  // el expediente de O9).
  useEffect(() => {
    document.body.classList.add('doc-nota-abierto');
    return () => document.body.classList.remove('doc-nota-abierto');
  }, []);

  if (!nota) return null;

  // Firmantes. Para una nota NORMAL: emisor (firmó al emitir, art. 125 un emisor por nota) + contraparte
  // que aceptó/firmó (bitacora_nota_firmas, append-only). Para la APERTURA (nota #1) la firma es CONJUNTA
  // y vive en bitacora_firmantes (NO en firmado_en/firmas de la nota, que nacen NULL/vacío por diseño):
  // se toma de aperturaFirmantes para que el documento muestre las firmas reales por rol y NO salga todo
  // "Pendiente" (P2 de la revisión 14-jun; art. 123 fr. III RLOPSRM).
  const esApertura = nota.tipo === 'apertura';
  const firmantes = (esApertura && Array.isArray(aperturaFirmantes) && aperturaFirmantes.length)
    ? aperturaFirmantes.map((f) => ({
        nombre: f.nombre, rol: ROL_LABEL[f.rol_en_firma] || f.rol_en_firma || '—',
        firmado_en: f.firmado ? f.firmado_en : null, esEmisor: false
      }))
    : [
        { nombre: nota.emisor_nombre, rol: ROL_LABEL[nota.rol_emisor] || 'Emisor', firmado_en: nota.firmado_en, esEmisor: true },
        ...(nota.firmas || []).map((f) => ({
          nombre: f.nombre, rol: ROL_LABEL[f.rol_en_firma] || f.rol_en_firma || '—', firmado_en: f.firmado_en, esEmisor: false
        }))
      ];

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black bg-opacity-40 p-4 overflow-auto" data-testid="documento-nota">
      <div className="bg-white rounded-md shadow-lg max-w-3xl w-full my-6" data-print-area>
        {/* Barra de acciones (NO se imprime) */}
        <div className="px-6 py-3 border-b border-borde flex items-center justify-between" data-print-ocultar>
          <h3 className="text-sm font-bold uppercase tracking-wider text-tinta-sec">Documento de la nota</h3>
          <div className="flex items-center gap-3">
            <button type="button" className="sg-btn-primary" onClick={() => window.print()} data-testid="btn-imprimir-nota">
              🖨 Imprimir documento
            </button>
            <button type="button" className="text-slate-400 hover:text-slate-700 text-2xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Membrete */}
          <div className="border-b-2 border-guinda pb-3 mb-4">
            <div className="text-base font-bold text-guinda">SIGECOP — Sistema de Gestión de Contratos de Obra Pública</div>
            <div className="text-xs text-tinta-sec">Bitácora de obra · art. 123 LOPSRM / arts. 122-125 RLOPSRM</div>
          </div>

          {/* Encabezado: contrato + nota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Contrato</div>
              <div className="font-semibold text-tinta" data-testid="doc-contrato">{contrato?.folio || '—'}</div>
              <div className="text-xs text-tinta-sec">{contrato?.objeto || ''}</div>
              {contrato?.dependencia && <div className="text-xs text-tinta-sec">Dependencia: {contrato.dependencia}</div>}
              {contrato?.contratista && <div className="text-xs text-tinta-sec">Contratista: {contrato.contratista}</div>}
            </div>
            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-wider text-slate-500">Nota de bitácora</div>
              <div className="font-mono font-semibold text-tinta" data-testid="doc-folio">{folioFmt(nota.numero)}</div>
              <div className="text-xs text-tinta-sec">{nota.tipo_etiqueta || nota.tipo}</div>
              <div className="text-xs text-tinta-sec" data-testid="doc-fecha">{fechaHora(nota.fecha)}</div>
              {nota.estado === 'anulada' && <div className="text-xs font-bold text-red-700">ANULADA</div>}
            </div>
          </div>

          {/* Cuerpo */}
          {nota.asunto && <div className="text-sm font-bold text-tinta mb-1">{nota.asunto}</div>}
          <div className="text-sm text-tinta whitespace-pre-wrap leading-relaxed mb-6 border border-borde rounded-md p-4 bg-pagina">
            {nota.contenido}
          </div>

          {/* Firmantes */}
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Firmantes</div>
          <table className="w-full text-sm border border-borde rounded-md overflow-hidden" data-testid="doc-firmantes">
            <thead className="bg-pagina text-tinta-sec">
              <tr>
                <th className="text-left p-2 font-semibold">Nombre</th>
                <th className="text-left p-2 font-semibold">Rol</th>
                <th className="text-left p-2 font-semibold">Firma (fecha y hora)</th>
              </tr>
            </thead>
            <tbody>
              {firmantes.map((f, i) => (
                <tr key={i} className="border-t border-borde">
                  <td className="p-2 text-tinta">{f.nombre || '—'} {f.esEmisor && <span className="text-[10px] text-guinda font-bold">(emisor)</span>}</td>
                  <td className="p-2 text-tinta-sec">{f.rol}</td>
                  <td className="p-2 text-tinta-sec">{f.firmado_en ? fechaHora(f.firmado_en) : 'Pendiente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-3">
            Documento generado por SIGECOP a partir de la nota inmutable de bitácora. Las firmas son append-only (art. 123 fr. III RLOPSRM).
          </p>
        </div>
      </div>
    </div>
  );
}
