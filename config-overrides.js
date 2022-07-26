const path = require('path')

module.exports = {
    webpack: (config) => {
        config.output = {
            ...config.output,
            filename: 'static/js/bundle.js'
        }
        return config
    },
    paths: (paths, _env) => {
        const craProject = process.env.CRA_PROJECT
        const folder = craProject === 'child' ? 'src/_child/frontend' : 'src/_parent/frontend'
        paths.dotenv = path.resolve(__dirname, '.env')
        paths.appIndexJs = path.resolve(__dirname, `${folder}/index.js`)
        paths.appSrc = path.resolve(__dirname, `${folder}`)
        paths.appHtml = path.resolve(__dirname, `${folder}/public/index.html`)
        paths.appPublic = path.resolve(__dirname, `${folder}/public`)
        paths.appBuild = path.resolve(__dirname, `build/${craProject}`)
        return paths
    },
}
