// The Tailwind Play CDN build, as requested, instead of compiling
// Tailwind at build time.
//
// Play CDN generates classes in the browser by watching the DOM, so the
// theme has to be handed to it as a global before it runs — hence the
// config below rather than tailwind.config.js. It also means there is no
// `content` list to keep in sync: whatever classes end up in the DOM get
// generated, including the per-section gradients in lib/constants.js.
export const TAILWIND_CDN_SRC = "https://cdn.tailwindcss.com";

// Assigned AFTER the CDN script has run — `tailwind` is defined by that
// script, so setting the config before it loads would throw. The guard
// means a blocked CDN degrades to the critical CSS below instead of a
// script error.
export const TAILWIND_CONFIG = `
if (window.tailwind) tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: "#1C1B1A",
        cream: "#F6EFE6",
        clay: "#E07A45",
        clayLight: "#F2B694",
        sand: "#EDE3D3",
        line: "#E4D9C8",
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
html,body{margin:0;background:#F6EFE6;color:#1C1B1A;
font-family:var(--font-body),system-ui,-apple-system,"Segoe UI",sans-serif;
-webkit-font-smoothing:antialiased}
`.trim();
