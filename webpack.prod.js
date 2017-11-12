const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  output: {
    filename: 'pwn.min.js'
  },
  plugins: [
    new UglifyJSPlugin()
  ]
});
