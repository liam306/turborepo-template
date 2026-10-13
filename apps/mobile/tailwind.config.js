/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        fintech: {
          emerald: '#10B981',
          emeraldDark: '#059669',
          emeraldLight: '#D1FAE5',
          accent: '#0D9488',
          darkBg: '#0F172A',
          darkCard: '#1E293B',
          darkBorder: '#334155',
          lightBg: '#F8FAFC',
          lightCard: '#FFFFFF',
          lightBorder: '#E2E8F0',
          danger: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
      },
    },
  },
  plugins: [],
};
