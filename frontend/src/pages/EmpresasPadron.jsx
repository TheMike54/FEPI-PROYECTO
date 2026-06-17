import { useState, useEffect, useCallback } from 'react';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// PLAN GRANDE BLOQUE 1 — PADRÓN DE EMPRESAS. Pantalla NUEVA de administración (la DEPENDENCIA valida e
// inscribe el padrón de contratistas/supervisión; art. 43 RLOPSRM / art. 74 Bis LOPSRM). Modelo mixto:
// el contratista/supervisión PROPONE su empresa al registrarse (nace 'por_validar'), y aquí la
// dependencia la VALIDA o la FUSIONA con una existente (detecta posibles duplicados por forma fuerte).
// Las DEPENDENCIAS van aparte (no son contratistas). Cableada a /api/empresas/* (solo dependencia).

function Tabs({ tab, setTab, pendientes }) {
  const T = (k, label) => (
    <button type="button" onClick={() => setTab(k)} data-testid={`tab-${k}`}
      className={`px-4 py-2 text-sm rounded-t-lg border border-borde ${tab === k ? 'bg-white text-guinda font-semibold border-b-white -mb-px' : 'bg-pagina text-tinta-sec'}`}>
      {label}{k === 'porvalidar' && pendientes > 0 ? ` (${pendientes})` : ''}
    </button>
  );
  return (
    <div className="flex gap-1 border-b border-borde mb-4">
      {T('padron', 'Padrón de contratistas/supervisión')}
      {T('porvalidar', 'Por validar')}
      {T('dependencias', 'Dependencias')}
    </div>
  );
}

export default function EmpresasPadron() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [tab, setTab] = useState('padron');
  const [padron, setPadron] = useState([]);
  const [porValidar, setPorValidar] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    if (sinSesion) return;
    setCargando(true);
    try {
      const [p, pv, dep] = await Promise.all([
        api.padronEmpresas().catch(() => []),
        api.empresasPorValidar().catch(() => []),
        api.dependenciasCatalogo().catch(() => []),
      ]);
      setPadron(Array.isArray(p) ? p : []);
      setPorValidar(Array.isArray(pv) ? pv : []);
      setDependencias(Array.isArray(dep) ? dep : []);
    } catch (_) { showToast('No se pudo cargar el padrón'); }
    finally { setCargando(false); }
  }, [sinSesion, showToast]);

  useEffect(() => { recargar(); }, [recargar]);

  const validar = async (id) => {
    try { await api.validarEmpresa(id); showToast('Empresa validada e inscrita al padrón (art. 43 RLOPSRM).'); recargar(); }
    catch (e) { showToast(e.message || 'No se pudo validar'); }
  };
  const fusionar = async (id, canonicaId) => {
    try { await api.fusionarEmpresa(id, canonicaId); showToast('Empresa fusionada con la existente.'); recargar(); }
    catch (e) { showToast(e.message || 'No se pudo fusionar'); }
  };

  const tipoLabel = (t) => (t === 'supervision' ? 'Supervisión' : t === 'dependencia' ? 'Dependencia' : 'Contratista');

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Padrón de empresas' }]} />
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-medium text-tinta">Padrón de empresas (administración)</h1>
      </div>

      <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-r-md text-sm text-slate-700" data-testid="empresas-aviso">
        La <strong>Dependencia</strong> valida e inscribe el padrón de contratistas/supervisión: el
        contratista <strong>propone</strong> su empresa al registrarse y aquí se <strong>valida</strong> o se
        <strong> fusiona</strong> con una existente (art. 43 RLOPSRM / art. 74 Bis LOPSRM). Las dependencias
        (entidad pública) van aparte.
      </div>

      {sinSesion && <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">Inicia sesión como Dependencia para administrar el padrón.</div>}

      <div className="bg-white border border-borde rounded-lg p-5">
        <Tabs tab={tab} setTab={setTab} pendientes={porValidar.length} />

        {tab === 'padron' && (
          <div data-testid="panel-padron">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-tinta-sec border-b border-borde">
                <th className="py-2">Razón social</th><th>Tipo</th><th className="text-right">Personas</th><th className="text-right">Contratos</th><th>Estado</th></tr></thead>
              <tbody>
                {padron.length === 0 ? (
                  <tr><td colSpan={5} className="py-4 text-center text-tinta-sec italic">{cargando ? 'Cargando…' : 'Sin empresas en el padrón.'}</td></tr>
                ) : padron.map((e) => (
                  <tr key={e.id} className="border-b border-borde" data-testid={`empresa-${e.id}`}>
                    <td className="py-2">{e.nombre}</td>
                    <td><span className="text-xs px-2 py-0.5 rounded-full bg-sigecop-blue-light text-sigecop-blue">{tipoLabel(e.tipo)}</span></td>
                    <td className="text-right">{e.personas}</td>
                    <td className="text-right">{e.contratos}</td>
                    <td>{e.estado === 'validada'
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Validada</span>
                      : <button type="button" className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800" onClick={() => validar(e.id)} data-testid={`validar-${e.id}`}>Por validar · validar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'porvalidar' && (
          <div data-testid="panel-porvalidar">
            <p className="text-sm text-tinta-sec mb-3">Solicitudes de inscripción (autoservicio al registrarse) que la Dependencia debe validar.</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-tinta-sec border-b border-borde"><th className="py-2">Razón social (solicitada)</th><th>Tipo</th><th>Posible duplicado</th><th>Acciones</th></tr></thead>
              <tbody>
                {porValidar.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center text-tinta-sec italic" data-testid="porvalidar-vacio">No hay empresas por validar.</td></tr>
                ) : porValidar.map((e) => (
                  <tr key={e.id} className="border-b border-borde" data-testid={`pv-${e.id}`}>
                    <td className="py-2">{e.nombre}</td>
                    <td>{tipoLabel(e.tipo)}</td>
                    <td>{e.posible_duplicado
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">≈ {e.posible_duplicado.nombre}</span>
                      : <span className="text-xs text-tinta-sec">—</span>}</td>
                    <td className="flex gap-2 py-2">
                      {e.posible_duplicado && <button type="button" className="sg-btn-secondary text-xs px-2 py-1" onClick={() => fusionar(e.id, e.posible_duplicado.id)} data-testid={`fusionar-${e.id}`}>Fusionar</button>}
                      <button type="button" className="sg-btn-primary text-xs px-2 py-1" onClick={() => validar(e.id)} data-testid={`pv-validar-${e.id}`}>Validar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'dependencias' && (
          <div data-testid="panel-dependencias">
            <p className="text-sm text-tinta-sec mb-3">Las <strong>dependencias</strong> (entidad pública contratante) no van en el padrón de contratistas; se administran aparte.</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-tinta-sec border-b border-borde"><th className="py-2">Dependencia</th><th className="text-right">Contratos</th></tr></thead>
              <tbody>
                {dependencias.length === 0 ? (
                  <tr><td colSpan={2} className="py-4 text-center text-tinta-sec italic">Sin dependencias.</td></tr>
                ) : dependencias.map((e) => (
                  <tr key={e.id} className="border-b border-borde"><td className="py-2">{e.nombre}</td><td className="text-right">{e.contratos}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
