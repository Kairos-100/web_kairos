/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kairos: {
          navy: "#0F1D42",
          light: "#F5F5F5",
          accent: "#3B82F6",
        },
      },
      fontFamily: {
        heading: ["'Space Grotesk'", "sans-serif"],
        body: ["'Rubik'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
