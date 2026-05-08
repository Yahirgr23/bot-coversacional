/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'barber-gold': '#d4af37',
        'barber-dark': '#1a1a1a',
        'barber-gray': '#2a2a2a',
      }
    },
  },
  plugins: [],
}
