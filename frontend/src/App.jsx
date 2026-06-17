import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast.jsx';
import { SesionProvider, useSesion } from './context/SesionContext.jsx';
import { nivelDe } from './data/permisos.js';
import { historiasUsuario } from './data/dummy.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Layout from './components/layout/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import AltaContrato from './pages/AltaContrato.jsx';
import RegistroFianzas from './pages/RegistroFianzas.jsx';
import AperturaBitacora from './pages/AperturaBitacora.jsx';
import PorFirmar from './pages/PorFirmar.jsx';
import EmisionNotas from './pages/EmisionNotas.jsx';
import ConsultaNotas from './pages/ConsultaNotas.jsx';
import IntegracionEstimacion from './pages/IntegracionEstimacion.jsx';
import RegistroPago from './pages/RegistroPago.jsx';
import ConsultaExpediente from './pages/ConsultaExpediente.jsx';
import HistorialEstimaciones from './pages/HistorialEstimaciones.jsx';
import RevisionEstimacion from './pages/RevisionEstimacion.jsx';
import TransitoPago from './pages/TransitoPago.jsx';
import SeleccionRol from './pages/SeleccionRol.jsx';
import SolicitudRegistro from './pages/SolicitudRegistro.jsx';
import SolicitudesRegistro from './pages/SolicitudesRegistro.jsx';
import ConveniosModificatorios from './pages/ConveniosModificatorios.jsx';
import AlertasAtraso from './pages/AlertasAtraso.jsx';
import CurvaAvance from './pages/CurvaAvance.jsx';
import TrabajosTerminados from './pages/TrabajosTerminados.jsx';
import MinutasVisitas from './pages/MinutasVisitas.jsx';
import EnvioEstimacion from './pages/EnvioEstimacion.jsx';
import ReingresoEstimacion from './pages/ReingresoEstimacion.jsx';
import TableroEstimaciones from './pages/TableroEstimaciones.jsx';
import PortafolioEjecutivo from './pages/PortafolioEjecutivo.jsx';
import ExportacionReportes from './pages/ExportacionReportes.jsx';
import RosterContrato from './pages/RosterContrato.jsx';
import Finiquito from './pages/Finiquito.jsx';  // HU-24 (FASE 4): finiquito y cierre del contrato
import AmbienteEstimacion from './pages/AmbienteEstimacion.jsx';  // FASE 5: ambiente de estimación por bloques (cascarón)
import AmbienteBitacora from './pages/AmbienteBitacora.jsx';  // BLOQUE B: ambiente de bitácora por bloques (cascarón, fuera del catálogo)
import AmbienteExpediente from './pages/AmbienteExpediente.jsx';  // BLOQUE B: ambiente de expediente y reportes (cierre documental, cascarón)
import AmbientePago from './pages/AmbientePago.jsx';  // BLOQUE B: ambiente de pago (ciclo de cobro, cascarón)
import AmbienteFiniquito from './pages/AmbienteFiniquito.jsx';  // BLOQUE B: ambiente de cierre (finiquito por bloques, cascarón que delega a HU-24)
import AmbienteConvenio from './pages/AmbienteConvenio.jsx';  // BLOQUE B: ambiente de convenio modificatorio (cascarón episódico)
import AmbienteAvance from './pages/AmbienteAvance.jsx';  // BLOQUE B: ambiente de avance físico y seguimiento (cascarón)
import CicloVidaContrato from './pages/CicloVidaContrato.jsx';  // BLOQUE B: MACRO ciclo de vida del contrato (índice ordenado, al final)
import EmpresasPadron from './pages/EmpresasPadron.jsx';  // PLAN GRANDE BLOQUE 1: administración del padrón de empresas (solo dependencia)

// Mapa ruta -> código de HU (excluye HU-00, que es login/dashboard). Permite que la
// guarda de ruta sepa qué HU corresponde a cada path para validar el acceso por rol.
const HU_POR_RUTA = Object.fromEntries(
  historiasUsuario.filter((h) => h.codigo !== 'HU-00').map((h) => [h.ruta, h.codigo])
);

// Envuelve con Layout. Dos guardas de acceso:
//  1) SIN rol (login real o demo) -> selector de login/registro/demo (HU-00). Nunca
//     se entra "sin rol" a ejecutar todo; aplica en AMBOS modos (proyecto y aplicación).
//  2) Con rol, si la HU de esta ruta NO es accesible para el rol (nivel null) -> al
//     inicio. El control por rol también bloquea el DEEP-LINK, no solo oculta el menú.
function WithLayout({ children }) {
  const { rol } = useSesion();
  const { pathname } = useLocation();
  if (!rol) return <SeleccionRol />;
  const hu = HU_POR_RUTA[pathname];
  if (hu && nivelDe(hu, rol) === null) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

// Rutas sin HU del catálogo (bandeja de firmas, administración) acotadas por rol.
// Sin rol -> selector; rol no permitido -> al inicio.
function SoloRol({ roles, children }) {
  const { rol } = useSesion();
  if (!rol) return <SeleccionRol />;
  if (!roles.includes(rol)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <SesionProvider>
      <ToastProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<WithLayout><Inicio /></WithLayout>} />
            <Route path="/contratos/alta" element={<WithLayout><AltaContrato /></WithLayout>} />
            <Route path="/contratos/fianzas" element={<WithLayout><RegistroFianzas /></WithLayout>} />
            <Route path="/bitacora/apertura" element={<WithLayout><AperturaBitacora /></WithLayout>} />
            <Route path="/bitacora/por-firmar" element={<SoloRol roles={['residente', 'contratista', 'supervision']}><PorFirmar /></SoloRol>} />
            <Route path="/bitacora/notas" element={<WithLayout><EmisionNotas /></WithLayout>} />
            <Route path="/bitacora/consulta" element={<WithLayout><ConsultaNotas /></WithLayout>} />
            <Route path="/bitacora/minutas" element={<WithLayout><MinutasVisitas /></WithLayout>} />
            <Route path="/estimaciones/integracion" element={<WithLayout><IntegracionEstimacion /></WithLayout>} />
            <Route path="/estimaciones/envio" element={<WithLayout><EnvioEstimacion /></WithLayout>} />
            <Route path="/estimaciones/reingreso" element={<WithLayout><ReingresoEstimacion /></WithLayout>} />
            <Route path="/estimaciones/tablero" element={<WithLayout><TableroEstimaciones /></WithLayout>} />
            <Route path="/portafolio" element={<WithLayout><PortafolioEjecutivo /></WithLayout>} />
            <Route path="/reportes" element={<WithLayout><ExportacionReportes /></WithLayout>} />
            <Route path="/pagos/registro" element={<WithLayout><RegistroPago /></WithLayout>} />
            <Route path="/contratos/expediente" element={<WithLayout><ConsultaExpediente /></WithLayout>} />
            <Route path="/estimaciones/historial" element={<WithLayout><HistorialEstimaciones /></WithLayout>} />
            <Route path="/estimaciones/revision" element={<WithLayout><RevisionEstimacion /></WithLayout>} />
            <Route path="/pagos/transito" element={<WithLayout><TransitoPago /></WithLayout>} />
            <Route path="/contratos/modificatorios" element={<WithLayout><ConveniosModificatorios /></WithLayout>} />
            {/* HU-24 (FASE 4): finiquito y cierre del contrato. Fuera del catálogo de HU (como el roster/
                solicitudes): SoloRol dependencia/residente; la autoridad real la revalida el backend. */}
            <Route path="/contratos/finiquito" element={<SoloRol roles={['dependencia', 'residente']}><Finiquito /></SoloRol>} />
            {/* FASE 5: ambiente de estimación por bloques (cascarón que envuelve el flujo existente).
                Fuera del catálogo de HU; SoloRol con los roles del ciclo de estimación (HU-12). */}
            <Route path="/estimaciones/ambiente" element={<SoloRol roles={['contratista', 'residente', 'supervision']}><AmbienteEstimacion /></SoloRol>} />
            {/* BLOQUE B: ambiente de bitácora por bloques (cascarón que encadena apertura→firma→notas→
                consulta→minutas, sin fundir las HU). Fuera del catálogo de HU (no altera permisos.js);
                roles de la bitácora. */}
            <Route path="/bitacora/ambiente" element={<SoloRol roles={['residente', 'contratista', 'supervision']}><AmbienteBitacora /></SoloRol>} />
            {/* BLOQUE B: ambiente de expediente y reportes (cierre documental). Encadena HU-04 + HU-19 sin
                fundirlas. Roles que ven expediente Y reportes (finanzas fuera: solo tiene reportes). */}
            <Route path="/contratos/expediente-ambiente" element={<SoloRol roles={['residente', 'contratista', 'supervision', 'dependencia']}><AmbienteExpediente /></SoloRol>} />
            {/* BLOQUE B: ambiente de pago (ciclo de cobro). Envuelve HU-20/HU-21 sin fundirlas. Roles de
                HU-20/HU-21 (supervisión excluida: null en ambas). */}
            <Route path="/pagos/ambiente" element={<SoloRol roles={['finanzas', 'contratista', 'residente', 'dependencia']}><AmbientePago /></SoloRol>} />
            {/* BLOQUE B: ambiente de cierre (finiquito por bloques). Envuelve HU-24 sin fundirla y delega el
                cierre a /contratos/finiquito. Roles de HU-24 (dependencia/residente). */}
            <Route path="/contratos/cierre" element={<SoloRol roles={['dependencia', 'residente']}><AmbienteFiniquito /></SoloRol>} />
            {/* BLOQUE B: ambiente de convenio modificatorio (episódico). Envuelve HU-03 + oficio + HU-04
                sin fundirlas. Roles que participan del convenio. */}
            <Route path="/contratos/convenio-ambiente" element={<SoloRol roles={['dependencia', 'residente', 'contratista', 'supervision']}><AmbienteConvenio /></SoloRol>} />
            {/* BLOQUE B: ambiente de avance físico y seguimiento. Encadena HU-06→HU-05→HU-07 sin fundirlas.
                Ejecutores + supervisión (dependencia, con 'C' en HU-05, queda fuera por decisión). */}
            <Route path="/seguimiento/ambiente" element={<SoloRol roles={['contratista', 'residente', 'supervision']}><AmbienteAvance /></SoloRol>} />
            {/* BLOQUE B: MACRO ciclo de vida del contrato (índice ordenado, enlaza a todas las HU y sub-
                ambientes sin fundirlas). Finanzas excluida (su pago se muestra informativo). */}
            <Route path="/contratos/ciclo-vida" element={<SoloRol roles={['residente', 'contratista', 'supervision', 'dependencia']}><CicloVidaContrato /></SoloRol>} />
            {/* PLAN GRANDE BLOQUE 1: administración del padrón de empresas. Solo la Dependencia (art. 43 RLOPSRM). */}
            <Route path="/admin/empresas" element={<SoloRol roles={['dependencia']}><EmpresasPadron /></SoloRol>} />
            <Route path="/seguimiento/alertas" element={<WithLayout><AlertasAtraso /></WithLayout>} />
            <Route path="/seguimiento/curva-avance" element={<WithLayout><CurvaAvance /></WithLayout>} />
            <Route path="/seguimiento/trabajos-terminados" element={<WithLayout><TrabajosTerminados /></WithLayout>} />
            {/* alta-v2 (4.3): registro de acceso PÚBLICO (sin login). Usa el backend real
                POST /auth/register. Reemplaza la antigua ruta envuelta en SoloModoProyecto. */}
            <Route path="/solicitud-acceso" element={<SolicitudRegistro />} />
            <Route path="/usuarios/solicitudes" element={<SoloRol roles={['dependencia']}><SolicitudesRegistro /></SoloRol>} />
            {/* Pasada F (Fundación): sustitución de personas del roster (art. 125 fr. I g). Fuera del
                catálogo de HU (como por-firmar/solicitudes) para no alterar permisos.js ni el conteo. */}
            <Route path="/contratos/roster" element={<SoloRol roles={['dependencia', 'residente']}><RosterContrato /></SoloRol>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </ToastProvider>
    </SesionProvider>
  );
}
