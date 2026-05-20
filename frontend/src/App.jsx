import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import AltaContrato from './components/AltaContrato.jsx';
import AperturaBitacora from './components/AperturaBitacora.jsx';

function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-sigecop-blue text-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white text-sigecop-blue flex items-center justify-center font-bold text-xl">
            S
          </div>
          <div>
            <h1 className="text-xl font-bold">SIGECOP</h1>
            <p className="text-sigecop-blue-light text-sm">Sistema de Gestión de Contratos de Obra Pública</p>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="sg-card">
          <h2 className="text-lg font-semibold text-sigecop-blue mb-4">Sprint 0 — Scaffold inicial</h2>
          <p className="text-slate-700 mb-6">
            Este es el esqueleto del proyecto SIGECOP. Las vistas siguientes son maquetas estáticas;
            la lógica se implementa en el Sprint 1.
          </p>
          <nav className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/login" className="block p-4 border border-slate-200 rounded-md hover:border-sigecop-accent transition-colors">
              <div className="text-xs font-semibold text-sigecop-accent uppercase">HU-00</div>
              <div className="font-semibold text-slate-900 mt-1">Login</div>
              <div className="text-sm text-slate-600 mt-1">Acceso al sistema</div>
            </Link>
            <Link to="/alta-contrato" className="block p-4 border border-slate-200 rounded-md hover:border-sigecop-accent transition-colors">
              <div className="text-xs font-semibold text-sigecop-accent uppercase">HU-01</div>
              <div className="font-semibold text-slate-900 mt-1">Alta de contratos</div>
              <div className="text-sm text-slate-600 mt-1">Formulario con 6 tabs</div>
            </Link>
            <Link to="/bitacora" className="block p-4 border border-slate-200 rounded-md hover:border-sigecop-accent transition-colors">
              <div className="text-xs font-semibold text-sigecop-accent uppercase">HU-08</div>
              <div className="font-semibold text-slate-900 mt-1">Apertura de bitácora</div>
              <div className="text-sm text-slate-600 mt-1">Acto formal con 3 partes</div>
            </Link>
          </nav>
        </div>
      </main>
      <footer className="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-500">
        SIGECOP © {new Date().getFullYear()} — UAGRO · Etapa 1
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/alta-contrato" element={<AltaContrato />} />
      <Route path="/bitacora" element={<AperturaBitacora />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
