/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: { DEFAULT: '#0B0F1A', 2: '#121826', 3: '#1A2233' },
        amber: { DEFAULT: '#F2A93B', dark: '#D98E1F', light: '#FBCE85' },
        teal: { DEFAULT: '#1E7F72', dark: '#155A51', light: '#3FB3A3' },
        cream: '#F7F4EC',
        slate: { DEFAULT: '#8890A0', dim: '#5B6472' },
        danger: '#E15554',
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
