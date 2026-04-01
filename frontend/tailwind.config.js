/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: '#ffd9e8',
        roseMist: '#ffeef5',
        lavender: '#f1e8ff',
        dusk: '#4a3044'
      },
      boxShadow: {
        glow: '0 20px 40px rgba(255, 133, 178, 0.25)'
      }
    },
  },
  plugins: [],
};
