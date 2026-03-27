/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#1e1e1e',
        'bg-secondary': '#252526',
        'bg-tertiary': '#2d2d2d',
        'bg-hover': '#2a2d2e',
        'bg-active': '#37373d',
        'border-primary': '#3e3e42',
        'border-active': '#007acc',
        'text-primary': '#cccccc',
        'text-secondary': '#969696',
        'text-muted': '#6a6a6a',
        'accent-blue': '#007acc',
        'accent-green': '#4ec9b0',
        'accent-orange': '#ce9178',
        'accent-red': '#f44747',
        'accent-yellow': '#dcdcaa',
        'accent-purple': '#c586c0',
        'status-success': '#4ec9b0',
        'status-warning': '#cca700',
        'status-error': '#f44747',
        'status-info': '#3794ff',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
