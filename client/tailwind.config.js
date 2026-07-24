/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sena: {
          green: '#00A94F',
          'green-dark': '#007A3D',
          'green-light': '#80D19F',
          black: '#1A1A1A',
          white: '#FFFFFF',
          gray: '#F5F5F5',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
