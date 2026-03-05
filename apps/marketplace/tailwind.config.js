/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,css}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Deep indigo brand — primary interface color
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#1E1B4B',
          950: '#0D0A2E',
        },
        // Header navy — darker than the indigo brand (Amazon top-bar equivalent)
        navy: {
          DEFAULT: '#0F0E2A',
          mid:     '#1A1845',
          light:   '#2D2B6B',
        },
        // Amber gold — "Add to Cart" button (Amazon yellow equivalent)
        amber: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        // Orange — "Buy Now" / primary CTA
        cta: {
          DEFAULT: '#F97316',
          hover:   '#EA580C',
          light:   '#FFF7ED',
        },
        // Price color — dark crimson like Amazon's price red
        price: '#B12704',
      },
      boxShadow: {
        card:     '0 2px 8px 0 rgba(0,0,0,.08)',
        'card-hover': '0 8px 28px 0 rgba(0,0,0,.14)',
        header:   '0 2px 8px rgba(0,0,0,.35)',
        buybox:   '0 0 0 2px #4338CA',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'hero-gradient':   'linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #4338CA 100%)',
        'deal-gradient':   'linear-gradient(135deg, #0F0E2A 0%, #1A1845 100%)',
        'amber-gradient':  'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
        'cta-gradient':    'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
      },
      animation: {
        'fade-in':  'fadeIn .25s ease-out',
        'slide-up': 'slideUp .3s ease-out',
        'shimmer':  'shimmer 1.4s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                           to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
