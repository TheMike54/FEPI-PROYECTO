import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import { redimensionarImagen } from '../utils/imagen.js';

// EVIDENCIA FOTOGRÁFICA de UNA estimación (art. 132 fr. IV RLOPSRM). Galería + (si !soloLectura) subida.
// Las fotos se guardan como BYTEA; aquí se descargan como blob URL para el <img> (la descarga lleva el
// header Authorization, que un <img src> normal no podría enviar).
//
// FIX 22-jun (profe): "en las estimaciones debe existir evidencia fotográfica de CADA UNO de los generadores".
// Modo `porGenerador`: además de la galería general, se muestra un renglón por GENERADOR (concepto) de la
// estimación con su propio botón de subir foto (pasa `contrato_concepto_id` por renglón, ya soportado por el
// backend) y SU galería filtrada por concepto. Sin `porGenerador` el componente se comporta como antes
// (galería plana) — retrocompatible.
export default function FotosEstimacion({ estimacionId, soloLectura = false, porGenerador = false }) {
  const [fotos, setFotos] = useState([]);          // metadatos (incluye contrato_concepto_id)
  const [generadores, setGeneradores] = useState([]); // renglones del generador (solo en modo porGenerador)
  const [urls, setUrls] = useState({});            // fotoId -> blobURL
  const [cargando, setCargando] = useState(false);
  const [subiendoKey, setSubiendoKey] = useState(null); // 'general' o un contrato_concepto_id, para el spinner por renglón
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (!estimacionId) return;
    setCargando(true); setError('');
    try {
      const [lista, det] = await Promise.all([
        api.listarFotosEstimacion(estimacionId),
        porGenerador ? api.detalleEstimacion(estimacionId).catch(() => null) : Promise.resolve(null),
      ]);
      const arr = Array.isArray(lista) ? lista : [];
      setFotos(arr);
      if (porGenerador) setGeneradores(Array.isArray(det?.generadores) ? det.generadores : []);
      const nuevos = {};
      await Promise.all(arr.map(async (f) => { try { nuevos[f.id] = await api.descargarFotoEstimacion(f.id); } catch { /* skip */ } }));
      setUrls((prev) => { Object.values(prev).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } }); return nuevos; });
    } catch { setError('No se pudieron cargar las fotos'); setFotos([]); }
    finally { setCargando(false); }
  }, [estimacionId, porGenerador]);

  useEffect(() => { cargar(); }, [cargar]);
  // Libera los blob URLs al desmontar.
  useEffect(() => () => { Object.values(urls).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sube una foto; `conceptoId` (opcional) la liga a un generador del contrato.
  const subir = useCallback(async (file, conceptoId, claveSpinner) => {
    if (!file) return;
    setSubiendoKey(claveSpinner); setError('');
    try {
      const liviana = await redimensionarImagen(file);
      await api.subirFotoEstimacion(estimacionId, liviana, '', conceptoId || null);
      await cargar();
    } catch (err) { setError(err.message || 'No se pudo subir la foto'); }
    finally { setSubiendoKey(null); }
  }, [estimacionId, cargar]);

  const onEliminar = async (fotoId) => {
    setError('');
    try { await api.eliminarFotoEstimacion(fotoId); await cargar(); }
    catch (err) { setError(err.message || 'No se pudo eliminar'); }
  };

  // Galería de miniaturas reutilizable.
  const Galeria = ({ items }) => (
    items.length === 0 ? null : (
      <div className="flex flex-wrap gap-2">
        {items.map((f) => (
          <div key={f.id} className="relative group">
            <a href={urls[f.id] || '#'} target="_blank" rel="noopener noreferrer" title={f.nombre || 'foto'}>
              {urls[f.id]
                ? <img src={urls[f.id]} alt={f.nombre || 'foto de avance'} className="w-20 h-20 object-cover rounded border border-borde" />
                : <div className="w-20 h-20 rounded border border-borde bg-pagina flex items-center justify-center text-base">📷</div>}
            </a>
            {!soloLectura && (
              <button type="button" onClick={() => onEliminar(f.id)} title="Eliminar foto"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[11px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition" data-testid={`foto-eliminar-${f.id}`}>×</button>
            )}
          </div>
        ))}
      </div>
    )
  );

  // Botón/label de subida (input file oculto). `claveSpinner` identifica el botón que muestra "Subiendo…".
  const BotonSubir = ({ conceptoId, claveSpinner, testid, etiqueta = '+ Agregar foto' }) => (
    <label className="text-[11px] font-semibold text-sigecop-accent hover:underline cursor-pointer whitespace-nowrap" data-testid={testid}>
      {subiendoKey === claveSpinner ? 'Subiendo…' : etiqueta}
      <input type="file" accept="image/jpeg,image/png" className="hidden"
        onChange={(e) => { const file = e.target.files && e.target.files[0]; e.target.value = ''; subir(file, conceptoId, claveSpinner); }}
        disabled={subiendoKey != null} />
    </label>
  );

  const fotosDe = (conceptoId) => fotos.filter((f) => Number(f.contrato_concepto_id) === Number(conceptoId));
  const fotosGenerales = fotos.filter((f) => f.contrato_concepto_id == null);

  // ── Modo POR GENERADOR (FIX 22-jun): un renglón por concepto + galería general ───────────────────────
  if (porGenerador && (generadores.length > 0 || cargando)) {
    return (
      <div className="mt-2" data-testid={`fotos-estimacion-${estimacionId}`}>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-tinta-ter mb-2">
          📷 Registro fotográfico por generador (art. 132 fr. IV RLOPSRM)
        </div>
        {error && <p className="text-[11px] text-red-600 mb-1">{error}</p>}
        {cargando ? (
          <p className="text-[11px] text-tinta-ter">Cargando…</p>
        ) : (
          <div className="space-y-2">
            {generadores.map((g) => {
              const items = fotosDe(g.contrato_concepto_id);
              return (
                <div key={g.contrato_concepto_id} className="border border-borde rounded-md px-3 py-2 bg-white" data-testid={`generador-fotos-${g.contrato_concepto_id}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-medium text-tinta-sec">
                      {g.orden != null ? `${g.orden}. ` : ''}{g.concepto}{g.unidad ? ` (${g.unidad})` : ''}
                    </span>
                    {!soloLectura && (
                      <BotonSubir conceptoId={g.contrato_concepto_id} claveSpinner={`c-${g.contrato_concepto_id}`} testid={`foto-subir-concepto-${g.contrato_concepto_id}`} />
                    )}
                  </div>
                  {items.length === 0
                    ? <p className="text-[11px] text-tinta-ter">Sin foto de este generador.{soloLectura ? '' : ' Sube JPEG/PNG.'}</p>
                    : <Galeria items={items} />}
                </div>
              );
            })}

            {/* Galería GENERAL (fotos sin concepto). Conserva los testids del modo plano para compatibilidad. */}
            <div className="border border-dashed border-borde rounded-md px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[12px] font-medium text-tinta-ter">General de la estimación (sin generador)</span>
                {!soloLectura && (
                  <BotonSubir conceptoId={null} claveSpinner="general" testid={`foto-subir-${estimacionId}`} />
                )}
              </div>
              {fotosGenerales.length === 0
                ? <p className="text-[11px] text-tinta-ter">Sin fotos generales.</p>
                : <Galeria items={fotosGenerales} />}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Modo PLANO (comportamiento original; también es el fallback si no hay generadores) ───────────────
  return (
    <div className="mt-2" data-testid={`fotos-estimacion-${estimacionId}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-tinta-ter">📷 Registro fotográfico (art. 132 fr. IV RLOPSRM)</span>
        {!soloLectura && (
          <BotonSubir conceptoId={null} claveSpinner="general" testid={`foto-subir-${estimacionId}`} />
        )}
      </div>
      {error && <p className="text-[11px] text-red-600 mb-1">{error}</p>}
      {cargando ? (
        <p className="text-[11px] text-tinta-ter">Cargando…</p>
      ) : fotos.length === 0 ? (
        <p className="text-[11px] text-tinta-ter">Sin fotos.{soloLectura ? '' : ' Sube JPEG/PNG (se redimensionan automáticamente).'}</p>
      ) : (
        <Galeria items={fotos} />
      )}
    </div>
  );
}
