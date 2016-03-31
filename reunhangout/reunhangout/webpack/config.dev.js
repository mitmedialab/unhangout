"use strict";

var path = require("path")
var webpack = require("webpack")
var BundleTracker = require("webpack-bundle-tracker")
var ExtractTextPlugin = require("extract-text-webpack-plugin")

var root = path.join(__dirname, '..', '..')

module.exports = {
  devtool: 'cheap-source-map',
  entry: {
    'main': [
      'webpack-dev-server/client?http://localhost:3000',
      'webpack/hot/only-dev-server',
      path.join(root, 'static', 'less', 'index.less'),
      path.join(root, 'static', 'js', 'index.js'),
    ],
    'editor': [
      'webpack-dev-server/client?http://localhost:3000',
      'webpack/hot/only-dev-server',
      path.join(root, 'static', 'less', 'editor.less'),
      path.join(root, 'static', 'js', 'editor.js')
    ]
  },
  output: {
    path: path.join(root, 'static', 'bundles'),
    filename: '[name]-[hash].js',
    sourceMapFilename: '[name]-[hash].js.map',
    publicPath: 'http://localhost:3000/static/bundles/',
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new BundleTracker({
      path: path.join(root, 'static'),
      filename: 'webpack-stats.json'
    }),
    //new ExtractTextPlugin('[name]-[hash].css')
  ],
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.less$/,
        loader: 'style-loader!css-loader!less-loader'
      },
      {test: /\.woff2?(\?v=.*)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
      {test: /\.ttf(\?v=.*)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
      {test: /\.eot(\?v=.*)?$/, loader: "file-loader" },
      {test: /\.svg(\?v=.*)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" },
      {test: /\.otf(\?v=.*)?$/, loader: "url?limit=10000&mimetype=application/font-sfnt" },
    ]
  },
  resolve: {
    // The path wherein we expect modules directories (e.g. node_modules) to reside.
    root: root
  }
};
