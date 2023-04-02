const path = require('path')
const fs = require('fs')

const canisterData = fs.readFileSync('.dfx/local/canister_ids.json', 'utf8')
const canisterIds = JSON.parse(canisterData)

// mainnet canisters
const LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai'
const CMC_CANISTER_ID = 'rkp4c-7iaaa-aaaaa-aaaca-cai'

const updateEnvVar = (config, key, value) => {
    const InterpolateIndex = config.plugins.findIndex(e => e.constructor.name === 'InterpolateHtmlPlugin')
    config.plugins[InterpolateIndex].replacements[key] = value

    const DefineIndex = config.plugins.findIndex(e => e.constructor.name === 'DefinePlugin')
    config.plugins[DefineIndex].definitions['process.env'][key] = `"${value}"`
}

module.exports = {
    webpack: (config) => {
        config.output = { ...config.output, filename: 'static/js/bundle.js' }

        // set child
        if (process.env.CRA_PROJECT === 'child') {
            const canisterId = process.env.CRA_MODE === 'production' ? 'REACT_APP_CHILD_CANISTER_ID' : canisterIds.child.local
            updateEnvVar(config, 'REACT_APP_CHILD_CANISTER_ID', canisterId)
        }

        // set parent
        if (process.env.CRA_PROJECT === 'parent') {
            updateEnvVar(config, 'REACT_APP_PARENT_CANISTER_ID', canisterIds.parent.local)
        }

        // set ledger and cmc
        const ledgerCanisterId = process.env.CRA_MODE === 'development' ? canisterIds.ledger?.local : LEDGER_CANISTER_ID
        const cmcCanisterId = process.env.CRA_MODE === 'development' ? canisterIds.cmc?.local : CMC_CANISTER_ID
        updateEnvVar(config, 'REACT_APP_LEDGER_CANISTER_ID', ledgerCanisterId)
        updateEnvVar(config, 'REACT_APP_CMC_CANISTER_ID', cmcCanisterId)

        return config
    },
    paths: (paths, _env) => {
        const folder = process.env.CRA_PROJECT === 'child' ? 'src/_child/frontend' : 'src/_parent/frontend'
        paths.dotenv = path.resolve(__dirname, '.env')
        paths.appIndexJs = path.resolve(__dirname, `${folder}/index.js`)
        paths.appSrc = path.resolve(__dirname, `${folder}`)
        paths.appHtml = path.resolve(__dirname, `${folder}/public/index.html`)
        paths.appPublic = path.resolve(__dirname, `${folder}/public`)
        paths.appBuild = path.resolve(__dirname, `build/${process.env.CRA_PROJECT}`)
        return paths
    },
}
