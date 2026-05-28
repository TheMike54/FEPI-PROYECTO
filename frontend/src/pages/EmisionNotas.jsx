import { useState, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU, useSesion } from '../context/SesionContext.jsx';
import {
  notasBitacoraDummy,
  tiposNotaPorRol,
  firmantePorRol,
  contratoDummy
} from '../data/dummy.js';

const OTRO_TIPO = 'Otro tipo de nota';
const ROLES_FIRMA = ['residente', 'supervision', 'contratista'];
const ROL_LABEL = {
  residente:   'Residente',
  supervision: 'Supervisión',
  contratista: 'Superintendente'
};

// Calcula el próximo folio correlativo BIT-XXXX leyendo el máximo de los
// existentes (dummy + emitidas en sesión).
function proximoFolio(notasExistentes) {
  const maxNum = notasExistentes.reduce((max, n) => {
    const m = n.folio?.match(/^BIT-(\d+)$/);
    if (!m) return max;
    const num = parseInt(m[1], 10);
    return num > max ? num : max;
  }, 0);
  return `BIT-${String(maxNum + 1).padStart(4, '0')}`;
}

const COLOR_BADGE = {
  blue:  'bg-sigecop-blue-light text-sigecop-blue',
  amber: 'bg-amber-100 text-sigecop-amber-attention',
  green: 'bg-green-100 text-sigecop-green-validation'
};

// Card de cada nota en el libro de bitácora. Si esNueva (emitida en sesión),
// se resalta en verde y muestra el botón "Crear nota vinculada".
function NotaCard({ nota, esNueva, onCrearVinculada }) {
  return (
    <div
      className={`border rounded-md p-3 transition-colors ${esNueva ? 'border-sigecop-green-validation bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}
      data-testid={esNueva ? `nota-emitida-${nota.folio}` : undefined}
    >
      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold font-mono ${COLOR_BADGE[nota.color] || COLOR_BADGE.blue}`}>
          {nota.folio} · {nota.tipo}
        </span>
        <span className="text-xs text-slate-500">{nota.fecha}</span>
      </div>
      <div className="text-xs font-semibold text-slate-800 mt-1">{nota.asunto}</div>
      {nota.contenido && (
        <div className="text-xs text-slate-600 mt-1 line-clamp-3">{nota.contenido}</div>
      )}
      <div className="text-xs text-slate-500 mt-1">Firmante: {nota.firmante}</div>
      {nota.vinculadaA && (
        <div className="text-xs text-sigecop-blue mt-1">↪ Vinculada a {nota.vinculadaA}</div>
      )}
      {esNueva && (
        <div className="mt-2 flex items-center justify-between">
          <span className="inline-block text-[10px] uppercase tracking-wider font-semibold text-sigecop-green-validation">
            ✓ Inmutable
          </span>
          {onCrearVinculada && (
            <button
              type="button"
              className="text-xs text-sigecop-blue hover:underline"
              onClick={() => onCrearVinculada(nota.folio, nota.contenido, nota.asunto)}
              data-testid={`btn-vincular-${nota.folio}`}
            >
              + Crear nota vinculada
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Modal de confirmación de firma — inalterabilidad antes de plasmar el sello.
function ConfirmModal({ abierto, parteLabel, onCancel, onConfirm }) {
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
      data-testid="modal-confirmar-firma"
    >
      <div className="bg-white rounded-md shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-sigecop-blue mb-3">
          Firmar como {parteLabel}
        </h3>
        <p className="text-sm text-slate-700 mb-4">
          ¿Confirmas la emisión? Una vez firmada la nota es <strong>INALTERABLE</strong>. Las
          correcciones solo se hacen emitiendo una nota vinculada.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-slate-600 hover:text-slate-900"
            onClick={onCancel}
            data-testid="btn-cancelar-firma"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="sg-btn-primary"
            onClick={onConfirm}
            data-testid="btn-confirmar-firma"
          >
            Confirmar y firmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmisionNotas() {
  const { soloLectura } = useVistaHU('HU-09');
  const { rol } = useSesion();
  const rolEfectivo = rol ?? 'residente';
  const tiposNotaBase = tiposNotaPorRol[rolEfectivo] ?? tiposNotaPorRol.residente;
  // El catálogo del rol activo + opción al final para tipos no tipificados.
  const opcionesTipo = useMemo(() => [...tiposNotaBase, OTRO_TIPO], [tiposNotaBase]);

  // Estado del formulario en curso.
  const [tipo, setTipo] = useState(tiposNotaBase[0]);
  const [tipoManual, setTipoManual] = useState('');
  const [asunto, setAsunto] = useState('');
  const [contenido, setContenido] = useState('');
  const [vinculadaA, setVinculadaA] = useState(null); // folio o null
  const [diceTexto, setDiceTexto] = useState('');     // contenido de la nota vinculada
  const [firmas, setFirmas] = useState({
    residente:   { firmado: false, fechaFirma: null },
    supervision: { firmado: false, fechaFirma: null },
    contratista: { firmado: false, fechaFirma: null }
  });

  // Notas emitidas en esta sesión. Suben al tope del libro y quedan inmutables
  // (no persisten al backend — viven en el estado del prototipo).
  const [notasEmitidas, setNotasEmitidas] = useState([]);

  // Modal de confirmación — guarda qué rol está pidiendo firmar.
  const [parteAFirmar, setParteAFirmar] = useState(null);

  const todasNotas = useMemo(
    () => [...notasEmitidas, ...notasBitacoraDummy],
    [notasEmitidas]
  );

  const folioProximo = useMemo(() => proximoFolio(todasNotas), [todasNotas]);

  const tipoEfectivo = tipo === OTRO_TIPO
    ? (tipoManual.trim() || OTRO_TIPO)
    : tipo;

  const hoy = new Date().toISOString().slice(0, 10);

  const handleSolicitarFirma = (parte) => setParteAFirmar(parte);
  const handleCancelarFirma = () => setParteAFirmar(null);
  const handleConfirmarFirma = () => {
    if (!parteAFirmar) return;
    const ahora = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    setFirmas((prev) => ({
      ...prev,
      [parteAFirmar]: { firmado: true, fechaFirma: ahora }
    }));
    setParteAFirmar(null);
  };

  const todasFirmadas = ROLES_FIRMA.every((r) => firmas[r].firmado);
  const datosMinimosOk =
    asunto.trim().length > 0 &&
    contenido.trim().length > 0 &&
    (tipo !== OTRO_TIPO || tipoManual.trim().length > 0);
  const puedeEmitir = !soloLectura && todasFirmadas && datosMinimosOk;

  const limpiarFormulario = () => {
    setTipo(tiposNotaBase[0]);
    setTipoManual('');
    setAsunto('');
    setContenido('');
    setVinculadaA(null);
    setDiceTexto('');
    setFirmas({
      residente:   { firmado: false, fechaFirma: null },
      supervision: { firmado: false, fechaFirma: null },
      contratista: { firmado: false, fechaFirma: null }
    });
  };

  const handleEmitir = () => {
    if (!puedeEmitir) return;
    const nueva = {
      folio: folioProximo,
      tipo: tipoEfectivo,
      fecha: hoy,
      firmante: firmantePorRol[rolEfectivo] || firmantePorRol.residente,
      rol: rolEfectivo,
      asunto: asunto.trim(),
      contenido: contenido.trim(),
      vinculadaA: vinculadaA || null,
      color: 'blue',
      firmasRegistro: {
        residente:   firmas.residente.fechaFirma,
        supervision: firmas.supervision.fechaFirma,
        contratista: firmas.contratista.fechaFirma
      }
    };
    setNotasEmitidas((prev) => [nueva, ...prev]);
    limpiarFormulario();
  };

  // Pre-llena el formulario para crear una nota vinculada en formato
  // "Dice / Debe decir" — se pulsa desde el card de una nota emitida.
  const handleCrearVinculada = (folioOriginal, contenidoOriginal, asuntoOriginal) => {
    setVinculadaA(folioOriginal);
    setDiceTexto(contenidoOriginal || asuntoOriginal || '');
    setAsunto(`Vinculada a ${folioOriginal} — corrección`);
    setContenido('');
    // Si "Respuesta" no está en el catálogo del rol, deja el primero del catálogo.
    setTipo(opcionesTipo.includes('Respuesta') ? 'Respuesta' : opcionesTipo[0]);
    setTipoManual('');
    setFirmas({
      residente:   { firmado: false, fechaFirma: null },
      supervision: { firmado: false, fechaFirma: null },
      contratista: { firmado: false, fechaFirma: null }
    });
  };

  // Cuando el usuario elige una nota previa en el select de vínculo, copiamos
  // su contenido a diceTexto para que el bloque "Dice:" sea coherente con la
  // nota seleccionada (aplica tanto al flujo manual como al del botón).
  const handleVinculadaAChange = (folio) => {
    if (!folio) {
      setVinculadaA(null);
      setDiceTexto('');
      return;
    }
    setVinculadaA(folio);
    const nota = todasNotas.find((n) => n.folio === folio);
    setDiceTexto(nota?.contenido || nota?.asunto || '');
  };

  const foliosEmitidos = useMemo(
    () => new Set(notasEmitidas.map((n) => n.folio)),
    [notasEmitidas]
  );

  return (
    <div>
      <HeaderVista
        huId="HU-09"
        titulo="Emisión y respuesta de notas tipificadas con firma"
        sprint="Sprint 2"
        descripcion="Tipo de nota disponible según rol autorizado (art. 125 RLOPSRM)."
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Bitácora' },
          { label: 'Emisión de notas' }
        ]}
      />

      <BannerContexto
        variant="blue"
        titulo="Contrato · Bitácora"
        folio={contratoDummy.folio}
        extra={[{ value: contratoDummy.objeto }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: libro de bitácora completo */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Libro de bitácora ({todasNotas.length})
          </h2>
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1" data-testid="lista-notas">
            {todasNotas.map((n) => (
              <NotaCard
                key={n.folio}
                nota={n}
                esNueva={foliosEmitidos.has(n.folio)}
                onCrearVinculada={
                  foliosEmitidos.has(n.folio) && !soloLectura ? handleCrearVinculada : null
                }
              />
            ))}
          </div>
        </div>

        {/* Columna derecha: formulario de nueva nota */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md p-6">
          <h2 className="text-lg font-bold text-sigecop-blue mb-4">
            {vinculadaA
              ? `Nueva nota vinculada a ${vinculadaA}`
              : 'Emisión de nueva nota'}
          </h2>

          <RegionEditable disabled={soloLectura}>
            <div className="space-y-4">
              {/* Bloque "Dice:" sólo cuando es vinculada */}
              {vinculadaA && diceTexto && (
                <div className="border border-slate-200 rounded-md p-3 bg-slate-50" data-testid="bloque-dice">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Dice ({vinculadaA}):
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{diceTexto}</p>
                </div>
              )}

              <div>
                <label className="sg-label">Tipo de nota (según rol)</label>
                <select
                  className="sg-input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  data-testid="select-tipo"
                >
                  {opcionesTipo.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                {tipo === OTRO_TIPO && (
                  <input
                    className="sg-input mt-2"
                    placeholder="Especifica el tipo de nota"
                    value={tipoManual}
                    onChange={(e) => setTipoManual(e.target.value)}
                    data-testid="input-tipo-manual"
                  />
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Solo aparecen los tipos de nota que corresponden a tu rol (art. 125 RLOPSRM);
                  para eventos no tipificados, elige "{OTRO_TIPO}".
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="sg-label">Folio asignado</label>
                  <input
                    disabled
                    className="sg-input bg-slate-100 cursor-not-allowed text-slate-700 font-mono font-semibold"
                    value={folioProximo}
                    readOnly
                    data-testid="folio-asignado"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Correlativo BIT-XXXX.</p>
                </div>
                <div>
                  <label className="sg-label">Fecha</label>
                  <input disabled className="sg-input bg-slate-100" value={hoy} readOnly />
                </div>
              </div>

              <div>
                <label className="sg-label">Asunto *</label>
                <input
                  className="sg-input"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Asunto breve de la nota"
                  data-testid="input-asunto"
                />
              </div>

              <div>
                <label className="sg-label">
                  {vinculadaA ? 'Debe decir: *' : 'Contenido de la nota *'}
                </label>
                <textarea
                  className="sg-input"
                  rows={6}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  placeholder={vinculadaA ? 'Redacción corregida' : 'Redacción de la nota'}
                  data-testid="input-contenido"
                />
              </div>

              <div>
                <label className="sg-label">Vincular a nota previa (opcional)</label>
                <select
                  className="sg-input"
                  value={vinculadaA || ''}
                  onChange={(e) => handleVinculadaAChange(e.target.value)}
                  data-testid="select-vinculo"
                >
                  <option value="">— Sin vínculo —</option>
                  {todasNotas.map((n) => (
                    <option key={n.folio} value={n.folio}>
                      {n.folio} · {(n.asunto || '').slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 rounded-r-md">
                ⚠️ <strong>Una vez firmada, esta nota será inmutable.</strong> Si necesitas
                corregir algo después, deberás emitir una nueva nota vinculada a ésta.
              </div>

              {/* Firma conjunta de los tres */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Firma conjunta de los tres
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ROLES_FIRMA.map((r) => {
                    const f = firmas[r];
                    const firmanteTxt = firmantePorRol[r] || '—';
                    return (
                      <div
                        key={r}
                        className={`border rounded-md p-3 ${f.firmado ? 'border-sigecop-green-validation bg-green-50' : 'border-slate-200'}`}
                        data-firma-rol={r}
                      >
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {ROL_LABEL[r]}
                        </div>
                        <div className="text-xs text-slate-700 mt-1">{firmanteTxt}</div>
                        {f.firmado ? (
                          <div className="mt-2 text-xs text-sigecop-green-validation font-semibold">
                            ✓ Firmado · {f.fechaFirma}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={soloLectura}
                            className="sg-btn-primary w-full mt-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            onClick={() => handleSolicitarFirma(r)}
                            data-testid={`btn-firmar-${r}`}
                          >
                            Firmar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {!soloLectura && (
                <div className="flex justify-end gap-3 pt-2">
                  {vinculadaA && (
                    <button
                      type="button"
                      className="px-4 py-2 text-slate-600 hover:text-slate-900"
                      onClick={limpiarFormulario}
                    >
                      Cancelar vinculación
                    </button>
                  )}
                  <button
                    type="button"
                    className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
                    disabled={!puedeEmitir}
                    onClick={handleEmitir}
                    data-testid="btn-emitir"
                  >
                    Emitir nota
                  </button>
                </div>
              )}
            </div>
          </RegionEditable>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-09"
        criterios={[
          { numero: 1, texto: 'Aparecen los tipos de nota que corresponden al rol del usuario, pudiendo incorporar también otro tipo de nota para eventos no tipificados.' },
          { numero: 2, texto: 'Una nota firmada queda inmutable; las correcciones se hacen generando una nota vinculada (formato "dice / debe decir"), sin alterar la original.' },
          { numero: 3, texto: 'Cada nota queda registrada con folio correlativo, fecha, firma de los tres participantes y vínculo opcional a nota previa.' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: arts. 122 y 125 RLOPSRM.
      </p>

      <ConfirmModal
        abierto={parteAFirmar !== null}
        parteLabel={parteAFirmar ? ROL_LABEL[parteAFirmar] : ''}
        onCancel={handleCancelarFirma}
        onConfirm={handleConfirmarFirma}
      />
    </div>
  );
}
