'use strict'

var webpack = require('webpack');
var path = require('path');

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
        __dirname + '/main.coffee',
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
            {test: /\.json$/, loader: 'json-loader'},
            {test: /\.html$/, loader: 'raw-loader'},
        ]
    },
    plugins: [
        /*
        new webpack.BannerPlugin({
            banner: [
                'Your Application',
                '(c) 20xx Your name or company. All rights reserved.',
            ].join('\n'),
            raw: false,
        }),
        */
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: '"production"'
            },
        }),
    ],
    resolve: {
        extensions: ['.webpack.js', '.web.js', '.js', '.coffee', '.json'],
        alias: {
            // // You can use this to override some packages and use local versions
            // // Note that we're pointing to pack.coffee to use the source directly
            // // instead of the precompiled one.
            // 'myou-engine': path.resolve(__dirname+'/../myou-engine/pack.coffee'),
        },
    },
    mode: 'development',
}

module.exports = (env={}) => {
    if(env.production){
        config.mode = 'production';
    }
    if(env.sourcemaps){
        config.devtool = 'cheap-module-eval-source-map';
    }
    if(env.minify || env.uglify){
        config.plugins.push(new webpack.optimize.UglifyJsPlugin({
            screw_ie8: true,
            sourceMap: false,
            compress: { warnings: true },
        }));
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
    var {handle_myou_config} = require('myou-engine/webpack.config.js');
    return handle_myou_config(webpack, config, myou_engine_flags, env);
}
