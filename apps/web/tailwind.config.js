/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Modern dark chat theme
        'bg-primary': '#0b0d0f',
        'bg-secondary': '#111418',
        'bg-tertiary': '#1a1d23',
        'bg-hover': '#1e2228',
        'bg-active': '#252a31',
        'bg-card': '#151820',
        'bg-elevated': '#1c2028',
        'bg-input': '#0d1017',
        'bg-bubble-own': '#1a3a5c',
        'bg-bubble-other': '#1a1d23',
        'border-primary': '#1e2228',
        'border-secondary': '#2a2f38',
        'border-active': '#3b82f6',
        'border-hover': '#3a3f48',
        'text-primary': '#e4e7eb',
        'text-secondary': '#8b929a',
        'text-muted': '#545b65',
        'text-inverse': '#ffffff',
        'accent-blue': '#3b82f6',
        'accent-green': '#22c55e',
        'accent-orange': '#f59e0b',
        'accent-red': '#ef4444',
        'accent-yellow': '#eab308',
        'accent-purple': '#a855f7',
        'accent-cyan': '#06b6d4',
        'accent-pink': '#ec4899',
        'status-success': '#22c55e',
        'status-warning': '#f59e0b',
        'status-error': '#ef4444',
        'status-info': '#3b82f6',
        'status-online': '#22c55e',
        'status-away': '#f59e0b',
        'status-offline': '#545b65',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        'rail': '4.5rem',
        'panel': '22rem',
      },
      keyframes: {
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'typing-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'slide-in-left': 'slide-in-left 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'slide-out-right': 'slide-out-right 0.15s ease-in forwards',
        'fade-in': 'fade-in 0.15s ease-out',
        'pulse-dot': 'pulse-dot 1.4s infinite',
        'typing-bounce': 'typing-bounce 1.4s infinite',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.15)',
        'elevated': '0 8px 30px rgba(0, 0, 0, 0.4)',
        'panel': '4px 0 16px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
