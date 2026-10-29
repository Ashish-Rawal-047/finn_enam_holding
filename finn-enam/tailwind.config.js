/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Core Forest Green x Warm Cream Fintech Palette
        forest: {
          DEFAULT: '#164E3B',
          light: '#187653',
          dark: '#0E3628',
          subtle: '#E5EEE5',
        },
        emerald: {
          DEFAULT: '#187653',
          light: '#2A9D6F',
          subtle: '#E5EEE5',
        },
        sage: {
          DEFAULT: '#E5EEE5',
          dark: '#D2DEC5',
          subtle: '#F0F5F0',
        },
        cream: {
          DEFAULT: '#F7F3E8',
          light: '#FBF9F3',
          subtle: '#F4EFE2',
          dark: '#EFEBE0',
        },
        ivory: {
          DEFAULT: '#FBF9F3',
          bg: '#F7F3E8',
          surface: '#FFFFFF',
          surfaceSubtle: '#F4EFE2',
          border: '#E7E3D8',
          text: '#18342A',
          textMuted: '#758078',
        },
        ink: {
          DEFAULT: '#18342A',
          muted: '#758078',
          subtle: '#9BA39B',
          light: '#F7F3E8',
          bg: '#0B1B14',
          surface: '#12251D',
          surfaceSubtle: '#183026',
          border: '#213B2E',
          text: '#F7F3E8',
        },
        divider: {
          DEFAULT: '#E7E3D8',
          subtle: '#F0ECE1',
          dark: '#213B2E',
        },
        fin: {
          forest: '#164E3B',
          forestBg: '#E5EEE5',
          amber: '#B97924',
          amberBg: '#FDF6E8',
          amberBgDark: 'rgba(185, 121, 36, 0.15)',
          red: '#B94B48',
          redBg: '#FBEBEB',
          redBgDark: 'rgba(185, 75, 72, 0.15)',
          sky: '#187653',
          skyBg: '#E5EEE5',
        }
      },
      fontFamily: {
        serif: [
          '"DM Serif Display"',
          'Lora',
          'Georgia',
          'Cambria',
          'serif',
        ],
        sans: [
          'Inter',
          'Manrope',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(22, 78, 59, 0.05), 0 1px 2px -1px rgba(22, 78, 59, 0.05)',
        'card': '0 4px 6px -1px rgba(22, 78, 59, 0.04), 0 2px 4px -2px rgba(22, 78, 59, 0.04)',
        'float': '0 10px 25px -5px rgba(22, 78, 59, 0.08), 0 8px 10px -6px rgba(22, 78, 59, 0.05)',
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
