module.exports = {
  // Use plugin name keys so PostCSS resolves packages itself and we avoid
  // interop issues between ESM/CJS when requiring the plugin directly.
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
