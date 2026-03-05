/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        cosmos: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      boxShadow: {
        card:        '0 1px 3px 0 rgba(0,0,0,0.04), 0 4px 16px 0 rgba(0,0,0,0.06)',
        'card-hover':'0 4px 8px -1px rgba(0,0,0,0.07), 0 12px 32px -4px rgba(0,0,0,0.10)',
        glow:        '0 0 24px rgba(99,102,241,0.30)',
        'glow-sm':   '0 0 12px rgba(99,102,241,0.20)',
        topbar:      '0 1px 0 rgba(0,0,0,0.05), 0 2px 12px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      backgroundImage: {
        'cosmos-gradient':  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'emerald-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'amber-gradient':   'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'rose-gradient':    'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
        'sky-gradient':     'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        'violet-gradient':  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'float':     'float 6s ease-in-out infinite',
        'orb':       'orb 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        float:   { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        orb:     { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '33%': { transform: 'translate(30px,-20px) scale(1.05)' }, '66%': { transform: 'translate(-20px,15px) scale(0.95)' } },
      },
    },
  },
  plugins: [],
};
