/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          dark: '#0f172a',
          card: '#1e293b',
          neonCyan: '#06b6d4',
          neonPink: '#ec4899',
          neonAmber: '#f59e0b',
          neonGreen: '#10b981',
          accent: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
}
