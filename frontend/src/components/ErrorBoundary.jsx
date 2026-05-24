import { Component } from 'react';

// Red de seguridad: si una vista lanza un error de runtime, evita la pantalla
// blanca y muestra un fallback amigable con opción de recargar.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log local para depuración. En producción aquí iría telemetría.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-md p-8 max-w-md text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <h1 className="text-xl font-bold text-sigecop-blue mb-2">
              Ocurrió un error al mostrar esta vista
            </h1>
            <p className="text-sm text-slate-600 mb-5">
              La aplicación encontró un problema inesperado. Puedes recargar para
              intentarlo de nuevo.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="sg-btn-primary"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
