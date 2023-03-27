const path = require('path')
const fs = require('fs')

module.exports = {
    webpack: (config) => {
        config.output = {
            ...config.output,
            filename: 'static/js/bundle.js'
        }

        // clears canister id env var so it's replaced after a new canister is created
        // NOTE: plugin indexes change between development and production
        if (process.env.NODE_ENV === 'production' && process.env.DEPLOY_MODE === 'standalone') {
            // child canister
            config.plugins[2].replacements.REACT_APP_CHILD_CANISTER_ID = 'REACT_APP_CHILD_CANISTER_ID'
            config.plugins[4].definitions['process.env'].REACT_APP_CHILD_CANISTER_ID = '"REACT_APP_CHILD_CANISTER_ID"'

            // parent canister
            const canisterData = fs.readFileSync('.dfx/local/canister_ids.json', 'utf8')
            const canisterIds = JSON.parse(canisterData)
            config.plugins[2].replacements.REACT_APP_PARENT_CANISTER_ID = canisterIds.parent.ic
            config.plugins[4].definitions['process.env'].REACT_APP_PARENT_CANISTER_ID = `"${canisterIds.parent.ic}"`

            // ledger canister
            const ledgerCanisterId = 'ryjl3-tyaaa-aaaaa-aaaba-cai' // constant for mainnet
            config.plugins[2].replacements.REACT_APP_LEDGER_CANISTER_ID = ledgerCanisterId
            config.plugins[4].definitions['process.env'].REACT_APP_LEDGER_CANISTER_ID = `"${ledgerCanisterId}"`

            // cmc canister
            const cmcCanisterId = 'rkp4c-7iaaa-aaaaa-aaaca-cai' // constant for mainnet
            config.plugins[2].replacements.REACT_APP_CMC_CANISTER_ID = cmcCanisterId
            config.plugins[4].definitions['process.env'].REACT_APP_CMC_CANISTER_ID = `"${cmcCanisterId}"`
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
