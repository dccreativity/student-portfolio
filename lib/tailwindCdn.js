// The Tailwind Play CDN build, as requested, instead of compiling
// Tailwind at build time.
//
// Play CDN generates classes in the browser by watching the DOM, so the
// theme has to be handed to it as a global before it runs — hence the
// config below rather than tailwind.config.js. It also means there is no
// `content` list to keep in sync: whatever classes end up in the DOM get
// generated, including the per-section gradients in lib/constants.js.
export const TAILWIND_CDN_SRC = "https://cdn.tailwindcss.com";

// ---------------------------------------------------------------------
// Palette
//
//   #F4EFFA  haze    page background
//   #C8B1E4  mist    soft surfaces, borders, banner tints
//   #9B72CF  lilac   secondary accent, highlights
//   #532B88  grape   primary accent — buttons, links, focus rings
//   #2F184B  plum    text and dark surfaces, in place of black
//
// The old token names (ink / cream / clay / sand / line) are kept so the
// palette is defined in exactly one place: changing a value here restyles
// every screen at once. `ink` is the darkest purple rather than near
// black, so nothing on the site is actually black.
// ---------------------------------------------------------------------
export const TAILWIND_CONFIG = `
if (window.tailwind) tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: "#2F184B",
        inkDeep: "#1F0F33",
        cream: "#F4EFFA",
        clay: "#532B88",
        clayLight: "#9B72CF",
        sand: "#E9DEF6",
        line: "#DCCDEE",
        plum: "#2F184B",
        grape: "#532B88",
        lilac: "#9B72CF",
        mist: "#C8B1E4",
        haze: "#F4EFFA",
      },
      fontFamily: {
        display: ["var(--font-display)", "'Bricolage Grotesque'", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "'Instrument Sans'", "system-ui", "sans-serif"],
        serif: ["'Times New Roman'", "Times", "serif"],
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1) translate(0,0)", opacity: "0.55" },
          "50%": { transform: "scale(1.12) translate(2%, -2%)", opacity: "0.85" },
        },
        breatheSlow: {
          "0%, 100%": { transform: "scale(1.06) translate(0,0)", opacity: "0.4" },
          "50%": { transform: "scale(0.94) translate(-3%, 2%)", opacity: "0.7" },
        },
      },
      animation: {
        breathe: "breathe 11s ease-in-out infinite",
        breatheSlow: "breatheSlow 15s ease-in-out infinite",
      },
    },
  },
};
`.trim();

// Painted before the CDN script has produced any CSS, so the first frame
// is the site's own background rather than a white flash of unstyled
// markup. Kept deliberately tiny.
export const CRITICAL_CSS = `
html,body{margin:0;background:#F4EFFA;color:#2F184B;
font-family:var(--font-body),system-ui,-apple-system,"Segoe UI",sans-serif;
-webkit-font-smoothing:antialiased}
`.trim();
