import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          foreground: '#fff',
        },
        accent: {
          DEFAULT: '#18181b',
          foreground: '#f4f4f5',
        },
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgb(0 0 0 / 0.1), 0 4px 16px -4px rgb(0 0 0 / 0.1)',
        'soft-lg': '0 4px 16px -4px rgb(0 0 0 / 0.12), 0 8px 32px -8px rgb(0 0 0 / 0.08)',
        'glow': '0 0 24px -4px rgb(59 130 246 / 0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
};

export default config;
