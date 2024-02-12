const path = require('path')
const packageJson = require('./package.json')

// production config minimizes the code
const productionConfig = {
  mode: 'production',

  // application entry point
  entry: './lib/index.js',

  // Output configuration
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: `sqlitecloud.v${packageJson.version}.js`,
    library: 'sqlitecloud',
    libraryTarget: 'umd',
    globalObject: 'this'
  },

  optimization: {
    minimize: true
  },

  // add mock 'net' module
  // add mock 'tls' module
  resolve: {
    fallback: {
      net: false, // tell Webpack to ignore "net"
      tls: false // tell Webpack to ignore "tls"
    }
  }
}

// development config does not minimize the code
const devConfig = JSON.parse(JSON.stringify(productionConfig))
devConfig.mode = 'development'
devConfig.optimization.minimize = false
devConfig.output.filename = `sqlitecloud.v${packageJson.version}.dev.js`

module.exports = [productionConfig, devConfig]
