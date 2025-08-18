import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#e6e7ea',
        panel: '#111316',
        panel2: '#0c0e10',
      }
    },
  },
  plugins: [],
} satisfies Config
