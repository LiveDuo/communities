const path = require('path')

module.exports = {
    paths: (paths, env) => {
        paths.appIndexJs = path.resolve(__dirname, 'src/frontend/index.js')
        paths.appSrc = path.resolve(__dirname, 'src/frontend')
        paths.appHtml = path.resolve(__dirname, 'src/frontend/public/index.html')
        paths.appPublic = path.resolve(__dirname, 'src/frontend/public')
        return paths
    },
}
