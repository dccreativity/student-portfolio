/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    // The per-section banner gradients are declared as complete class
    // strings in lib/constants.js, so Tailwind has to scan lib/ too.
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1C1B1A",          // near-black sidebar
        cream: "#F6EFE6",        // warm background
        clay: "#E07A45",         // orange accent from the reference
        clayLight: "#F2B694",
        sand: "#EDE3D3",
        line: "#E4D9C8",
      },
      fontFamily: {
        display: ["var(--font-display)", "'Bricolage Grotesque'", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "'Instrument Sans'", "system-ui", "sans-serif"],
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1) translate(0,0)", opacity: "0.55" },
          "50%": { transform: "scale(1.08) translate(1%, -1%)", opacity: "0.8" },
        },
        breatheSlow: {
          "0%, 100%": { transform: "scale(1.05) translate(0,0)", opacity: "0.4" },
          "50%": { transform: "scale(0.97) translate(-1.5%, 1%)", opacity: "0.65" },
        },
      },
      animation: {
        breathe: "breathe 10s ease-in-out infinite",
        breatheSlow: "breatheSlow 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
