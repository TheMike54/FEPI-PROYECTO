import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast.jsx';
import Layout from './components/layout/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import AltaContrato from './pages/AltaContrato.jsx';
import RegistroFianzas from './pages/RegistroFianzas.jsx';
import AperturaBitacora from './pages/AperturaBitacora.jsx';
import EmisionNotas from './pages/EmisionNotas.jsx';
import ConsultaNotas from './pages/ConsultaNotas.jsx';
import IntegracionEstimacion from './pages/IntegracionEstimacion.jsx';
import RegistroPago from './pages/RegistroPago.jsx';
import ConsultaExpediente from './pages/ConsultaExpediente.jsx';
import HistorialEstimaciones from './pages/HistorialEstimaciones.jsx';
import RevisionEstimacion from './pages/RevisionEstimacion.jsx';
import TransitoPago from './pages/TransitoPago.jsx';

function WithLayout({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<WithLayout><Inicio /></WithLayout>} />
        <Route path="/contratos/alta" element={<WithLayout><AltaContrato /></WithLayout>} />
        <Route path="/contratos/fianzas" element={<WithLayout><RegistroFianzas /></WithLayout>} />
        <Route path="/bitacora/apertura" element={<WithLayout><AperturaBitacora /></WithLayout>} />
        <Route path="/bitacora/notas" element={<WithLayout><EmisionNotas /></WithLayout>} />
        <Route path="/bitacora/consulta" element={<WithLayout><ConsultaNotas /></WithLayout>} />
        <Route path="/estimaciones/integracion" element={<WithLayout><IntegracionEstimacion /></WithLayout>} />
        <Route path="/pagos/registro" element={<WithLayout><RegistroPago /></WithLayout>} />
        <Route path="/contratos/expediente" element={<WithLayout><ConsultaExpediente /></WithLayout>} />
        <Route path="/estimaciones/historial" element={<WithLayout><HistorialEstimaciones /></WithLayout>} />
        <Route path="/estimaciones/revision" element={<WithLayout><RevisionEstimacion /></WithLayout>} />
        <Route path="/pagos/transito" element={<WithLayout><TransitoPago /></WithLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
