import { useState } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { partesBitacoraDummy, contratoDummy } from '../data/dummy.js';

// Tarjeta de cada parte firmante. Si parte.opcional=true (supervisor externo),
// permite marcar "No aplica" para liberar el requisito de firma. La parte queda
// inactiva tras la apertura (deshabilitada=true) para reflejar el carácter
// inalterable del evento.
function ParteCard({ parte, valores, onChange, soloLectura, deshabilitada }) {
  const aplica = valores.aplica !== false;
  const firmado = valores.firmado === true;
  const inactivaCampos = soloLectura || deshabilitada || !aplica;
  const inactivaFirma = soloLectura || deshabilitada || !aplica || firmado;

  return (
    <div
      className={`bg-white border ${firmado ? 'border-sigecop-green-validation' : 'border-slate-200'} rounded-md p-5 ${!aplica ? 'opacity-70' : ''}`}
      data-parte={parte.num}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-sigecop-blue text-white flex items-center justify-center font-bold flex-shrink-0">
          {parte.num}
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-sigecop-accent uppercase tracking-wider">
            Parte {parte.num}{parte.opcional ? ' · opcional' : ''}
          </div>
          <div className="font-bold text-slate-900">{parte.titulo}</div>
        </div>
        {!aplica ? (
          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded">
            No aplica
          </span>
        ) : firmado ? (
          <span className="inline-block px-2 py-1 bg-green-100 text-sigecop-green-validation text-xs font-semibold rounded">
            ✓ Firmado
          </span>
        ) : (
          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded">
            Pendiente de firma
          </span>
        )}
      </div>

      {parte.opcional && (
        <div className="mb-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              disabled={soloLectura || deshabilitada}
              checked={!aplica}
              onChange={(e) => onChange('aplica', !e.target.checked)}
            />
            No aplica (el contrato no contempla supervisor externo)
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="sg-label">Firmante autorizado</label>
          <input
            className="sg-input"
            value={valores.firmante}
            disabled={inactivaCampos}
            onChange={(e) => onChange('firmante', e.target.value)}
          />
        </div>
        <div>
          <label className="sg-label">{parte.cargoLabel}</label>
          <input
            className="sg-input"
            value={valores.cargo}
            disabled={inactivaCampos}
            onChange={(e) => onChange('cargo', e.target.value)}
          />
        </div>
        <div>
          <label className="sg-label">Correo electrónico</label>
          <input
            type="email"
            className="sg-input"
            value={valores.correo}
            disabled={inactivaCampos}
            onChange={(e) => onChange('correo', e.target.value)}
          />
        </div>
        <div>
          <label className="sg-label">Firmar</label>
          {firmado ? (
            <div className="sg-input bg-sigecop-green-bg text-sigecop-green-validation font-semibold flex items-center">
              ✓ Firmado · {valores.fechaFirma}
            </div>
          ) : (
            <button
              type="button"
              disabled={inactivaFirma}
              onClick={() => onChange('firmar', null)}
              className="sg-btn-primary w-full disabled:bg-slate-300 disabled:cursor-not-allowed"
              data-testid={`btn-firmar-${parte.num}`}
            >
              Firmar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Resumen compacto de cada parte para el bloque "Registro de firmas" dentro de
// la primera nota — refleja en tiempo real las firmas que el usuario ya plasmó.
function ParteResumen({ parte, valores }) {
  const aplica = valores.aplica !== false;
  const firmado = valores.firmado === true;
  return (
    <div className="border border-slate-200 rounded-md p-3 bg-white">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Parte {parte.num} · {parte.titulo}
      </div>
      {aplica ? (
        <>
          <div className="text-sm font-semibold text-slate-800 mt-1">{valores.firmante}</div>
          <div className="text-xs text-slate-600">{parte.cargoLabel}: {valores.cargo}</div>
          {firmado ? (
            <div className="text-xs text-sigecop-green-validation font-semibold mt-1">
              ✓ Firmado · {valores.fechaFirma}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic mt-1">Pendiente de firma</div>
          )}
        </>
      ) : (
        <div className="text-sm text-slate-500 italic mt-1">No aplica</div>
      )}
    </div>
  );
}

export default function AperturaBitacora() {
  const { soloLectura } = useVistaHU('HU-08');

  // Estado por parte: campos editables + estado de firma + bandera aplica
  // (solo se usa en la parte opcional). Inicializado desde el dummy.
  const [partes, setPartes] = useState(
    partesBitacoraDummy.reduce((acc, p) => {
      acc[p.num] = {
        firmante: p.firmante,
        cargo: p.cargo,
        correo: p.correo,
        firmado: false,
        fechaFirma: null,
        aplica: true
      };
      return acc;
    }, {})
  );

  // Estado de la primera nota: los datos del contrato son readonly (vienen del
  // contratoDummy y se autocompletan); las fechas sí son editables.
  const [primeraNota, setPrimeraNota] = useState({
    fechaInicioCronograma: contratoDummy.fechaInicio,
    fechaFinCronograma: contratoDummy.fechaTermino,
    fechaApertura: contratoDummy.fechaEntregaSitio
  });

  // Evento de apertura. No persiste al backend — vive en este estado para que
  // el prototipo refleje el "evento formal" en la propia vista.
  const [apertura, setApertura] = useState({ aperturada: false, fechaHora: null });

  const handleChangeParte = (num) => (campo, valor) => {
    setPartes((prev) => {
      const actual = prev[num];
      if (campo === 'firmar') {
        const ahora = new Date();
        const fecha = ahora.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
        return { ...prev, [num]: { ...actual, firmado: true, fechaFirma: fecha } };
      }
      if (campo === 'aplica') {
        // Si la parte se marca "no aplica", su firma queda anulada.
        return {
          ...prev,
          [num]: {
            ...actual,
            aplica: valor,
            firmado: valor ? actual.firmado : false,
            fechaFirma: valor ? actual.fechaFirma : null
          }
        };
      }
      return { ...prev, [num]: { ...actual, [campo]: valor } };
    });
  };

  const handleChangeNota = (campo) => (e) => {
    setPrimeraNota((prev) => ({ ...prev, [campo]: e.target.value }));
  };

  // Condiciones para habilitar "Aperturar": todas las fechas obligatorias
  // llenas + cada parte firmó (o se marcó "no aplica").
  const fechasOk =
    !!primeraNota.fechaInicioCronograma &&
    !!primeraNota.fechaFinCronograma &&
    !!primeraNota.fechaApertura;

  const firmasOk = [1, 2, 3].every((num) => {
    const p = partes[num];
    return p.aplica === false || p.firmado === true;
  });

  const puedeAperturar = !soloLectura && !apertura.aperturada && fechasOk && firmasOk;

  const handleAperturar = () => {
    if (!puedeAperturar) return;
    const ahora = new Date();
    const fechaHora = ahora.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    setApertura({ aperturada: true, fechaHora });
  };

  return (
    <div>
      <HeaderVista
        huId="HU-08"
        titulo="Apertura formal de la bitácora del contrato"
        sprint="Sprint 1"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Bitácora' },
          { label: 'Apertura' }
        ]}
      />

      <BannerContexto
        variant="blue"
        titulo="Contrato seleccionado"
        folio={contratoDummy.folio}
        contratista={contratoDummy.contratista}
        extra={[{ value: contratoDummy.objeto }]}
      />

      {apertura.aperturada && (
        <div
          className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 rounded-r-md mb-6"
          data-testid="aviso-aperturada"
        >
          <div className="text-sm font-semibold text-sigecop-green-validation">
            ✓ Bitácora aperturada
          </div>
          <p className="text-sm text-slate-800 mt-1">
            Evento formal registrado el <strong>{apertura.fechaHora}</strong>. La fecha y hora son inalterables.
          </p>
        </div>
      )}

      <h2 className="text-lg font-bold text-sigecop-blue mb-4">
        Firma conjunta de los tres autorizados
      </h2>

      <RegionEditable disabled={soloLectura}>
        <div className="space-y-4">
          {partesBitacoraDummy.map((p) => (
            <ParteCard
              key={p.num}
              parte={p}
              valores={partes[p.num]}
              onChange={handleChangeParte(p.num)}
              soloLectura={soloLectura}
              deshabilitada={apertura.aperturada}
            />
          ))}
        </div>
      </RegionEditable>

      <h2 className="text-lg font-bold text-sigecop-blue mt-8 mb-4">
        Primera nota de bitácora
      </h2>

      <RegionEditable disabled={soloLectura}>
        <div className="bg-white border border-slate-200 rounded-md p-5 mb-4 space-y-5">
          {/* Identificación del contrato — autocompletada del folio */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Identificación del contrato
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="sg-label">Folio</label>
                <input className="sg-input bg-slate-50" value={contratoDummy.folio} readOnly />
              </div>
              <div>
                <label className="sg-label">Dependencia</label>
                <input className="sg-input bg-slate-50" value={contratoDummy.dependencia} readOnly />
              </div>
            </div>
          </div>

          {/* Objeto de los trabajos */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Objeto de los trabajos
            </div>
            <input className="sg-input bg-slate-50" value={contratoDummy.objeto} readOnly />
          </div>

          {/* Datos financieros — monto, anticipo, plazo */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Datos financieros
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="sg-label">Monto contractual</label>
                <input className="sg-input bg-slate-50" value={contratoDummy.monto} readOnly />
              </div>
              <div>
                <label className="sg-label">Anticipo</label>
                <input className="sg-input bg-slate-50" value={contratoDummy.anticipo} readOnly />
              </div>
              <div>
                <label className="sg-label">Plazo de ejecución</label>
                <input className="sg-input bg-slate-50" value={contratoDummy.plazo} readOnly />
              </div>
            </div>
          </div>

          {/* Cronograma contractual — fecha inicio = entrega del sitio */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Cronograma contractual
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="sg-label">
                  Inicio (= entrega del sitio) <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  className="sg-input"
                  value={primeraNota.fechaInicioCronograma}
                  onChange={handleChangeNota('fechaInicioCronograma')}
                  disabled={soloLectura || apertura.aperturada}
                  required
                />
              </div>
              <div>
                <label className="sg-label">
                  Término contractual <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  className="sg-input"
                  value={primeraNota.fechaFinCronograma}
                  onChange={handleChangeNota('fechaFinCronograma')}
                  disabled={soloLectura || apertura.aperturada}
                  required
                />
              </div>
            </div>
          </div>

          {/* Fecha de apertura — coincide con la fecha de entrega del sitio */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Fecha de apertura
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="sg-label">
                  Fecha de entrega del sitio <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  className="sg-input"
                  value={primeraNota.fechaApertura}
                  onChange={handleChangeNota('fechaApertura')}
                  disabled={soloLectura || apertura.aperturada}
                  required
                  aria-label="Fecha de apertura"
                  data-testid="input-fecha-apertura"
                />
              </div>
            </div>
          </div>

          {/* Registro de firmas — resumen en tiempo real de las 3 partes */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Registro de firmas
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {partesBitacoraDummy.map((p) => (
                <ParteResumen key={p.num} parte={p} valores={partes[p.num]} />
              ))}
            </div>
          </div>
        </div>
      </RegionEditable>

      <div className="mt-6 bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 rounded-r-md">
        <div className="text-sm font-semibold text-sigecop-amber-attention">
          ⚠️ Evento formal inalterable
        </div>
        <p className="text-sm text-slate-800 mt-1">
          Esta apertura se registrará como evento formal inalterable conforme al art. 46 último párrafo
          LOPSRM y a los arts. 122-123 RLOPSRM. Una vez abierta, la fecha y hora quedan registradas
          y no pueden modificarse.
        </p>
      </div>

      {!soloLectura && !apertura.aperturada && (
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!puedeAperturar}
            onClick={handleAperturar}
            className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
            data-testid="btn-aperturar"
          >
            Aperturar bitácora
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-08"
        criterios={[
          { numero: 1, texto: 'Existe una bitácora única por contrato con las tres partes ligadas y sus firmantes autorizados (residente, supervisor externo si existe, superintendente).' },
          { numero: 2, texto: 'La fecha y hora de apertura (fecha de entrega del sitio) queda registrada como evento formal inalterable, con la firma conjunta de los tres autorizados.' },
          { numero: 3, texto: 'La primera nota registra los datos obligatorios: identificación del contrato, objeto, datos financieros, cronograma contractual y registro de firmas (art. 122 RLOPSRM).' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 122 RLOPSRM (Reglamento de la LOPSRM).
      </p>
    </div>
  );
}
