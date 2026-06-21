import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import LinkHU from '../components/LinkHU.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { monedaMXN as moneda } from '../utils/formato.js';

// AMBIENTE DE PAGO de la estimación (sesión grande 18-jun, BLOQUE B) — flujo por bloques que ENVUELVE el
// ciclo de cobro SIN fundir las HU: estimación autorizada (HU-15) → tránsito a pago (HU-20) → instrucción →
// registro del pago (HU-21) → cierre (suma al saldo del finiquito HU-24).
//
// ORDEN LEGAL (resuelto con la ley): la estimación se AUTORIZA (art. 54 LOPSRM) → se verifica la SUFICIENCIA
// presupuestal y se emite la INSTRUCCIÓN (art. 24 LOPSRM, HU-20) → se REGISTRA el pago (HU-21). El plazo de
// 20 días naturales del art. 54 es la FECHA LÍMITE para pagar (la dependencia debe pagar dentro de ese
// plazo; vencerlo genera gastos financieros, art. 55) — por eso AVISA (semáforo), NO bloquea el pago: el
// objetivo es pagar antes del vencimiento, no impedirlo. Criterio del equipo (default conservador): el
// semáforo del plazo avisa, no bloquea (el bloqueo duro queda reservado al exceso del art. 118 RLOPSRM).
//
// CASCARÓN: bloques 2-3 (tránsito + instrucción) son HU-20, ya FUNCIONAL desde el BLOQUE A de esta sesión
// (suficiencia art. 24 + instrucción de pago real); ya NO son placeholders. Cada bloque enlaza a su ruta
// real; nada se reescribe. Ruta NUEVA /pagos/ambiente, fuera del catálogo (no toca permisos.js).

function Bloque({ n, titulo, estado = 'activo', children }) {
  const color = estado === 'listo' ? 'border-sigecop-green-validation' : 'border-borde';
  return (
    <section className={`bg-white border ${color} rounded-lg overflow-hidden`} data-testid={`bloque-pago-${n}`}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-guinda-soft text-guinda">{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {estado === 'listo' && <span className="ml-auto text-[11px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">✓ Listo</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AmbientePago() {
  const { token, rol } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;
  const puedeFiniquito = ['dependencia', 'residente'].includes(rol); // /contratos/finiquito es SoloRol

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [estimaciones, setEstimaciones] = useState([]);
  const [pagos, setPagos] = useState([]);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setEstimaciones([]); setPagos([]);
    if (!id) return;
    try {
      const e = await api.estimacionesDeContrato(id);
      setEstimaciones(Array.isArray(e) ? e : (Array.isArray(e?.estimaciones) ? e.estimaciones : []));
    } catch (err) {
      showToast(err.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudieron cargar las estimaciones');
    }
    try {
      const p = await api.listarPagos(id);
      setPagos(Array.isArray(p) ? p : (Array.isArray(p?.pagos) ? p.pagos : []));
    } catch (_) { /* informativo */ }
  }, [showToast]);

  const autorizadas = estimaciones.filter((e) => e.estado === 'autorizada');
  const pagadas = estimaciones.filter((e) => e.estado === 'pagada');
  const q = contratoId ? `?contrato=${contratoId}` : '';

  return (
    <div className="space-y-4">
      <HeaderVista
        huId="HU-21"
        titulo="Ambiente de pago de la estimación (ciclo de cobro)"
        sprint="Sprint 9"
        rolAcademico="Finanzas"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Pagos' }, { label: 'Ambiente' }]}
      />

      {/* FRENTE 2 / NAV-G — barra de pestañas del ciclo (incluye el chip "Ciclo · HU 20–21"); el ambiente no es
          un tab, así que ninguna pestaña queda marcada (activo sin coincidencia), pero el chip y la navegación sí. */}
      <PestanasCiclo ciclo="pago" activo="ambiente" />

      <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-r-md text-sm text-slate-700" data-testid="ambiente-pago-aviso">
        <strong>Ciclo de cobro de una estimación</strong>, paso a paso: estimación autorizada → tránsito a
        pago → instrucción → registro del pago → cierre. Cada bloque <strong>enlaza a su pantalla real</strong>;
        este ambiente solo las encadena. El cálculo (neto, suficiencia) lo hace el sistema.
      </div>

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Inicia sesión para recorrer el ciclo de pago de un contrato.
        </div>
      )}

      {/* BLOQUE 1 — Estimación autorizada (siembra el ciclo). */}
      <Bloque n={1} titulo="Estimación autorizada (punto de entrada)" estado={autorizadas.length ? 'listo' : 'activo'}>
        {/* Hereda el contrato activo global; el banner carga datos vía seleccionarContrato (3A·P3). */}
        <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />
        {contratoId && (
          <div className="mt-3 text-sm" data-testid="estimaciones-autorizadas">
            {autorizadas.length === 0 ? (
              <p className="text-slate-500 italic">No hay estimaciones <strong>autorizadas</strong> pendientes de pago en este contrato (solo lo autorizado por la residencia pasa a pago, art. 54).</p>
            ) : (
              <ul className="list-disc list-inside space-y-0.5">
                {autorizadas.map((e) => <li key={e.id}>Estimación <strong>#{e.numero}</strong> — neto {moneda(e.neto)} — lista para tránsito a pago.</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3 mt-3">
          <LinkHU hu="HU-14" to={`/estimaciones/historial${q}`} className="sg-btn-secondary" data-testid="link-historial" actor="No disponible para tu rol">Historial de estimaciones (HU-14) →</LinkHU>
          <LinkHU hu="HU-15" to={`/estimaciones/revision${q}`} className="sg-btn-secondary" data-testid="link-revision" actor="La hace Supervisión o Residencia">Revisión / autorización (HU-15) →</LinkHU>
        </div>
      </Bloque>

      {/* BLOQUE 2 — Tránsito a pago (HU-20, ya FUNCIONAL). */}
      <Bloque n={2} titulo="Tránsito a pago: suficiencia y soportes (HU-20)">
        <p className="text-sm text-slate-700 mb-3">
          Sobre la estimación autorizada, el sistema verifica la <strong>suficiencia presupuestal</strong>
          (art. 24 LOPSRM: techo − comprometido), revisa los <strong>soportes</strong> (factura, CFDI, fianza
          de cumplimiento) y muestra el <strong>semáforo del plazo de 20 días</strong> (art. 54).
        </p>
        <Link to={`/pagos/transito${q}`} className="sg-btn-secondary" data-testid="link-transito">
          Ir al tránsito a pago (HU-20) →
        </Link>
      </Bloque>

      {/* BLOQUE 3 — Instrucción de pago (salida de HU-20). */}
      <Bloque n={3} titulo="Instrucción de pago (emitida desde el tránsito)">
        <p className="text-sm text-slate-700">
          Cuando la suficiencia y los soportes están completos, el tránsito <strong>genera la instrucción de
          pago</strong> (una por estimación, monto = neto al centavo) y la <strong>notifica a Finanzas</strong>.
          Es la bisagra entre la autorización (HU-15) y el registro del pago (HU-21); se emite en la misma
          pantalla del bloque anterior.
        </p>
      </Bloque>

      {/* BLOQUE 4 — Registro del pago efectuado (HU-21). */}
      <Bloque n={4} titulo="Registro del pago efectuado (HU-21)">
        <p className="text-sm text-slate-700 mb-3">
          Finanzas registra el pago de la estimación autorizada: el <strong>importe = neto</strong> (lo
          calcula el sistema, no se teclea), no se paga dos veces ni una no autorizada (candados de HU-21).
        </p>
        <LinkHU hu="HU-21" to={`/pagos/registro${q}`} className="sg-btn-primary" data-testid="link-registro" actor="Lo registra Finanzas">
          Registrar el pago (HU-21) →
        </LinkHU>
      </Bloque>

      {/* BLOQUE 5 — Cierre del ciclo: pagos + continuación al finiquito. */}
      <Bloque n={5} titulo="Cierre del ciclo (pagos y finiquito)">
        {contratoId && (
          <div className="text-sm mb-3" data-testid="pagos-registrados">
            {pagos.length === 0 && pagadas.length === 0
              ? <p className="text-slate-500 italic">Sin pagos registrados todavía.</p>
              : <p><strong>{pagos.length || pagadas.length}</strong> pago(s)/estimación(es) pagada(s) en este contrato. Los pagos suman al <strong>saldo del finiquito</strong>.</p>}
          </div>
        )}
        <p className="text-sm text-slate-700 mb-3">
          Pagadas todas las estimaciones, el contrato continúa naturalmente a su <strong>finiquito</strong>
          (los pagos se descuentan del saldo final, art. 64 LOPSRM).
        </p>
        {puedeFiniquito ? (
          <LinkHU roles={['dependencia', 'residente']} to={`/contratos/finiquito${q}`} className="sg-btn-secondary" data-testid="link-finiquito" actor="Lo elabora la Dependencia o Residencia">
            Ir al finiquito y cierre (HU-24) →
          </LinkHU>
        ) : (
          <p className="text-xs text-slate-500" data-testid="finiquito-informativo">El <strong>finiquito</strong> lo elaboran la dependencia o la residencia (HU-24); no está disponible para tu rol.</p>
        )}
      </Bloque>
    </div>
  );
}
