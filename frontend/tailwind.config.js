import plugin from 'tailwindcss/plugin';

/**
 * Tailwind configuration — "Cyber-forest" design tokens.
 *
 *  neon   → healthy forest / live data (emerald)
 *  alert  → deforestation / warnings (red + magenta)
 *  ink    → near-black surfaces (pure black page, charcoal cards)
 *
 * Custom utilities (see plugin at the bottom):
 *  .glass / .glass-alert   glassmorphism surfaces with thin neon border
 *  .hud-corners            sci-fi corner brackets (set --hud to recolor)
 *  .text-glow(-red)        soft neon text shadow
 *  .scanlines              CRT scanline overlay (pseudo-element)
 *  .bg-grid                faint HUD grid background
 *  .scroll-thin            slim neon scrollbar
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          DEFAULT: '#00ff88',
          50: '#e6fff3',
          100: '#b3ffd9',
          200: '#80ffc0',
          300: '#4dffa6',
          400: '#1aff8d',
          500: '#00ff88',
          600: '#00cc6a',
          700: '#00994f',
          800: '#006635',
          900: '#00331a',
        },
        alert: {
          DEFAULT: '#ff2e63',
          red: '#ff2e63',
          magenta: '#ff00aa',
          amber: '#ffb020',
        },
        ink: {
          950: '#000000',
          900: '#040706',
          800: '#080d0b',
          700: '#0d1512',
          600: '#141f1b',
          500: '#1d2b26',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Rajdhani', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(0,255,136,.35), 0 0 18px rgba(0,255,136,.22)',
        'neon-lg': '0 0 0 1px rgba(0,255,136,.45), 0 0 36px rgba(0,255,136,.32)',
        alert: '0 0 0 1px rgba(255,46,99,.5), 0 0 20px rgba(255,46,99,.3)',
      },
      keyframes: {
        blink: { '0%, 49%': { opacity: '1' }, '50%, 100%': { opacity: '0.12' } },
        scan: { '0%': { transform: 'translateY(-10vh)' }, '100%': { transform: 'translateY(110vh)' } },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.82' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.9' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'ping-ring': {
          '0%': { transform: 'scale(0.6)', opacity: '0.8' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        signal: { '0%, 100%': { transform: 'scaleY(0.25)' }, '50%': { transform: 'scaleY(1)' } },
        sweep: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        blink: 'blink 1.1s steps(1, end) infinite',
        scan: 'scan 8s linear infinite',
        flicker: 'flicker 6s infinite',
        'fade-up': 'fade-up 0.6s ease-out both',
        'ping-ring': 'ping-ring 1.8s cubic-bezier(0,0,.2,1) infinite',
        signal: 'signal 1.2s ease-in-out infinite',
        sweep: 'sweep 3s linear infinite',
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities, addComponents }) {
      addComponents({
        '.glass': {
          background: 'linear-gradient(145deg, rgba(12,20,17,.72), rgba(4,7,6,.58))',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          border: '1px solid rgba(0,255,136,.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 12px 40px rgba(0,0,0,.65)',
        },
        '.glass-strong': {
          background: 'linear-gradient(160deg, rgba(10,16,14,.86), rgba(2,4,3,.8))',
          backdropFilter: 'blur(22px) saturate(150%)',
          WebkitBackdropFilter: 'blur(22px) saturate(150%)',
          border: '1px solid rgba(0,255,136,.22)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 20px 80px rgba(0,0,0,.8)',
        },
        '.glass-alert': {
          background: 'linear-gradient(145deg, rgba(30,8,16,.72), rgba(8,3,5,.6))',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          border: '1px solid rgba(255,46,99,.35)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 12px 40px rgba(0,0,0,.65)',
        },
        '.hud-corners': {
          position: 'relative',
          '--hud': '#00ff88',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '-1px',
            pointerEvents: 'none',
            background: [
              'linear-gradient(var(--hud),var(--hud)) top left / 14px 1px no-repeat',
              'linear-gradient(var(--hud),var(--hud)) top left / 1px 14px no-repeat',
              'linear-gradient(var(--hud),var(--hud)) top right / 14px 1px no-repeat',
              'linear-gradient(var(--hud),var(--hud)) top right / 1px 14px no-repeat',
              'linear-gradient(var(--hud),var(--hud)) bottom left / 14px 1px no-repeat',
              'linear-gradient(var(--hud),var(--hud)) bottom left / 1px 14px no-repeat',
              'linear-gradient(var(--hud),var(--hud)) bottom right / 14px 1px no-repeat',
              'linear-gradient(var(--hud),var(--hud)) bottom right / 1px 14px no-repeat',
            ].join(','),
            opacity: '0.9',
          },
        },
        '.scanlines::after': {
          content: '""',
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,.035) 0px, rgba(255,255,255,.035) 1px, transparent 1px, transparent 3px)',
          mixBlendMode: 'overlay',
        },
      });
      addUtilities({
        '.text-glow': { textShadow: '0 0 8px rgba(0,255,136,.65), 0 0 22px rgba(0,255,136,.35)' },
        '.text-glow-red': { textShadow: '0 0 8px rgba(255,46,99,.7), 0 0 22px rgba(255,46,99,.4)' },
        '.bg-grid': {
          backgroundImage:
            'linear-gradient(rgba(0,255,136,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        },
        '.scroll-thin': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,255,136,.45) transparent',
          '&::-webkit-scrollbar': { width: '5px' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(0,255,136,.4)', borderRadius: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
        },
        '.no-select': { userSelect: 'none', WebkitUserSelect: 'none' },
      });
    }),
  ],
};
