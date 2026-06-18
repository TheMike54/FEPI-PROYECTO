import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// AMBIENTE DE BITÁCORA (sesión grande 18-jun, BLOQUE B) — flujo por bloques que ENCADENA el hilo legal de
// la bitácora del contrato: apertura (HU-08) → firma conjunta (Por Firmar) → emisión de notas (HU-09) →
// consulta/búsqueda (HU-10) → minutas/visitas (HU-11), SIN FUNDIR las historias.
//
// CASCARÓN: cada bloque es un encabezado + un Link a la RUTA REAL de su HU + (opcional) un resumen
// read-only que el backend YA calcula (bitacoraDeContrato). NO reescribe lógica, NO duplica captura, NO
// borra ninguna vista. Si se borra este ambiente, todas las HU siguen intactas. Vive en ruta NUEVA
// /bitacora/ambiente, fuera del catálogo de HU (no toca permisos.js), como el roster/finiquito/ambiente de
// estimación.
//
// El CANDADO de emisión de notas (bloque 4) usa SOLO `bitacora.completa` de api.bitacoraDeContrato y se
// funda en el art. 123 fr. III RLOPSRM (la nota especial de apertura fija el plazo máximo de firma; las
// notas solo se emiten sobre una bitácora abierta y firmada por todos) — mismo candado que ya implementa la
// pantalla de emisión (no se reimplementa aquí). Criterio del equipo (default conservador): agrupar el
// ciclo en un ambiente NO funde las HU; cada una conserva su ruta/ficha/criterios.

function Bloque({ n, titulo, estado = 'activo', candado = false, children }) {
  const color = candado ? 'border-amber-300' : estado === 'listo' ? 'border-sigecop-green-validation' : 'border-borde';
  return (
    <section className={`bg-white border ${color} rounded-lg overflow-hidden`} data-testid={`bloque-bit-${n}`}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${candado ? 'bg-amber-100 text-amber-800' : estado === 'listo' ? 'bg-guinda-soft text-guinda' : 'bg-guinda-soft text-guinda'}`}>{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {candado && <span className="ml-auto text-[11px] uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded" data-testid={`candado-bit-${n}`}>🔒 En candado</span>}
        {estado === 'listo' && !candado && <span className="ml-auto text-[11px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">✓ Listo</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AmbienteBitacora() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [bitacora, setBitacora] = useState(null); // null = sin apertura o sin cargar
  const [sinApertura, setSinApertura] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setBitacora(null); setSinApertura(false);
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
        <strong>Recorrido de la bitácora del contrato</strong>, por bloques: apertura → firma conjunta →
        emisión de notas → consulta → minutas. Cada bloque <strong>enlaza a su pantalla real</strong> (su
        propia historia de usuario); este ambiente solo las <strong>encadena</strong> y muestra el estado. No
        reemplaza ninguna vista.
      </div>

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Inicia sesión para recorrer la bitácora de un contrato.
        </div>
      )}

      {/* BLOQUE 1 — Contrato y estado de la bitácora. */}
      <Bloque n={1} titulo="Contrato y estado de la bitácora" estado={abierta ? 'listo' : 'activo'}>
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
                Este contrato <strong>aún no tiene bitácora aperturada</strong>. Empieza por el bloque 2
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
        <p className="text-xs text-slate-500 mt-2">El estado de la bitácora decide qué bloques se activan: sin apertura → abre primero; firmada por todos → se habilita emitir notas.</p>
      </Bloque>

      {/* BLOQUE 2 — Abrir la bitácora (HU-08). */}
      <Bloque n={2} titulo="Abrir la bitácora (HU-08)" estado={abierta ? 'listo' : 'activo'}>
        <p className="text-sm text-slate-700 mb-3">
          El residente abre la bitácora; el sistema genera la <strong>nota de apertura #1</strong> con los
          datos del contrato y deja las firmas pendientes. {abierta && <span className="text-emerald-800">Ya está abierta.</span>}
        </p>
        <Link to={`/bitacora/apertura${q}`} className="sg-btn-primary" data-testid="link-abrir">
          {abierta ? 'Ver la apertura (HU-08) →' : 'Abrir la bitácora (HU-08) →'}
        </Link>
      </Bloque>

      {/* BLOQUE 3 — Firma conjunta (Por Firmar). */}
      <Bloque n={3} titulo="Firma conjunta de la apertura (Por Firmar)" estado={completa ? 'listo' : 'activo'}>
        <p className="text-sm text-slate-700 mb-3">
          Cada parte firma su porción desde su cuenta. {abierta ? <span><strong>{firmadas} de {totalFirmas}</strong> firmadas{completa ? ' — completa.' : '; al firmar la última se desbloquea emitir notas.'}</span> : 'Disponible cuando exista la apertura.'}
        </p>
        <Link to="/bitacora/por-firmar" className="sg-btn-secondary" data-testid="link-firmar">
          Ir a "Por firmar" →
        </Link>
      </Bloque>

      {/* BLOQUE 4 — Emitir y responder notas (HU-09) — CANDADO: solo si la apertura está firmada por todos. */}
      <Bloque n={4} titulo="Emitir y responder notas (HU-09)" estado={completa ? 'activo' : undefined} candado={!completa}>
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
            {' '}(art. 123 fr. III RLOPSRM). Completa la firma en el bloque 3.
          </p>
        )}
      </Bloque>

      {/* BLOQUE 5 — Consultar, buscar y exportar (HU-10). */}
      <Bloque n={5} titulo="Consultar, buscar y exportar notas (HU-10)">
        <p className="text-sm text-slate-700 mb-3">
          Lectura de la bitácora: filtros combinados (tipo, periodo, tag) y exportación. Disponible en
          paralelo, no depende del candado.
        </p>
        <Link to={`/bitacora/consulta${q}`} className="sg-btn-secondary" data-testid="link-consulta">
          Consultar la bitácora (HU-10) →
        </Link>
      </Bloque>

      {/* BLOQUE 6 — Minutas, visitas y acuerdos (HU-11) — YA FUNCIONAL (sesión E2 18-jun). */}
      <Bloque n={6} titulo="Minutas, visitas y acuerdos (HU-11)">
        <p className="text-sm text-slate-700 mb-3">
          Reuniones, visitas de campo y acuerdos del contrato; cada minuta se puede <strong>vincular a una
          nota</strong> de la bitácora (art. 123 fr. X RLOPSRM), sin alterar la nota firmada. Backend real
          (PDF y vínculo persisten).
        </p>
        <Link to={`/bitacora/minutas${q}`} className="sg-btn-secondary" data-testid="link-minutas">
          Minutas y visitas (HU-11) →
        </Link>
      </Bloque>
    </div>
  );
}
