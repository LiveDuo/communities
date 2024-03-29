const fs = require('fs')
const path = require('path')

const canisterData = fs.readFileSync(process.env.CRA_MODE === 'production' ? 'canister_ids.json' :'.dfx/local/canister_ids.json', 'utf8')
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

const updatePaths = (paths, srcFolder, buildFolder) => {
    paths.dotenv = path.resolve(__dirname, '.env')
    paths.appIndexJs = path.resolve(__dirname, `${srcFolder}/index.js`)
    paths.appSrc = path.resolve(__dirname, `${srcFolder}`)
    paths.appHtml = path.resolve(__dirname, `${srcFolder}/public/index.html`)
    paths.appPublic = path.resolve(__dirname, `${srcFolder}/public`)
    paths.appBuild = path.resolve(__dirname, buildFolder)
}

module.exports = {
    webpack: (config) => {
        config.output = { ...config.output, filename: 'static/js/bundle.js' }
        config.devtool = false

        // set child
        if (process.env.CRA_PROJECT === 'child') {
            const canisterId = process.env.CRA_MODE === 'production' ? 'REACT_APP_CHILD_CANISTER_ID' : canisterIds.child?.local
            if (!canisterId) { console.log('Child canister not deployed\n'); process.exit(0) }
            updateEnvVar(config, 'REACT_APP_CHILD_CANISTER_ID', canisterId)
        }
        
        // set parent
        if (process.env.CRA_PROJECT === 'parent') {
            const canisterId = process.env.CRA_MODE === 'production' ? canisterIds.parent?.ic : canisterIds.parent?.local
            if (!canisterId) { console.log('Parent canister not deployed\n'); process.exit(0) }
            updateEnvVar(config, 'REACT_APP_PARENT_CANISTER_ID', canisterId)
        }
        
        // set ledger
        const ledgerCanisterId = process.env.CRA_MODE === 'production' ?  LEDGER_CANISTER_ID : canisterIds.ledger?.local 
        if (ledgerCanisterId) updateEnvVar(config, 'REACT_APP_LEDGER_CANISTER_ID', ledgerCanisterId)
        
        // set cmc
        const cmcCanisterId = process.env.CRA_MODE === 'production' ?  CMC_CANISTER_ID : canisterIds.cmc?.local
        if (cmcCanisterId) updateEnvVar(config, 'REACT_APP_CMC_CANISTER_ID', cmcCanisterId)

        return config
    },
    paths: (paths, _env) => {

        if (process.env.CRA_PROJECT === 'child') {
            updatePaths(paths, 'src/_child/frontend', `build/child/latest`)
        } else if (process.env.CRA_PROJECT === 'parent') {
            updatePaths(paths, 'src/_parent/frontend', 'build/parent')
        }

        return paths
    },
}
