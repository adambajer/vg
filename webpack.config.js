const path = require('path');

module.exports = {
  entry: './index.html', // Adjust this path based on your project structure
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Assuming you're using Babel
        },
      },
    ],
  },
};
