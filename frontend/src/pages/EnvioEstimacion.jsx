import { useState, useMemo } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { contratoDummy, envioEstimacionDummy } from '../data/dummy.js';

// Art. 54 LOPSRM: el contratista cuenta con 6 dias naturales contados a partir
// de la fecha de corte para presentar la estimacion. Pasado ese plazo, el envio
// queda bloqueado hasta el siguiente periodo.
const PLAZO_DIAS_ART_54 = 6;

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
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-13');
  const [diasTranscurridos, setDiasTranscurridos] = useState(envioEstimacionDummy.diasDefault);
  const [acuse, setAcuse] = useState(null);

  // El plazo se evalua siempre, no solo al presionar enviar — asi el banner
  // verde/rojo y el disabled del boton reflejan el estado en vivo.
  const dentroDePlazo = useMemo(() => {
    const n = Number(diasTranscurridos);
    return Number.isFinite(n) && n >= 0 && n <= PLAZO_DIAS_ART_54;
  }, [diasTranscurridos]);

  const enviar = () => {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    setAcuse({ fecha, hora });
    showToast(`Estimación enviada. Acuse: ${fecha} ${hora}.`);
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
          Estimación lista para enviar
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ResumenItem label="Estimación" valor={`N.º ${envioEstimacionDummy.numero}`} />
          <ResumenItem label="Periodo" valor={envioEstimacionDummy.periodo} />
          <ResumenItem label="Conceptos" valor={envioEstimacionDummy.conceptos} />
          <ResumenItem label="Monto" valor={envioEstimacionDummy.monto} />
        </div>
      </div>

      {/* Accion de envio — en RegionEditable porque el contratista la ejecuta. */}
      <RegionEditable disabled={soloLectura}>
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

      {acuse && (
        <div className="bg-sigecop-blue-light border-l-4 border-sigecop-accent px-4 py-3 mb-6 rounded-r-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-sigecop-blue">
            Acuse de envío
          </div>
          <div className="text-sm text-slate-800 mt-1">
            Estimación enviada el <strong>{acuse.fecha}</strong> a las{' '}
            <strong>{acuse.hora}</strong>. Notificación enviada a residencia y supervisión.
          </div>
        </div>
      )}

      {!soloLectura && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!dentroDePlazo}
            onClick={enviar}
          >
            Enviar estimación
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-13"
        criterios={[
          { numero: 1, texto: 'Al enviar la estimación queda registrada la fecha y hora exacta, y se notifica a residencia y supervisión.' },
          { numero: 2, texto: 'El botón Enviar se deshabilita cuando se vencen los 6 días naturales del periodo de presentación (art. 54 LOPSRM).' }
        ]}
      />
    </div>
  );
}
