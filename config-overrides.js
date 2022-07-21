const path = require('path');

module.exports = {
    paths: function (paths, env) {        
        paths.appIndexJs = path.resolve(__dirname, 'src/frontend/index.js');
        paths.appSrc = path.resolve(__dirname, 'src/frontend');
        paths.appHtml = path.resolve(__dirname, 'src/frontend/public/index.html');
        return paths;
    },
}