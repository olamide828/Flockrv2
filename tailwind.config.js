/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './resources/**/*.{js,jsx,ts,tsx,php,blade.php}',
    './resources/views/**/*.blade.php',
  ],
  theme: {
    extend: {
      colors: {
        flockr: {
          black:   '#0a0a0a',
          surface: '#111111',
          card:    '#1a1a1a',
          orange:  '#ff5c00',
          amber:   '#ffb300',
          green:   '#00d97e',
          red:     '#ff3b5c',
          text:    '#f5f5f5',
          muted:   '#888888',
          subtle:  '#444444',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        'flockr': '12px',
        'flockr-lg': '20px',
      },
      boxShadow: {
        'orange-glow': '0 0 20px rgba(255,92,0,0.35), 0 0 60px rgba(255,92,0,0.15)',
        'card': '0 16px 40px rgba(0,0,0,0.4)',
      },
      animation: {
        'slide-up':  'slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in':   'fade-in 0.3s ease forwards',
        'heart-pop': 'heart-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'shimmer':   'shimmer 1.5s infinite',
        'ping-ring': 'ping-ring 2s ease-out infinite',
      },
      keyframes: {
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'heart-pop': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.4)' },
          '70%':  { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'ping-ring': {
          '0%':   { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}
