const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: path.resolve(__dirname, 'src', 'index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
    chunkFilename: isProduction ? 'js/[name].[contenthash].chunk.js' : 'js/[name].chunk.js',
    publicPath: '/',
    assetModuleFilename: 'assets/[hash][ext][query]',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        include: path.resolve(__dirname, 'src'),
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            cacheCompression: false,
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: '>0.25%, not dead',
                  useBuiltIns: 'usage',
                  corejs: 3,
                },
              ],
              '@babel/preset-typescript',
              '@babel/preset-react',
            ],
            plugins: [
              isProduction && [
                'babel-plugin-transform-react-remove-prop-types',
                { removeImport: true },
              ],
            ].filter(Boolean),
          },
        },
      },
      {
        test: /\.css$/i,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: !isProduction,
              modules: {
                auto: /\.module\.css$/i,
                localIdentName: isProduction
                  ? '[hash:base64:8]'
                  : '[path][name]__[local]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: !isProduction,
              postcssOptions: {
                plugins: [
                  'postcss-preset-env',
                  isProduction ? 'cssnano' : null,
                ].filter(Boolean),
              },
            },
          },
        ],
      },
      {
        test: /\.(scss|sass)$/i,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              sourceMap: !isProduction,
              modules: {
                auto: /\.module\.(scss|sass)$/i,
                localIdentName: isProduction
                  ? '[hash:base64:8]'
                  : '[path][name]__[local]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: !isProduction,
              postcssOptions: {
                plugins: [
                  'postcss-preset-env',
                  isProduction ? 'cssnano' : null,
                ].filter(Boolean),
              },
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: !isProduction,
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024,
          },
        },
        generator: {
          filename: 'images/[name].[contenthash][ext]',
        },
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash][ext]',
        },
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'media/[name].[contenthash][ext]',
        },
      },
      {
        test: /\.html$/i,
        loader: 'html-loader',
        options: {
          minimize: isProduction,
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public', 'index.html'),
      filename: 'index.html',
      inject: 'body',
      minify: isProduction
        ? {
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
          }
        : false,
    }),
    new MiniCssExtractPlugin({
      filename: isProduction ? 'css/[name].[contenthash].css' : 'css/[name].css',
      chunkFilename: isProduction
        ? 'css/[name].[contenthash].chunk.css'
        : 'css/[name].chunk.css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: path.resolve(__dirname, 'dist'),
          globOptions: {
            ignore: ['**/index.html'],
          },
          noErrorOnMissing: true,
        },
      ],
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(
        isProduction ? 'production' : 'development'
      ),
    }),
  ],
  optimization: {
    minimize: isProduction,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
    runtimeChunk: 'single',
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public'),
    },
    historyApiFallback: true,
    compress: true,
    hot: true,
    port: 3000,
    open: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
  performance: {
    hints: isProduction ? 'warning' : false,
  },
};