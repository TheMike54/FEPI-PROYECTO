/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        'sigecop-blue': '#1F4E78',
        'sigecop-blue-light': '#DDEBF7',
        'sigecop-accent': '#2E75B6',
        'sigecop-green-validation': '#0E5E2E',
        'sigecop-green-bg': '#E2EFDA',
        'sigecop-amber-attention': '#B7950B',
        'sigecop-amber-bg': '#FEF9E7'
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};
