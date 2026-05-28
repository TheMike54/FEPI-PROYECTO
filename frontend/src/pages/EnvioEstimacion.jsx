import { useState, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { contratoDummy, envioEstimacionDummy } from '../data/dummy.js';

// Art. 54 LOPSRM: el contratista cuenta con 6 días naturales contados a partir
// de la fecha de corte para presentar la estimación. Pasado ese plazo, el envío
// queda bloqueado hasta el siguiente periodo. Al enviar, inicia automáticamente
// el plazo de revisión de 15 días naturales para supervisión.
const PLAZO_DIAS_ART_54 = 6;
const PLAZO_REVISION_DIAS = 15;

const NOTIFICADOS = [
  { rol: 'Residencia',  nombre: 'Ing. Carlos Hernández García' },
  { rol: 'Supervisión', nombre: 'Ing. Roberto López' }
];

function ResumenItem({ label, valor }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5">{valor}</div>
    </div>
  );
}

export default function EnvioEstimacion() {
  const { soloLectura } = useVistaHU('HU-13');
  const [diasTranscurridos, setDiasTranscurridos] = useState(envioEstimacionDummy.diasDefault);
  const [envio, setEnvio] = useState(null); // null | { fecha, hora }

  // Plazo se evalúa en vivo para que el banner verde/rojo y el disabled del
  // botón reflejen el estado actual del control de demostración.
  const dentroDePlazo = useMemo(() => {
    const n = Number(diasTranscurridos);
    return Number.isFinite(n) && n >= 0 && n <= PLAZO_DIAS_ART_54;
  }, [diasTranscurridos]);

  const enviado = envio !== null;

  const handleEnviar = () => {
    if (!dentroDePlazo || enviado || soloLectura) return;
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    setEnvio({ fecha, hora });
  };

  return (
    <div>
      <HeaderVista
        huId="HU-13"
        titulo="Envío de la estimación"
        sprint="Sprint 8"
        rolAcademico="Contratista"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Envío' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { value: contratoDummy.contratista },
          { label: 'Periodo:', value: envioEstimacionDummy.periodo, resaltado: true }
        ]}
      />

      {/* Resumen — display, fuera de RegionEditable. */}
      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">
          {enviado ? 'Estimación enviada' : 'Estimación lista para enviar'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ResumenItem label="Estimación" valor={`N.º ${envioEstimacionDummy.numero}`} />
          <ResumenItem label="Periodo" valor={envioEstimacionDummy.periodo} />
          <ResumenItem label="Conceptos" valor={envioEstimacionDummy.conceptos} />
          <ResumenItem label="Monto" valor={envioEstimacionDummy.monto} />
        </div>
      </div>

      {enviado && (
        <>
          <div
            className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md"
            data-testid="aviso-estimacion-enviada"
          >
            <div className="text-sm font-semibold text-sigecop-green-validation">
              ✓ Estimación enviada el {envio.fecha} a las {envio.hora}.
            </div>
            <p className="text-sm text-slate-800 mt-1">
              Notificación formal entregada a residencia y supervisión. Inicia plazo de
              revisión de {PLAZO_REVISION_DIAS} días naturales (art. 54 LOPSRM).
            </p>
          </div>

          <div
            className="bg-white border border-slate-200 rounded-md p-4 mb-4"
            data-testid="contador-plazo-revision"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-700">
                Plazo de revisión (supervisión, art. 54 LOPSRM)
              </div>
              <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-sigecop-green-validation">
                Plazo de revisión: día 0 de {PLAZO_REVISION_DIAS}
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-sigecop-green-validation" style={{ width: '0%' }} />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              El semáforo continúa su conteo en HU-15 (Revisión de estimación) tomando
              esta fecha de envío como inicio del plazo.
            </p>
          </div>

          <div
            className="bg-white border border-slate-200 rounded-md p-4 mb-6"
            data-testid="notificaciones-enviadas"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
              Notificaciones enviadas
            </h3>
            <ul className="space-y-2 text-sm">
              {NOTIFICADOS.map((n) => (
                <li key={n.rol} className="flex items-center gap-2 text-slate-800">
                  <span className="text-base">✉</span>
                  <span>
                    <strong>{n.rol}:</strong> {n.nombre}
                    <span className="text-xs text-slate-500 ml-2">
                      ({envio.fecha} {envio.hora})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Acción de envío — RegionEditable (contratista la ejecuta). Una vez
          enviado, todo el bloque queda disabled vía soloLectura efectivo. */}
      <RegionEditable disabled={soloLectura || enviado}>
        <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Plazo de presentación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="sg-label">Fecha de corte</label>
              <input className="sg-input" value={envioEstimacionDummy.fechaCorte} readOnly />
            </div>
            <div>
              <label className="sg-label">Días transcurridos desde el corte</label>
              <input
                type="number"
                min="0"
                step="1"
                className="sg-input"
                value={diasTranscurridos}
                onChange={(e) => setDiasTranscurridos(e.target.value)}
                data-testid="ee-dias"
              />
              <p className="text-xs text-slate-500 mt-1">
                Control de demostración — permite ver el comportamiento dentro y fuera del plazo.
              </p>
            </div>
          </div>

          {dentroDePlazo ? (
            <div className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-3 text-sm text-slate-800 rounded-r-md">
              ✅ <strong>Dentro del periodo de presentación</strong> — art. 54 LOPSRM:
              6 días naturales desde la fecha de corte.
            </div>
          ) : (
            <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-slate-800 rounded-r-md">
              ⛔ <strong>Venció el periodo de presentación</strong> de 6 días naturales
              (art. 54 LOPSRM). La estimación se debe presentar en el siguiente periodo.
            </div>
          )}

          <p className="text-xs text-slate-500 mt-4">
            Al enviar, el sistema registra fecha y hora exacta del acuse y notifica
            a residencia y supervisión (CA-1).
          </p>
        </div>
      </RegionEditable>

      {!soloLectura && !enviado && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!dentroDePlazo}
            onClick={handleEnviar}
            data-testid="btn-enviar-estimacion"
          >
            Enviar estimación
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-13"
        criterios={[
          { numero: 1, texto: 'Al enviar la estimación quedan registradas la fecha y hora exacta de recepción, y queda notificación formal a residencia y supervisión.' },
          { numero: 2, texto: 'El botón Enviar se deshabilita cuando se vencen los 6 días naturales del periodo de presentación (art. 54 LOPSRM).' },
          { numero: 3, texto: 'Al enviarse, inicia automáticamente el plazo de revisión de 15 días naturales (supervisión, art. 54 LOPSRM).' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 54 LOPSRM (6 días presentación + 15 días revisión + 5 días autorización + 20 días pago).
      </p>
    </div>
  );
}
