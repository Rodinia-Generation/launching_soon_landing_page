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
        'rodinia-factory1': "url('../img/rodinia_factory1.jpg')",
        'rodinia-factory2': "url('../img/rodinia_factory2.png')",
        'rodinia-factory3': "url('../img/rodinia_factory3.png')",
       }),
      colors: {
        'rg-barely-blue': '#DCDFDE',
        'rg-lunar-rock': '#C5C5C5',
        'rg-ice-flow': '#C5D1D1',
        'rg-milky-blue-light': '#80B0C0',
        'rg-milky-blue': '#72A8BA'
      }
    }
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
