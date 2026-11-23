/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C5CFC',
          purpleDark: '#6846EB',
          purpleLight: '#EDE8FD',
          mint: '#00D287',
          mintDark: '#00B775',
          mintLight: '#E6FBF2',
          navy: '#1E1B38',
          slate: '#4A4568',
          muted: '#8E8AAB',
          bg: '#FAFAFD',
          surface: '#FFFFFF',
          border: '#E8E3F2',
          subtle: '#F4EFFB',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(30, 27, 56, 0.05)',
        'card': '0 10px 30px -4px rgba(30, 27, 56, 0.06), 0 2px 8px -2px rgba(30, 27, 56, 0.04)',
        'elevated': '0 20px 40px -8px rgba(30, 27, 56, 0.1), 0 4px 12px -2px rgba(30, 27, 56, 0.04)',
        'mockup': '0 30px 60px -12px rgba(30, 27, 56, 0.25), 0 10px 24px -6px rgba(30, 27, 56, 0.1)',
        'button': '0 6px 18px -2px rgba(124, 92, 252, 0.35)',
        'button-mint': '0 6px 18px -2px rgba(0, 210, 135, 0.35)',
      }
    },
  },
  plugins: [],
}
