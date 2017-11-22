"use strict";

var path = require("path")
var webpack = require("webpack")
var BundleTracker = require("webpack-bundle-tracker")
var ExtractTextPlugin = require("extract-text-webpack-plugin")
var autoprefixer = require('autoprefixer')

var root = path.join(__dirname, '..', '..')

module.exports = {
  devtool: 'cheap-source-map',
  entry: {
    'main': [
      'webpack-dev-server/client?http://localhost:3000',
      'webpack/hot/only-dev-server',
      path.join(root, 'static', 'scss', 'index.scss'),
      path.join(root, 'static', 'js', 'index.js'),
    ],
    'editor': [
      'webpack-dev-server/client?http://localhost:3000',
      'webpack/hot/only-dev-server',
      path.join(root, 'richtext', 'static', 'richtext', 'editor.scss'),
      path.join(root, 'richtext', 'static', 'richtext', 'editor.js')
    ],
    'frontend': [
      path.join(root, 'static', 'scss', 'frontend.scss'),
      path.join(root, 'static', 'js', 'frontend.js'),
    ],
  },
  output: {
    path: path.join(root, 'static', 'dev'),
    filename: '[name]-[hash].js',
    sourceMapFilename: '[name]-[hash].js.map',
    publicPath: 'http://localhost:3000/static/dev/',
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new BundleTracker({
      path: path.join(root, 'static', 'dev'),
      filename: 'webpack-stats.json'
    }),
    //new ExtractTextPlugin('[name]-[hash].css')
  ],
  module: {
    loaders: [
      {
        test: /react-selectize\/themes\/index.css$/,
        loader: 'style-loader!css-loader',
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.scss$/,
        loader: 'style-loader!css-loader!postcss-loader!sass-loader'
      },
      {
        test: /\.css$/,
        exclude: /react-selectize\/themes\/index.css$/,
        loader: 'style-loader!css-loader!postcss-loader'
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {test: /\.woff2?(\?v=.*)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
      {test: /\.ttf(\?v=.*)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
      {test: /\.eot(\?v=.*)?$/, loader: "file-loader" },
      {test: /\.svg(\?v=.*)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" },
      {test: /\.otf(\?v=.*)?$/, loader: "url?limit=10000&mimetype=application/font-sfnt" },
    ]
  },
  postcss: function() {
    return [autoprefixer];
  },
  resolve: {
    // The path wherein we expect modules directories (e.g. node_modules) to reside.
    root: root,
    alias: {Bluebird: "Promise"}
  }
};
