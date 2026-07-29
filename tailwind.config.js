/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#574A45',
        taupe: '#8a7b73',
        sand: '#c9a177',
        cream: '#f6eee6',
        mist: '#8ca4b3',
      },
    },
  },
  plugins: [],
}
