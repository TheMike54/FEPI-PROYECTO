import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import { redimensionarImagen } from '../utils/imagen.js';

// EVIDENCIA FOTOGRÁFICA de UNA estimación (art. 132 fr. IV RLOPSRM). Galería simple + (si !soloLectura) subida.
// Las fotos se guardan como BYTEA (api); aquí se descargan como blob URL para el <img> (la descarga lleva el
// header Authorization, que un <img src> normal no podría enviar). Versión mínima: miniaturas + subir + eliminar.
export default function FotosEstimacion({ estimacionId, soloLectura = false }) {
  const [fotos, setFotos] = useState([]);   // metadatos
  const [urls, setUrls] = useState({});     // fotoId -> blobURL
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (!estimacionId) return;
    setCargando(true); setError('');
    try {
      const lista = await api.listarFotosEstimacion(estimacionId);
      const arr = Array.isArray(lista) ? lista : [];
      setFotos(arr);
      const nuevos = {};
      await Promise.all(arr.map(async (f) => { try { nuevos[f.id] = await api.descargarFotoEstimacion(f.id); } catch { /* skip */ } }));
      setUrls((prev) => { Object.values(prev).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } }); return nuevos; });
    } catch { setError('No se pudieron cargar las fotos'); setFotos([]); }
    finally { setCargando(false); }
  }, [estimacionId]);

  useEffect(() => { cargar(); }, [cargar]);
  // Libera los blob URLs al desmontar.
  useEffect(() => () => { Object.values(urls).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onElegir = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true); setError('');
    try {
      const liviana = await redimensionarImagen(file);
      await api.subirFotoEstimacion(estimacionId, liviana);
      await cargar();
    } catch (err) { setError(err.message || 'No se pudo subir la foto'); }
    finally { setSubiendo(false); }
  };

  const onEliminar = async (fotoId) => {
    setError('');
    try { await api.eliminarFotoEstimacion(fotoId); await cargar(); }
    catch (err) { setError(err.message || 'No se pudo eliminar'); }
  };

  return (
    <div className="mt-2" data-testid={`fotos-estimacion-${estimacionId}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-tinta-ter">📷 Registro fotográfico (art. 132 fr. IV RLOPSRM)</span>
        {!soloLectura && (
          <label className="text-[11px] font-semibold text-sigecop-accent hover:underline cursor-pointer" data-testid={`foto-subir-${estimacionId}`}>
            {subiendo ? 'Subiendo…' : '+ Agregar foto'}
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={onElegir} disabled={subiendo} />
          </label>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600 mb-1">{error}</p>}
      {cargando ? (
        <p className="text-[11px] text-tinta-ter">Cargando…</p>
      ) : fotos.length === 0 ? (
        <p className="text-[11px] text-tinta-ter">Sin fotos.{soloLectura ? '' : ' Sube JPEG/PNG (se redimensionan automáticamente).'}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {fotos.map((f) => (
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
      )}
    </div>
  );
}
