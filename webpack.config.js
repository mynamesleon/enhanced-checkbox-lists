module.exports = {
    mode: 'production',
    entry: './src/enhanced-checkbox-list.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        libraryTarget: 'umd',
        path: __dirname + '/dist',
        filename: 'enhanced-checkbox-list.min.js'
    }
};
