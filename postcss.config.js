// Tailwind is loaded from the CDN at runtime (see lib/tailwindCdn.js),
// so there is no Tailwind PostCSS step. Autoprefixer still runs over the
// custom CSS in app/globals.css.
module.exports = {
  plugins: {
    autoprefixer: {},
  },
};
