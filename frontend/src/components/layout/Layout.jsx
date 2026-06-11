import AppShell from '../ui/AppShell.jsx';

// UI-1 (10-jun): el shell vive en components/ui/AppShell.jsx (barra guinda + filo dorado,
// sidebar claro). Layout se conserva como punto de montaje porque App.jsx (zona congelada)
// lo importa: así el swap de cara no toca el router ni las guardas.
export default function Layout({ children }) {
  return <AppShell>{children}</AppShell>;
}
