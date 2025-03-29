const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: 8080,
    open: true,
    https: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      // Configure API proxies if needed
      '/api': {
        target: process.env.VUE_APP_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: { '^/api': '' }
      }
    }
  },
  // Prevent source maps in production
  productionSourceMap: process.env.NODE_ENV !== 'production',
  // Configure public path if deploying to a subdirectory
  publicPath: process.env.NODE_ENV === 'production' ? '/' : '/',

  // Add mobile-specific configuration
  pages: {
    index: {
      entry: process.env.VUE_APP_PLATFORM === 'mobile'
        ? 'src/main-mobile.js'
        : 'src/main.ts',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Web3 Crypto Streaming'
    }
  },

  // Optimize chunk splitting for mobile
  chainWebpack: (config) => {
    if (process.env.VUE_APP_PLATFORM === 'mobile') {
      config.optimization.splitChunks({
        chunks: 'all',
        maxSize: 250000, // Smaller chunks for mobile
        cacheGroups: {
          vendors: {
            name: 'chunk-vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            chunks: 'initial'
          },
          common: {
            name: 'chunk-common',
            minChunks: 2,
            priority: -20,
            chunks: 'initial',
            reuseExistingChunk: true
          }
        }
      });
    }
  }
})
