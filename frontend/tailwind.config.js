/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3f9',
          100: '#dce3f1',
          200: '#b9c7e3',
          300: '#8da2cb',
          400: '#6178b0',
          500: '#415a98',
          600: '#334880',
          700: '#2a3a68',
          800: '#243257',
          900: '#1a2744',
          950: '#111a30',
        },
        gold: {
          50: '#fdf9f0',
          100: '#faf0d7',
          200: '#f4ddad',
          300: '#ecc57a',
          400: '#e3a94a',
          500: '#c9a96e',
          600: '#b8892a',
          700: '#9a6e22',
          800: '#7c5820',
          900: '#65481f',
          950: '#3a270e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
};
