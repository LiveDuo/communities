const fs = require('fs/promises')

const { parse } = require('node-html-parser')

const variableName = 'REACT_APP_BACKEND_CANISTER_ID'
const variableContent = 'rrkah-fqaaa-aaaaa-aaaaq-cai'

;(async () => {
    const htmlSrcScript = await fs.readFile('./build/index.html', 'utf8').then(r => parse(r))
    const srcScriptPath = htmlSrcScript.querySelector('head > script').getAttribute('src')

    const srcScript = await fs.readFile(`./build${srcScriptPath}`, 'utf8')
    const srcScriptR = srcScript.replaceAll(variableName, variableContent)

    console.log('Env:\n', variableName + ': ' + variableContent, '\n')
    console.log('Snippet:\n', srcScriptR.substring(0, 500), '\n')
    console.log('Length:\n', srcScriptR.length)

    // await fs.writeFile('./scripts/main_edited.js', srcScriptR)
    await fs.writeFile(`./build${srcScriptPath}`, srcScriptR)
})()
