/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        streakPop: {
          '0%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '45%': { transform: 'scale(1.03)', filter: 'brightness(1.08)' },
          '100%': { transform: 'scale(1)', filter: 'brightness(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-60%)' },
          '100%': { transform: 'translateX(60%)' },
        },
      },
      animation: {
        'streak-pop': 'streakPop 520ms ease-out',
        shimmer: 'shimmer 2.4s ease-in-out infinite',
      },
      colors: {
        surface: {
          DEFAULT: '#12121a',
          card: '#1a1a24',
          elevated: '#22222e',
        },
        accent: {
          DEFAULT: '#22c55e',
          dim: '#16a34a',
        },
      },
    },
  },
  plugins: [],
};
