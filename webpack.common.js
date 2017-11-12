const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    library: 'pwnjs',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    modules: [path.resolve(__dirname, "src"), "node_modules"]
  }
};
