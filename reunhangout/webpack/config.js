"use strict";

var path = require("path")
var webpack = require("webpack")
var BundleTracker = require("webpack-bundle-tracker")
var ExtractTextPlugin = require("extract-text-webpack-plugin")

var root = path.join(__dirname, '..')

var postcssLoader = {loader: 'postcss-loader', options: {
    config: {path: path.join(__dirname, 'postcss.config.js')}
}};
var cssLoader = {loader: 'css-loader', options: { importLoaders: 1 }};
var urlLoader = (ext, mimetype) => {
  return {
    test: new RegExp(`\.${ext}(\\?v=.*)?$`),
    loader: `url-loader?limit=10000&mimetype=${mimetype}`
  }
}

var clearNulls = arr => arr.filter(a => a !== null);


module.exports.buildConfig = (isProd) => ({
  devtool: isProd ? 'cheap-module-source-map' : 'cheap-source-map',
  entry: {
    'main': clearNulls([
      isProd ? null : 'webpack-dev-server/client?http://localhost:3000',
      isProd ? null : 'webpack/hot/only-dev-server',
      path.join(root, 'static', 'scss', 'index.scss'),
      path.join(root, 'static', 'js', 'index.js'),
    ]),
    'editor': clearNulls([
      isProd ? null : 'webpack-dev-server/client?http://localhost:3000',
      isProd ? null : 'webpack/hot/only-dev-server',
      path.join(root, 'richtext', 'static', 'richtext', 'editor.scss'),
      path.join(root, 'richtext', 'static', 'richtext', 'editor.js'),
    ]),
    'frontend': clearNulls([
      isProd ? null : 'webpack-dev-server/client?http://localhost:3000',
      isProd ? null : 'webpack/hot/only-dev-server',
      path.join(root, 'static', 'scss', 'frontend.scss'),
      path.join(root, 'static', 'js', 'frontend.js'),
    ]),
  },
  output: {
    path: path.join(root, 'static', isProd ? 'tmp' : 'dev'),
    filename: '[name]-[hash].js',
    sourceMapFilename: '[name]-[hash].js.map',
    publicPath: (
      isProd ?  '/static/dist/' : 'http://localhost:8000/static/dev/'
    )
  },
  plugins: clearNulls([
    // Set NODE_ENV=production on prod.
    isProd ? new webpack.DefinePlugin({
      'process.env': { 'NODE_ENV': JSON.stringify('production') }}
    ) : null,
    isProd ? new webpack.optimize.UglifyJsPlugin() : null,
    // Dev helpers.
    isProd ? null : new webpack.HotModuleReplacementPlugin(),
    isProd ? null : new webpack.NamedModulesPlugin(),
    isProd ? null : new webpack.NoEmitOnErrorsPlugin(),
    // Export stats bundle for Django to track for recompilation.
    new BundleTracker({
      path: path.join(root, 'static', isProd ? 'tmp' : 'dev'),
      filename: 'webpack-stats.json'
    }),
    // Extract css in prod.
    isProd ? new ExtractTextPlugin('[name]-[hash].css') : null,
  ]),
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.scss/,
        use: ['style-loader', cssLoader, postcssLoader, 'sass-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', cssLoader, postcssLoader],
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      urlLoader("woff2", "application/font-woff2"),
      urlLoader("woff", "application/font-woff"),
      urlLoader("ttf", "application/x-font-ttf"),
      urlLoader("eot", "application/vnd.ms-fontobject"),
      urlLoader("svg", "image/svg+xml"),
      urlLoader("otf", "application/x-font-opentype"),
    ]
  },
  resolve: {
    // The path wherein we expect modules directories (e.g. node_modules) to reside.
    modules: [path.join(root, "node_modules")],
    alias: {Bluebird: "Promise"}
  }
})
