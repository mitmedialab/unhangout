"use strict";

var path = require("path")
var webpack = require("webpack")
var BundleTracker = require("webpack-bundle-tracker")
var ExtractTextPlugin = require("extract-text-webpack-plugin")

var root = path.join(__dirname, '..', '..')

module.exports = {
  devtool: 'eval',
  entry: {
    'main': [
      path.join(root, 'static', 'less', 'index.less'),
      path.join(root, 'static', 'js', 'index.js'),
    ],
    'editor': [
      path.join(root, 'static', 'less', 'editor.less'),
      path.join(root, 'static', 'js', 'editor/index.js')
    ]
  },
  output: {
    path: path.join(root, 'static', 'dist'),
    filename: '[name]-[hash].js',
    publicPath: '/static/dist/'
  },
  plugins: [
    new BundleTracker({
      path: path.join(root, 'static'),
      filename: 'webpack-stats-prod.json'
    }),
    new ExtractTextPlugin('[name]-[hash].css')
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
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader!less-loader')
      },
      {test: /\.woff2?(\?v=.*)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
      {test: /\.ttf(\?v=.*)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
      {test: /\.eot(\?v=.*)?$/, loader: "file" },
      {test: /\.svg(\?v=.*)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" },
      {test: /\.otf(\?v=.*)?$/, loader: "url?limit=10000&mimetype=application/font-sfnt" },
    ]
  },
  resolve: {
    // The path wherein we expect modules directories (e.g. node_modules) to reside.
    root: root
  }
};

