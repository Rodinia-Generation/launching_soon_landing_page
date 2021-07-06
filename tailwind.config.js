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
        'rodinia-factory': "url('https://raw.githubusercontent.com/Rodinia-Generation/launching_soon_landing_page/main/public/img/rodinia_factory.jpg?token=ABQYDSSTSXIZ5PW3Q6NBU3TA5VZVQ')",
       })
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
