/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#39FF14',
          blue: '#00FFFF',
          pink: '#FF00FF',
        },
      },
    },
  },
  plugins: [],
};
