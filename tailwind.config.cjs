/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Asegúrate de tener la fuente en index.html (abajo lo pongo)
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Tokens de color (inspirado en Firebase/Google)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // principal
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          // superficies “tarjeta” claras
          0: '#ffffff',
          50: '#f9fafb',
          100: '#f3f4f6',
        },
        // Estados estándar
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.2rem',
      },
      boxShadow: {
        // sombras suaves tipo Material
        'elev-1': '0 1px 2px rgba(0,0,0,.06), 0 1px 1px rgba(0,0,0,.04)',
        'elev-2': '0 2px 6px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.06)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // inputs bonitos/coherentes
  ],
};
