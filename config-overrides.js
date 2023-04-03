const fs = require('fs')
const path = require('path')

const canisterData = fs.readFileSync('.dfx/local/canister_ids.json', 'utf8')
const canisterIds = JSON.parse(canisterData)

// mainnet canisters
const LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai'
const CMC_CANISTER_ID = 'rkp4c-7iaaa-aaaaa-aaaca-cai'

const updateEnvVar = (config, key, value) => {
    const interpolateIndex = config.plugins.findIndex(e => e.constructor.name === 'InterpolateHtmlPlugin')
    config.plugins[interpolateIndex].replacements[key] = value

    const defineIndex = config.plugins.findIndex(e => e.constructor.name === 'DefinePlugin')
    config.plugins[defineIndex].definitions['process.env'][key] = `"${value}"`
}

module.exports = {
    webpack: (config) => {
        config.output = { ...config.output, filename: 'static/js/bundle.js' }

        // set child
        if (process.env.CRA_PROJECT === 'child') {
            const canisterId = process.env.CRA_MODE === 'production' ? 'REACT_APP_CHILD_CANISTER_ID' : canisterIds.child?.local
            if (!canisterId) { console.log('Child canister not deployed\n'); process.exit(0) }
            updateEnvVar(config, 'REACT_APP_CHILD_CANISTER_ID', canisterId)
        }

        // set parent
        if (process.env.CRA_PROJECT === 'parent') {
            if (!canisterIds.parent) { console.log('Parent canister not deployed\n'); process.exit(0) }
            updateEnvVar(config, 'REACT_APP_PARENT_CANISTER_ID', canisterIds.parent.local)
        }

        // set ledger
        const ledgerCanisterId = process.env.CRA_MODE === 'development' ? canisterIds.ledger?.local : LEDGER_CANISTER_ID
        if (ledgerCanisterId) updateEnvVar(config, 'REACT_APP_LEDGER_CANISTER_ID', ledgerCanisterId)

        // set cmc
        const cmcCanisterId = process.env.CRA_MODE === 'development' ? canisterIds.cmc?.local : CMC_CANISTER_ID
        if (cmcCanisterId) updateEnvVar(config, 'REACT_APP_CMC_CANISTER_ID', cmcCanisterId)

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
