/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        // UI-1 (reskin "institucional moderno", 10-jun): paleta guinda gob.mx.
        // El dorado es para FILOS/acentos, NO texto sobre blanco.
        guinda: '#691C32',
        'guinda-dark': '#4E1525',
        'guinda-soft': '#F3E9EC',
        dorado: '#BC955C',
        pagina: '#FAFAF8',
        borde: '#ECEAE4',
        'borde-fuerte': '#E2DFD8',
        tinta: '#2C2C2A',
        'tinta-sec': '#888780',
        'tinta-ter': '#B4B2A9',
        exito: '#3B6D11',
        'exito-bg': '#EAF3DE',
        aviso: '#854F0B',
        'aviso-bg': '#FAEEDA',
        peligro: '#A32D2D',
        'peligro-bg': '#FCEBEB',
        // Tokens HISTÓRICOS remapeados a la paleta guinda: re-skinea TODAS las vistas
        // que ya los usan SIN tocar sus archivos (UI-2 queda coherente desde ya y los
        // data-testid/textos no cambian). El nombre se conserva; solo cambia el valor.
        'sigecop-blue': '#691C32',        // antes #1F4E78 (azul) → guinda
        'sigecop-blue-light': '#F3E9EC',  // antes #DDEBF7 → guinda-soft
        'sigecop-accent': '#8A2B44',      // antes #2E75B6 → guinda claro (links/hover/focus)
        'sigecop-green-validation': '#3B6D11', // éxito (texto)
        'sigecop-green-bg': '#EAF3DE',         // éxito (fondo)
        'sigecop-amber-attention': '#854F0B',  // aviso (texto)
        'sigecop-amber-bg': '#FAEEDA'          // aviso (fondo)
      },
      fontFamily: {
        // UI-1: Inter / system sans (pesos 400/500). Mono se conserva para folios/montos.
        sans: ['Inter', 'system-ui', '"Segoe UI"', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      borderRadius: {
        // UI-1: radius md 8 / lg 12 (las clases rounded-md/lg existentes se actualizan solas).
        md: '8px',
        lg: '12px'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out'
      }
    }
  },
  plugins: []
};
