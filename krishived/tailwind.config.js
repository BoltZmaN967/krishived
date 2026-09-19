/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canopy: {
          50: '#eef4f0',
          100: '#d7e6dc',
          200: '#adccba',
          300: '#7fb096',
          400: '#4c8d6c',
          500: '#2f6e4f',
          600: '#1f4d3a',
          700: '#193f2f',
          800: '#143226',
          900: '#0f261c',
        },
        turmeric: {
          50: '#fdf6e7',
          100: '#f9e8bd',
          200: '#f2d287',
          300: '#e9b954',
          400: '#d9a441',
          500: '#c08c2e',
          600: '#976c23',
        },
        soil: {
          50: '#faf9f5',
          100: '#f2efe4',
          200: '#e4e1d8',
          300: '#cfc9b8',
          400: '#a89d84',
        },
        alert: {
          low: '#2f6e4f',
          moderate: '#c08c2e',
          high: '#c1442d',
          critical: '#7a1f13',
        },
        ink: '#1a1d18',
      },
      fontFamily: {
        display: ['"Manrope"', 'sans-serif'],
        body: ['"Source Sans 3"', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 38, 28, 0.06), 0 6px 16px -8px rgba(15, 38, 28, 0.12)',
      },
    },
  },
  plugins: [],
};
