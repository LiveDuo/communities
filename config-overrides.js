const path = require('path')

module.exports = {
    webpack: (config) => {
        config.output = {
            ...config.output,
            filename: 'static/js/bundle.js'
        }
        return config
    },
    paths: (paths, env) => {
        paths.dotenv = path.resolve(__dirname, '.env')
        paths.appIndexJs = path.resolve(__dirname, 'src/frontend/index.js')
        paths.appSrc = path.resolve(__dirname, 'src/frontend')
        paths.appHtml = path.resolve(__dirname, 'src/frontend/public/index.html')
        paths.appPublic = path.resolve(__dirname, 'src/frontend/public')
        return paths
    },
}
