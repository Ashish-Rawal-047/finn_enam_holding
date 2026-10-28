/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0A0C10',
          surface: '#11141C',
          surfaceElevated: '#171B26',
          border: '#1F2433',
          borderSubtle: '#181C29',
          muted: '#64748B',
          textMuted: '#94A3B8',
          text: '#F1F5F9',
          heading: '#FFFFFF',
        },
        fin: {
          teal: '#0D9488',
          tealLight: '#14B8A6',
          tealBg: 'rgba(20, 184, 166, 0.10)',
          emerald: '#10B981',
          emeraldLight: '#34D399',
          emeraldBg: 'rgba(16, 185, 129, 0.10)',
          rose: '#F43F5E',
          roseBg: 'rgba(244, 63, 94, 0.10)',
          amber: '#F59E0B',
          amberBg: 'rgba(245, 158, 11, 0.10)',
          sky: '#0EA5E9',
          skyBg: 'rgba(14, 165, 233, 0.10)',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      },
    },
  },
  plugins: [],
};
