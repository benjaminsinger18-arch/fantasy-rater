import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fira Code"', 'monospace'],
        body:    ['"Fira Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        neon: {
          blue:   '#00d4ff',
          green:  '#00ff87',
          purple: '#bf5af2',
          amber:  '#ffd60a',
        },
      },
      keyframes: {
        'mesh-drift': {
          '0%':   { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        'count-up': {
          '0%':   { transform: 'translateY(8px) scale(0.85)', opacity: '0' },
          '60%':  { transform: 'translateY(-2px) scale(1.05)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'verdict-pop': {
          '0%':   { transform: 'scale(0) rotate(-4deg)', opacity: '0' },
          '65%':  { transform: 'scale(1.08) rotate(1deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
      },
      animation: {
        'mesh-drift':  'mesh-drift 25s ease-in-out infinite alternate',
        'count-up':    'count-up 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
        'verdict-pop': 'verdict-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
