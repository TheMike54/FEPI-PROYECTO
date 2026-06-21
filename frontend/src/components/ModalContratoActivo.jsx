import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';
import { nivelDe } from '../data/permisos.js';
import { useContratoActivo } from '../context/ContratoActivoContext.jsx';

// 3A · P1 — MODAL BLOQUEANTE "Elige tu contrato" (estilo SIGECOP, no es un alert del navegador). Aparece al
// entrar si no hay contrato activo y al pedir "Cambiar". NO se cierra salvo por salidas legítimas: elegir un
// contrato, "Crear contrato" (solo roles que pueden dar de alta), "Ver portafolio" o "Cerrar sesión". Solo
// bloquea las rutas que SÍ necesitan contrato (RUTAS_LIBRES quedan accesibles). Usa el contexto nuevo; NO toca
// el login ni permisos.js — SOLO LEE la regla de alta que ya existe (HU-01 nivel 'E' = puede crear contratos).
const RUTAS_LIBRES = [
  '/', // NAV-D — Inicio es PUERTO SEGURO: nunca se fuerza el modal en el inicio, así NINGÚN rol queda
       // atrapado (siempre puede volver al inicio y usar el sidebar/campana). El modal sigue apareciendo al
       // entrar a una pantalla que SÍ requiere contrato.
  '/portafolio', '/estimaciones/tablero', '/admin/empresas', '/usuarios/solicitudes',
  '/contratos/alta', // el alta NO requiere contrato activo (crear uno nuevo no necesita tener uno)
];

export default function ModalContratoActivo() {
  const { contratoId, contratos, cargandoLista, forzarSeleccion, setContratoActivo, cancelarCambio, olvidarContrato } = useContratoActivo();
  const { rol, logout } = useSesion();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('');

  // SOLO LEE el permiso existente: quién puede dar de alta contratos (HU-01 nivel 'E'). No modifica nada.
  const puedeCrear = nivelDe('HU-01', rol) === 'E';
  // NAV-D — "Ver portafolio" solo a roles que SÍ acceden a HU-18 (contratista/finanzas son null → al entrar a
  // /portafolio rebotaban a Inicio y, como Inicio exigía contrato, el modal reaparecía: BUCLE). Se LEE permisos.js.
  const puedePortafolio = nivelDe('HU-18', rol) !== null;

  const requiereContrato = !RUTAS_LIBRES.includes(pathname);
  const visible = forzarSeleccion || (!contratoId && requiereContrato);
  if (!visible) return null;

  const f = filtro.trim().toLowerCase();
  const lista = contratos.filter((c) => `${c.folio || ''} ${c.objeto || ''}`.toLowerCase().includes(f));
  const sinContratos = !cargandoLista && contratos.length === 0;
  const irPortafolio = () => { cancelarCambio(); navigate('/portafolio'); };
  const irAlta = () => { cancelarCambio(); navigate('/contratos/alta'); };
  const irInicio = () => { cancelarCambio(); navigate('/'); }; // NAV-D — escape garantizado (Inicio es ruta libre)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" data-testid="modal-elegir-contrato" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-borde">
          <h2 className="text-lg font-bold text-sigecop-blue">¿En qué contrato vas a trabajar?</h2>
          <p className="text-xs text-slate-500 mt-0.5">Elige uno para continuar. Podrás cambiarlo cuando quieras desde la barra de arriba.</p>
        </div>

        <div className="px-5 py-3">
          {/* El buscador solo cuando hay contratos que filtrar. */}
          {!sinContratos && !cargandoLista && (
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="🔎 Buscar por folio u objeto…"
              className="w-full border border-borde rounded-md px-3 py-2 text-sm mb-3"
              data-testid="modal-contrato-buscar"
            />
          )}

          {cargandoLista ? (
            <div className="px-4 py-6 text-sm text-slate-400 text-center">Cargando tus contratos…</div>
          ) : sinContratos ? (
            // SIN contratos: mensaje según el rol (lee el permiso de alta existente).
            puedeCrear ? (
              <div className="px-4 py-6 text-center" data-testid="modal-contrato-sin-crear">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm text-slate-700 font-semibold">Aún no tienes contratos.</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">¿Quieres crear uno?</p>
                <button type="button" onClick={irAlta} className="sg-btn-primary" data-testid="modal-contrato-crear">+ Crear contrato nuevo</button>
              </div>
            ) : (
              <div className="px-4 py-6 text-center" data-testid="modal-contrato-sin-asignados">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm text-slate-700 font-semibold">No tienes contratos asignados.</p>
                <p className="text-xs text-slate-500 mt-1">Espera a que la dependencia te asigne uno. Mientras, puedes ver el panorama general o cerrar sesión.</p>
              </div>
            )
          ) : lista.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500 text-center" data-testid="modal-contrato-vacio">
              Ninguno coincide con la búsqueda.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-borde border border-borde rounded-md">
              {lista.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setContratoActivo(c.id)}
                  data-testid={`modal-contrato-${c.id}`}
                  className="w-full text-left px-4 py-3 hover:bg-sigecop-blue-light transition"
                >
                  <div className="font-semibold text-slate-900 text-sm">{c.folio}</div>
                  <div className="text-xs text-slate-500 truncate">{c.objeto}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-borde flex items-center justify-between gap-2 bg-pagina">
          <div className="flex items-center gap-3">
            {/* (a) Crear contrato: visible SOLO para roles que pueden dar de alta (HU-01 'E'). */}
            {puedeCrear && !sinContratos && (
              <button type="button" onClick={irAlta} className="text-sm font-semibold text-sigecop-accent hover:underline" data-testid="modal-contrato-crear-footer">
                + Crear contrato nuevo
              </button>
            )}
            {/* NAV-D — solo a roles con acceso a HU-18 (evita el bucle portafolio→Inicio→modal). */}
            {puedePortafolio && (
              <button type="button" onClick={irPortafolio} className="text-sm font-semibold text-sigecop-accent hover:underline" data-testid="modal-contrato-portafolio">
                Ver portafolio →
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* NAV-D — escape SIEMPRE disponible al Inicio (ruta libre): ningún rol queda atrapado. */}
            <button type="button" onClick={irInicio} className="text-sm font-medium text-slate-500 hover:text-sigecop-blue" data-testid="modal-contrato-inicio">
              ← Ir al inicio
            </button>
            <button type="button" onClick={() => { olvidarContrato(); logout(); }} className="text-sm font-medium text-slate-500 hover:text-sigecop-blue" data-testid="modal-contrato-salir">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
