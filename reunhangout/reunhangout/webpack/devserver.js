var webpack = require('webpack')
var WebpackDevServer = require('webpack-dev-server')
var config = require('./config.dev.js')

new WebpackDevServer(webpack(config), {
  publicPath: config.output.publicPath,
  hot: true,
  inline: true,
  historyApiFallback: true,
  noInfo: true
}).listen(3000, '0.0.0', function(err, result) {
  if (err) {
    console.log(err);
  }
  console.log('Listening at http://localhost:3000')
});
