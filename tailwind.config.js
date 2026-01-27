/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        'lenmed-navy': '#1B4681',
        'lenmed-blue': '#54B9E2',
        'lenmed-green': '#A5CC79',
        'lenmed-grey': '#4B4C4D',
      }
    }
  },
  plugins: []
}
