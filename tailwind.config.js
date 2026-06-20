/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'game-bg': '#0a0a1a',
        'game-bg-secondary': '#16213e',
        'game-bg-card': '#1a1a2e',
        'game-primary': '#533483',
        'game-secondary': '#0f3460',
        'game-accent': '#8af5c3',
        'game-accent-secondary': '#6be1ff',
        'game-text': '#e0e0ff',
        'game-text-secondary': '#a0a0cc',
        'game-text-muted': '#606080',
        'game-danger': '#ffc2cb',
        'game-warning': '#ffc95c'
      },
      fontFamily: {
        'game': ['SimHei', 'Microsoft YaHei', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scanline': 'scanline 8s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #533483' },
          '100%': { boxShadow: '0 0 20px #533483, 0 0 30px #533483' }
        },
        scanline: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100vh)' }
        }
      }
    }
  },
  plugins: [
    require('tailwindcss-animate')
  ]
}
