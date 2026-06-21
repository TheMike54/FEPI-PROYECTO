// Redimensiona una imagen en el CLIENTE con <canvas> antes de subirla. Protege la BD (bytea): una foto de
// celular (3-8 MB) baja a ~150-400 KB. Máx 1600 px de lado, re-encodea JPEG calidad ~0.72. Si algo falla,
// devuelve el archivo original (la validación dura del lado servidor sigue aplicando). Solo presentación.
export function redimensionarImagen(file, maxLado = 1600, calidad = 0.72) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) { resolve(file); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxLado || height > maxLado) {
          const escala = Math.min(maxLado / width, maxLado / height);
          width = Math.round(width * escala);
          height = Math.round(height * escala);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) { resolve(file); return; }
          const base = (file.name || 'foto').replace(/\.(png|jpe?g|webp|gif)$/i, '');
          resolve(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }));
        }, 'image/jpeg', calidad);
      } catch { URL.revokeObjectURL(url); resolve(file); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
