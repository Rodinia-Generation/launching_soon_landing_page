module.exports = {
  purge: {
    enabled: !process.env.ROLLUP_WATCH,
    mode: 'all',
    content: ['./public/index.html', './src/**/*.svelte'],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      backgroundImage: theme => ({
        'rodinia-factory': "url('/img/rodinia_factory.jpg')",
       })
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
