/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15171a',
        graphite: '#3b3f45',
        steel: '#5f656c',
        mist: '#e2e5e8',
        paper: '#f3f4f5',
        accent: '#d9531e',
      },
      fontFamily: {
        sans: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
