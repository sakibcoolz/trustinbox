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
        'border-primary': '#1e2228',
        'border-secondary': '#2a2f38',
        'border-active': '#3b82f6',
        'text-primary': '#e4e7eb',
        'text-secondary': '#8b929a',
        'text-muted': '#545b65',
        'accent-blue': '#3b82f6',
        'accent-green': '#22c55e',
        'accent-orange': '#f59e0b',
        'accent-red': '#ef4444',
        'accent-purple': '#a855f7',
        'accent-cyan': '#06b6d4',
        'status-success': '#22c55e',
        'status-warning': '#f59e0b',
        'status-error': '#ef4444',
        'status-info': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
