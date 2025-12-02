/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
  mode: isDevelopment ? "development" : "production",
  entry: {
    main: path.resolve(__dirname, "src", "index.tsx"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: isDevelopment ? "js/[name].js" : "js/[name].[contenthash:8].js",
    chunkFilename: isDevelopment
      ? "js/[name].chunk.js"
      : "js/[name].[contenthash:8].chunk.js",
    publicPath: "/",
    clean: true,
  },
  devtool: isDevelopment ? "eval-source-map" : "source-map",
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        include: path.resolve(__dirname, "src"),
        use: [
          isDevelopment && {
            loader: require.resolve("babel-loader"),
            options: {
              cacheDirectory: true,
              cacheCompression: false,
              presets: [
                [
                  require.resolve("@babel/preset-env"),
                  {
                    targets: "defaults",
                    modules: false,
                  },
                ],
                require.resolve("@babel/preset-react"),
                require.resolve("@babel/preset-typescript"),
              ],
              plugins: [
                isDevelopment && require.resolve("react-refresh/babel"),
              ].filter(Boolean),
            },
          },
          !isDevelopment && {
            loader: require.resolve("ts-loader"),
            options: {
              transpileOnly: true,
            },
          },
        ].filter(Boolean),
      },
      {
        test: /\.css$/i,
        use: [
          isDevelopment ? require.resolve("style-loader") : MiniCssExtractPlugin.loader,
          {
            loader: require.resolve("css-loader"),
            options: {
              importLoaders: 1,
              sourceMap: isDevelopment,
              modules: {
                auto: true,
                localIdentName: isDevelopment
                  ? "[path][name]__[local]"
                  : "[hash:base64:8]",
              },
            },
          },
          {
            loader: require.resolve("postcss-loader"),
            options: {
              postcssOptions: {
                plugins: [
                  require("postcss-preset-env")({
                    stage: 3,
                  }),
                ],
              },
              sourceMap: isDevelopment,
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: "asset",
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024,
          },
        },
        generator: {
          filename: "assets/images/[name].[contenthash:8][ext]",
        },
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/fonts/[name].[contenthash:8][ext]",
        },
      },
      {
        test: /\.(mp4|mp3|wav|ogg)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/media/[name].[contenthash:8][ext]",
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "public", "index.html"),
      filename: "index.html",
      inject: "body",
      minify: isDevelopment
        ? false
        : {
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
          },
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(
        isDevelopment ? "development" : "production"
      ),
    }),
    new ForkTsCheckerWebpackPlugin({
      async: isDevelopment,
      typescript: {
        configFile: path.resolve(__dirname, "tsconfig.json"),
      },
    }),
    !isDevelopment &&
      new MiniCssExtractPlugin({
        filename: "css/[name].[contenthash:8].css",
        chunkFilename: "css/[name].[contenthash:8].chunk.css",
      }),
    isDevelopment && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
  optimization: {
    minimize: !isDevelopment,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: {
            comparisons: false,
          },
          mangle: true,
          output: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },
      },
    },
    runtimeChunk: {
      name: (entrypoint) => `runtime~undefined`,
    },
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, "public"),
    },
    historyApiFallback: true,
    hot: true,
    compress: true,
    port: Number(process.env.PORT) || 3000,
    open: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: "info",
    },
  },
  performance: {
    hints: isDevelopment ? false : "warning",
  },
};