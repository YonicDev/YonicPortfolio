'use strict'

var webpack = require('webpack');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var TerserPlugin = require('terser-webpack-plugin');

var path = require('path');

var myou_libs = ['ammo.asm.js','ammo.wasm.js','ammo.wasm.wasm'];
var patterns = [
    {from: path.resolve(__dirname,"assets"), to: path.resolve(__dirname,"build/assets")},
    {from: path.resolve(__dirname,"data"), to: path.resolve(__dirname,"build/data")}
]

patterns.push(...myou_libs.map((myouLib) => {
    return {
      from: path.resolve(__dirname,'node_modules/myou-engine/engine/libs',myouLib),
      to: path.resolve(__dirname,'build/libs')
    }
  }));

var myou_engine_flags = {
    include_bullet: true,
}
var config = {
    output: {
        path: __dirname + '/build',
        filename: 'app.js',
    },
    context: __dirname,
    entry: [
        __dirname + '/src/main.ts',
    ],
    stats: {
        colors: true,
        reasons: true
    },
    module: {
        rules: [
            {
                test: /\.coffee$/,
                use: {
                    loader: 'coffee-loader',
                }
            },
            {
                test: /\.(png|jpe?g|gif)$/i,
                loader: 'url-loader?limit=18000&name=[path][name].[ext]',
            },
            {test: /\.svg$/, loader: 'url-loader?mimetype=image/svg+xml'},
            {test: /\.woff2?$/, loader: 'url-loader?mimetype=application/font-woff'},
            {test: /\.eot$/, loader: 'url-loader?mimetype=application/font-woff'},
            {test: /\.ttf$/, loader: 'url-loader?mimetype=application/font-woff'},
            //{test: /\.json$/, loader: 'json-loader'},
            {test: /\.html$/, loader: 'raw-loader'},
            {test: /\.tsx?$/, loader: 'ts-loader'},
            {
                test: /\.md$/,
                use: [
                    {
                        loader: 'html-loader'
                    },
                    {
                        loader: 'markdown-loader',
                        options: {
                            pedantic: false
                        }
                    }
                ]
            },
            {test: /\.s[ac]ss$/i, use: ['style-loader','css-loader','sass-loader']}
        ]
    },
    plugins: [
        new webpack.BannerPlugin({
            banner: [
                '(c) 2020 Mario Martínez Palacio. All rights reserved.',
            ].join('\n'),
            raw: false,
        }),
        new webpack.DefinePlugin({global_myou_engine_webpack_flags: JSON.stringify(myou_engine_flags)}),
        new HtmlWebpackPlugin({
            filename: "index.html",
            template: path.resolve(__dirname,"index.html")
        }),
        new CopyWebpackPlugin({patterns}),
    ],
    resolve: {
        extensions: ['.webpack.js', '.web.js', '.js', '.coffee', '.json', '.ts'],
        alias: {
            // // You can use this to override some packages and use local versions
            // // Note that we're pointing to pack.coffee to use the source directly
            // // instead of the precompiled one.
            // 'myou-engine': path.resolve(__dirname+'/../myou-engine/pack.coffee'),
        },
    },
    mode: 'development',
    devServer: {
        contentBase: path.resolve(__dirname, 'build'),
        port: 8080,
        disableHostCheck: true
    }
}

module.exports = (env={}) => {
    if(env.production){
        config.mode = 'production';
    }
    if(env.sourcemaps){
        config.devtool = 'eval-source-map';
    }
    if(env.minify || env.uglify){
        config.optimization = {
            minimize: true,
            minimizer: [new TerserPlugin()]
        };
    }
    if(env.babel){
        // To use this option, install babel first with:
        // npm add babel-core babel-preset-env
        config.module.rules[0].use.options = {
            transpile: {
                presets: ['env']
            }
        }
    }
    return config;
}
