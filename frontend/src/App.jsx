import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast.jsx';
import Layout from './components/layout/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import AltaContrato from './pages/AltaContrato.jsx';
import RegistroFianzas from './pages/RegistroFianzas.jsx';
import AperturaBitacora from './pages/AperturaBitacora.jsx';
import EmisionNotas from './pages/EmisionNotas.jsx';

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
