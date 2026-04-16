/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        taula: {
          primary: '#FF5C3A',
          'primary-light': '#FF8A6A',
          'primary-dark': '#D14428',
          bg: '#FAFAF8',
        },
      },
    },
  },
  plugins: [],
};
