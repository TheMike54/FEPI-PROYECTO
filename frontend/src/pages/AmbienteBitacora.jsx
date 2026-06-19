import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// AMBIENTE DE BITÁCORA — FASE 4 (rediseño por bloques): el hilo legal de la bitácora se presenta como
// un WIZARD de pasos encadenados (Apertura HU-08 → Firma conjunta → Emitir notas HU-09), patrón del Alta.
// Consultar (HU-10) y Minutas (HU-11) son LECTURA/episódico → quedan EN PARALELO (siempre accesibles, no
// encadenadas), tal como pidió el profe ("consultar la bitácora no se puede bloquear").
//
// NO funde las HU: cada paso enlaza a la RUTA REAL de su historia (apertura/por-firmar/notas) y muestra el
// estado que YA calcula el backend (bitacoraDeContrato). El CANDADO de emisión (paso 3) usa solo
// `bitacora.completa` (art. 123 fr. III RLOPSRM: las notas se emiten sobre una bitácora abierta y firmada
// por todos) — mismo candado que la pantalla de emisión. Ruta /bitacora/ambiente, fuera del catálogo.

function Bloque({ n, titulo, estado = 'activo', candado = false, testid, children }) {
  const color = candado ? 'border-amber-300' : estado === 'listo' ? 'border-sigecop-green-validation' : 'border-borde';
  return (
    <section className={`bg-white border ${color} rounded-lg overflow-hidden`} data-testid={testid}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${candado ? 'bg-amber-100 text-amber-800' : 'bg-guinda-soft text-guinda'}`}>{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {candado && <span className="ml-auto text-[11px] uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded" data-testid="candado-bit-4">🔒 En candado</span>}
        {estado === 'listo' && !candado && <span className="ml-auto text-[11px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">✓ Listo</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const PASOS_BIT = [
  { key: 'apertura', label: 'Apertura' },
  { key: 'firma', label: 'Firma conjunta' },
  { key: 'emitir', label: 'Emitir notas' },
];

export default function AmbienteBitacora() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [bitacora, setBitacora] = useState(null); // null = sin apertura o sin cargar
  const [sinApertura, setSinApertura] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setBitacora(null); setSinApertura(false); setPaso(0);
    if (!id) return;
    setCargando(true);
    try {
      const b = await api.bitacoraDeContrato(id); // 404 si no hay apertura
      setBitacora(b);
    } catch (e) {
      if (e.status === 404) { setSinApertura(true); }
      else if (e.status === 403) { showToast('No tienes acceso a la bitácora de este contrato'); }
      else { showToast('No se pudo cargar la bitácora'); }
    } finally { setCargando(false); }
  }, [showToast]);

  const firmantes = Array.isArray(bitacora?.firmantes) ? bitacora.firmantes : [];
  const firmadas = firmantes.filter((f) => f.firmado).length;
  const totalFirmas = firmantes.length;
  const abierta = !!bitacora;
  const completa = !!bitacora?.completa; // candado de emisión de notas
  const q = contratoId ? `?contrato=${contratoId}` : '';

  // Gating del wizard (atrás libre): Firma exige bitácora abierta; Emitir exige apertura firmada (candado).
  const pasoValido = useCallback((p) => {
    if (p === 0) return abierta;        // tras Apertura: la bitácora debe existir para pasar a Firma
    if (p === 1) return completa;       // tras Firma: completa para pasar a Emitir (art. 123 fr. III)
    return true;
  }, [abierta, completa]);
  const irPaso = (target) => {
    if (target <= paso) { setPaso(target); return; }
    for (let p = paso; p < target; p++) { if (!pasoValido(p)) { setPaso(p); return; } }
    setPaso(target);
  };

  return (
    <div className="space-y-4">
      <HeaderVista
        huId="HU-08"
        titulo="Ambiente de bitácora (hilo legal del contrato, por bloques)"
        sprint="Sprint 6"
        rolAcademico="Residente"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Bitácora' }, { label: 'Ambiente' }]}
      />

      <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-r-md text-sm text-slate-700" data-testid="ambiente-bitacora-aviso">
        <strong>Recorrido de la bitácora del contrato</strong>, como wizard: <strong>Apertura → Firma conjunta →
        Emitir notas</strong> (cada paso enlaza a su pantalla real, HU-08/09). <strong>Consultar (HU-10)</strong> y
        <strong> Minutas (HU-11)</strong> van <strong>en paralelo</strong> (lectura/episódico, siempre accesibles).
      </div>

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Inicia sesión para recorrer la bitácora de un contrato.
        </div>
      )}

      {/* Selector de contrato + estado (siempre; arranca el recorrido). */}
      <Bloque n={1} titulo="Contrato y estado de la bitácora" estado={abierta ? 'listo' : 'activo'} testid="bloque-bit-1">
        <div className="max-w-2xl">
          <label className="sg-label">Contrato</label>
          <select className="sg-input" value={contratoId} onChange={(e) => seleccionarContrato(e.target.value)} disabled={sinSesion} data-testid="select-contrato">
            <option value="">— Selecciona un contrato —</option>
            {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
          </select>
        </div>
        {contratoId && !cargando && (
          <div className="mt-3 text-sm" data-testid="estado-bitacora">
            {sinApertura ? (
              <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Este contrato <strong>aún no tiene bitácora aperturada</strong>. Empieza por el paso 1
                (Apertura, HU-08); las notas solo existen sobre una bitácora abierta.
              </p>
            ) : abierta ? (
              <div className="flex flex-wrap gap-4">
                <span className="text-emerald-800">✓ Bitácora <strong>abierta</strong> (nota de apertura #1 asentada).</span>
                <span data-testid="firmas-xy">Firmas de la apertura: <strong>{firmadas} de {totalFirmas}</strong> {completa ? '— completa' : '— faltan firmas'}.</span>
              </div>
            ) : null}
          </div>
        )}
      </Bloque>

      {/* Barra de pasos del wizard (el hilo encadenado). */}
      {contratoId && (
        <nav className="flex flex-wrap gap-2" data-testid="wizard-bitacora-pasos" aria-label="Pasos de la bitácora">
          {PASOS_BIT.map((p, i) => {
            const est = i === paso ? 'curr' : i < paso ? 'done' : 'todo';
            return (
              <button key={p.key} type="button" onClick={() => irPaso(i)} data-testid={`wpaso-bit-${p.key}`} data-estado={est}
                aria-current={est === 'curr' ? 'step' : undefined}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border ${est === 'curr' ? 'bg-guinda text-white border-guinda' : est === 'done' ? 'bg-guinda-soft text-guinda border-guinda/30' : 'bg-white text-tinta-sec border-borde'}`}>
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${est === 'curr' ? 'bg-white text-guinda' : est === 'done' ? 'bg-guinda text-white' : 'bg-pagina text-tinta-sec'}`}>{i + 1}</span>
                {p.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* PASO 1 · Abrir la bitácora (HU-08). */}
      {contratoId && paso === 0 && (
        <Bloque n={2} titulo="Abrir la bitácora (HU-08)" estado={abierta ? 'listo' : 'activo'} testid="bloque-bit-2">
          <p className="text-sm text-slate-700 mb-3">
            El residente abre la bitácora; el sistema genera la <strong>nota de apertura #1</strong> con los
            datos del contrato y deja las firmas pendientes. {abierta && <span className="text-emerald-800">Ya está abierta.</span>}
          </p>
          <Link to={`/bitacora/apertura${q}`} className="sg-btn-primary" data-testid="link-abrir">
            {abierta ? 'Ver la apertura (HU-08) →' : 'Abrir la bitácora (HU-08) →'}
          </Link>
        </Bloque>
      )}

      {/* PASO 2 · Firma conjunta (Por Firmar). */}
      {contratoId && paso === 1 && (
        <Bloque n={3} titulo="Firma conjunta de la apertura (Por Firmar)" estado={completa ? 'listo' : 'activo'} testid="bloque-bit-3">
          <p className="text-sm text-slate-700 mb-3">
            Cada parte firma su porción desde su cuenta. {abierta ? <span><strong>{firmadas} de {totalFirmas}</strong> firmadas{completa ? ' — completa.' : '; al firmar la última se desbloquea emitir notas.'}</span> : 'Disponible cuando exista la apertura.'}
          </p>
          <Link to="/bitacora/por-firmar" className="sg-btn-secondary" data-testid="link-firmar">
            Ir a "Por firmar" →
          </Link>
        </Bloque>
      )}

      {/* PASO 3 · Emitir notas (HU-09) — CANDADO: solo si la apertura está firmada por todos. */}
      {contratoId && paso === 2 && (
        <Bloque n={4} titulo="Emitir y responder notas (HU-09)" estado={completa ? 'activo' : undefined} candado={!completa} testid="bloque-bit-4">
          <p className="text-sm text-slate-700 mb-3">
            Con la apertura <strong>firmada por todos</strong> se emiten y responden notas de bitácora (folio
            correlativo, firma del emisor, anulación = nota correctiva vinculada). El candado es el mismo que
            aplica la pantalla de emisión.
          </p>
          {completa ? (
            <Link to={`/bitacora/notas${q}`} className="sg-btn-primary" data-testid="link-notas">
              Emitir notas (HU-09) →
            </Link>
          ) : (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2" data-testid="candado-notas-aviso">
              🔒 Emitir notas se habilita cuando la apertura está <strong>firmada por todas las partes</strong>
              {' '}(art. 123 fr. III RLOPSRM). Completa la firma en el paso 2.
            </p>
          )}
        </Bloque>
      )}

      {/* Navegación del wizard (atrás libre; adelante valida: abierta→Firma, completa→Emitir). */}
      {contratoId && (
        <div className="flex justify-between items-center max-w-2xl">
          <button type="button" onClick={() => irPaso(paso - 1)} disabled={paso === 0} className="px-4 py-2 text-tinta-sec hover:text-tinta disabled:opacity-40" data-testid="btn-watras-bit">← Atrás</button>
          {paso < PASOS_BIT.length - 1 && (
            <button type="button" onClick={() => irPaso(paso + 1)} disabled={!pasoValido(paso)} className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" data-testid="btn-wsiguiente-bit">Siguiente →</button>
          )}
        </div>
      )}

      {/* EN PARALELO (lectura/episódico) — siempre accesibles, no encadenadas al wizard. */}
      <div className="pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-tinta-sec mb-2">En paralelo (lectura, no se bloquean)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Bloque n={5} titulo="Consultar, buscar y exportar notas (HU-10)" testid="bloque-bit-5">
            <p className="text-sm text-slate-700 mb-3">
              Lectura de la bitácora: filtros combinados (tipo, periodo, tag) y exportación. Disponible en
              paralelo, no depende del candado.
            </p>
            <Link to={`/bitacora/consulta${q}`} className="sg-btn-secondary" data-testid="link-consulta">
              Consultar la bitácora (HU-10) →
            </Link>
          </Bloque>
          <Bloque n={6} titulo="Minutas, visitas y acuerdos (HU-11)" testid="bloque-bit-6">
            <p className="text-sm text-slate-700 mb-3">
              Reuniones, visitas de campo y acuerdos del contrato; cada minuta se puede <strong>vincular a una
              nota</strong> de la bitácora (art. 123 fr. X RLOPSRM), sin alterar la nota firmada.
            </p>
            <Link to={`/bitacora/minutas${q}`} className="sg-btn-secondary" data-testid="link-minutas">
              Minutas y visitas (HU-11) →
            </Link>
          </Bloque>
        </div>
      </div>
    </div>
  );
}
