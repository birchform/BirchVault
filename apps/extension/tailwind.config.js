/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(30 10% 8%)',
        foreground: 'hsl(30 10% 95%)',
        primary: {
          DEFAULT: 'hsl(30 50% 55%)',
          foreground: 'hsl(30 10% 5%)',
        },
        muted: {
          DEFAULT: 'hsl(30 10% 15%)',
          foreground: 'hsl(30 10% 55%)',
        },
        border: 'hsl(30 10% 20%)',
        card: 'hsl(30 10% 10%)',
        birch: {
          400: '#c2a88d',
          500: '#b39272',
          600: '#a68063',
        },
      },
    },
  },
  plugins: [],
};







