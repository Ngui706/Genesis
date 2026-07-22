/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: { DEFAULT: 'rgb(var(--theme-midnight) / <alpha-value>)', 2: 'rgb(var(--theme-midnight-2) / <alpha-value>)', 3: 'rgb(var(--theme-midnight-3) / <alpha-value>)' },
        amber: { DEFAULT: 'rgb(var(--theme-primary) / <alpha-value>)', dark: 'rgb(var(--theme-primary-dark) / <alpha-value>)', light: 'rgb(var(--theme-primary-light) / <alpha-value>)' },
        teal: { DEFAULT: 'rgb(var(--theme-teal) / <alpha-value>)', dark: 'rgb(var(--theme-teal-dark) / <alpha-value>)', light: 'rgb(var(--theme-teal-light) / <alpha-value>)' },
        cream: 'rgb(var(--theme-cream) / <alpha-value>)',
        slate: { DEFAULT: 'rgb(var(--theme-slate) / <alpha-value>)', dim: 'rgb(var(--theme-slate-dim) / <alpha-value>)' },
        danger: 'rgb(var(--theme-danger) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'route-dashes': 'repeating-linear-gradient(90deg, currentColor 0 16px, transparent 16px 28px)',
      },
      keyframes: {
        drive: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(calc(100% - 28px))' },
        },
        heroFade: {
          '0%, 100%': { opacity: 0 },
          '8%, 25%': { opacity: 1 },
        },
        riseIn: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        drive: 'drive 3.2s linear infinite alternate',
        riseIn: 'riseIn 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
