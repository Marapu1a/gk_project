// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        white: '#FFFFFF',
        green: {
          light: '#D6EF8B',
          brand: '#A5CB37',
          dark: '#88B824',
          darker: '#75AD14',
          DEFAULT: '#A5CB37',
        },
        blue: {
          dark: '#1F305E',
          darker: '#070022',
        },
        black: '#000000',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
