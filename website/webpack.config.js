const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    mode: 'development',
    entry: './src/app.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'public')
    },
    devtool: 'inline-source-map',
    devServer: {
        contentBase: "./public",
        hot: true
    },
    module: {
        rules: [{
            test: /\.scss$/,
            exclude: /(node_modules)/,
            use: [{
                loader: "style-loader"
            }, {
                loader: "css-loader"
            }, {
                loader: "sass-loader",
                options: {
                    sourceMap: true
                }
            }]
        }]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html'
        })
    ],
    watch: true
};