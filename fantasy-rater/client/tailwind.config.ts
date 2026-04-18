import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        ui:      ['"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
        serif:   ['"Lora"', 'serif'],
      },
      colors: {
        signal:  '#E8321A',
        ink:     '#F2EFE8',
        muted:   '#8A8A8A',
        dim:     '#555555',
        surface: '#111111',
        border:  '#2A2A2A',
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '6px',
        lg: '8px',
        full: '9999px',
        none: '0',
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
