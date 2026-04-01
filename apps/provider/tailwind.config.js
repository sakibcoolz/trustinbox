/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0b0d0f',
        'bg-secondary': '#111418',
        'bg-tertiary': '#1a1d23',
        'bg-hover': '#1e2228',
        'bg-active': '#252a31',
        'bg-card': '#151820',
        'bg-elevated': '#1c2028',
        'bg-input': '#0d1017',
        'bg-surface': '#10141a',
        'bg-overlay': 'rgba(0,0,0,0.5)',
        'border-primary': '#1e2228',
        'border-secondary': '#2a2f38',
        'border-active': '#3b82f6',
        'border-focus': '#3b82f6',
        'text-primary': '#e4e7eb',
        'text-secondary': '#8b929a',
        'text-muted': '#545b65',
        'text-inverse': '#0b0d0f',
        'text-link': '#3b82f6',
        'accent-blue': '#3b82f6',
        'accent-green': '#22c55e',
        'accent-orange': '#f59e0b',
        'accent-red': '#ef4444',
        'accent-purple': '#a855f7',
        'accent-cyan': '#06b6d4',
        'accent-teal': '#14b8a6',
        'status-success': '#22c55e',
        'status-warning': '#f59e0b',
        'status-error': '#ef4444',
        'status-info': '#3b82f6',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      ringColor: {
        DEFAULT: '#3b82f6',
      },
      ringOffsetColor: {
        DEFAULT: '#0b0d0f',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'toast-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'toast-out': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'modal-in': 'modal-in 150ms ease-out',
        'slide-in-right': 'slide-in-right 250ms ease',
        'fade-in': 'fade-in 100ms ease',
        'toast-in': 'toast-in 200ms ease-out',
        'toast-out': 'toast-out 150ms ease-in',
      },
    },
  },
  plugins: [],
};
