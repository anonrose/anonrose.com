const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')

module.exports = (env) => ({
  mode: env.mode,
  output: {
    filename: 'bundle.js'
  },
  plugins: [new HtmlWebpackPlugin({
    title: 'anonrose',
    favicon: 'src/images/favicon.ico',
    template: 'src/index.html'
  }), new webpack.ProgressPlugin()],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
        loader: 'url-loader',
        options: {
          limit: 10000
        }
      }, {
        test: /\.html$/,
        loader: 'html-loader'
      }
    ]
  }
})