/** @type {import('tailwindcss').Config} */

/*
 * FINN design tokens.
 * Identity: warm paper neutrals + a muted, refined forest green used sparingly for
 * selection, primary actions and positive movement. Dark mode has its own steps (not an
 * inversion) tuned for the deep-forest surface.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#236B52', // primary green
          light: '#397E65', // hover / secondary green
          dark: '#183D32', // deep forest (headline ink on light)
          subtle: '#E6EFE8',
        },
        // Accent green on dark surfaces (and legacy `emerald` utilities).
        emerald: {
          DEFAULT: '#6DBE96',
          light: '#8ACFAC',
          subtle: '#1B3A2E',
        },
        sage: {
          DEFAULT: '#E6EFE8',
          dark: '#D3E2D7',
          subtle: '#F1F6F2',
        },
        cream: {
          DEFAULT: '#F7F5ED', // app background
          light: '#FBFAF5',
          subtle: '#F3F1E8',
          dark: '#F0EEE5', // secondary background
        },
        paper: {
          DEFAULT: '#FFFEFA', // card surface
        },
        ink: {
          DEFAULT: '#203C34', // primary text
          muted: '#7A8780', // secondary text
          subtle: '#A2ACA5', // tertiary text / placeholders
          light: '#EEF1EA',
          // dark-mode surfaces
          bg: '#0E1B16',
          surface: '#14251E',
          surfaceSubtle: '#1A2E26',
          border: '#253B32',
          text: '#EEF1EA',
        },
        divider: {
          DEFAULT: '#E7E4DA',
          subtle: '#EFECE3',
          dark: '#253B32',
        },
        fin: {
          up: '#25835D',
          upBg: '#E8F3EC',
          red: '#C85B57',
          redBg: '#FAEDEC',
          redBgDark: 'rgba(200, 91, 87, 0.14)',
          amber: '#B98032',
          amberBg: '#FAF2E3',
          amberBgDark: 'rgba(200, 138, 53, 0.14)',
          forest: '#236B52',
          forestBg: '#E6EFE8',
          sky: '#236B52',
          skyBg: '#E6EFE8',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10.5px', { lineHeight: '14px' }],
      },
      letterSpacing: {
        eyebrow: '0.14em',
        tightest: '-0.025em',
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        subtle: '0 1px 0 0 rgba(32, 60, 52, 0.03)',
        card: '0 1px 2px rgba(32, 60, 52, 0.04), 0 4px 12px -6px rgba(32, 60, 52, 0.06)',
        lift: '0 2px 4px rgba(32, 60, 52, 0.04), 0 12px 24px -12px rgba(32, 60, 52, 0.14)',
        float: '0 -1px 0 rgba(32, 60, 52, 0.04), 0 -8px 24px -12px rgba(32, 60, 52, 0.10)',
        sheet: '0 24px 48px -16px rgba(14, 27, 22, 0.28)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
    // FINN is a phone app at every viewport: on wide screens it renders in a centred, phone-width
    // frame (AppShell), so window-width breakpoints (sm/md/lg/xl) would switch on desktop layouts
    // inside a phone-sized surface. Only `xs` remains, for very narrow phones (< 375px).
    screens: {
      xs: '375px',
    },
  },
  plugins: [],
};
