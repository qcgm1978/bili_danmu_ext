const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    popup: './src/popup.jsx',
    content: './content.js',
    background: './background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'popup.html', to: '.' },
        { from: 'icons', to: 'icons' },
        { from: 'privacy_policy.md', to: '.' },
        { from: 'publish_guide.md', to: '.' },
        { from: 'public_key_guide.md', to: '.' },
        { from: 'privacy_policy_setup_guide.md', to: '.' },
        { from: 'contact_email_setup_guide.md', to: '.' },
        { from: 'lib', to: 'lib' }
      ]
    })
  ]
};