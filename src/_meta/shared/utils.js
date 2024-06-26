
const { HttpAgent } = require('@dfinity/agent')

const { exec } = require('child_process')
const util = require('util')
const path = require('path')

const execP = util.promisify(exec)

const checkDfxRunning = async () => {
    const { stdout } = await execP(`lsof -i:8000`).catch((e) => { if (e.killed) throw e; return e })
    if (stdout.split('\n') < 3)
        throw new Error('DFX is not started')
}
exports.checkDfxRunning = checkDfxRunning

const transferIcpToAccount = async (accountId) => {
	const command = `dfx ledger transfer --ledger-canister-id $(dfx canister id ledger) --amount 1 --memo 1347768404 ${accountId}`
    const { stdout } = await execP(command).catch((e) => { if (e.killed) throw e; return e })
	if (!stdout.startsWith('Transfer sent at'))
        throw new Error('Transfer failed')
}
exports.transferIcpToAccount = transferIcpToAccount

const getHost = (network) => network === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:8000'
exports.getHost = getHost

const getCanisters = async (network) => {
    try {
        if (network === 'ic') return require(path.resolve('canister_ids.json'))
		else return require(path.resolve('.dfx', 'local', 'canister_ids.json'))
    } catch (error) {
        throw new Error('Canister not found') // should deploy first
    }
}
exports.getCanisters = getCanisters

const setupTests = () => {
    global.fetch = require('node-fetch')

    jest.setTimeout(30000)
    // console.log = () => { }
}
exports.setupTests = setupTests

const getAgent = (host, identity) => {
    const agent = new HttpAgent({ host, identity })
    agent.fetchRootKey()
    return agent
}
exports.getAgent = getAgent

const sleep = ms => new Promise(r => setTimeout(r, ms));
exports.sleep = sleep
