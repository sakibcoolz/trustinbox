/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors via CSS variables
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-hover': 'var(--bg-hover)',
        'bg-active': 'var(--bg-active)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-input': 'var(--bg-input)',
        'bg-bubble-own': 'var(--bg-bubble-own)',
        'bg-bubble-other': 'var(--bg-bubble-other)',
        'border-primary': 'var(--border-primary)',
        'border-secondary': 'var(--border-secondary)',
        'border-active': '#3b82f6',
        'border-hover': 'var(--border-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-inverse': '#ffffff',
        // Accents stay constant across themes
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
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-in-left': 'slide-in-left 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'slide-out-right': 'slide-out-right 0.15s ease-in forwards',
        'fade-in': 'fade-in 0.15s ease-out',
        'pulse-dot': 'pulse-dot 1.4s infinite',
        'typing-bounce': 'typing-bounce 1.4s infinite',
        'slide-up': 'slide-up 0.3s ease-out',
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
