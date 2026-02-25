// PostCSS config. If you see "did not pass the from option", it comes from a plugin (e.g. tailwind/autoprefixer) and is safe to ignore.
export default (ctx) => ({
  from: ctx.file ?? undefined,
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
});
