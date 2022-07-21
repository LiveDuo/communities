const fs = require('fs')

const { Actor, HttpAgent } = require('@dfinity/agent')

global.fetch = require('node-fetch')

const agent = new HttpAgent({ host: 'http://localhost:8000' });

if (process.env.NODE_ENV !== 'production') {
    agent.fetchRootKey().catch(err=>{
        console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
        console.error(err)
    })
}

const canisterId = 'rrkah-fqaaa-aaaaa-aaaaq-cai'
const idlFactory = ({ IDL }) => IDL.Service({ 'upload_wasm' : IDL.Func([IDL.Vec(IDL.Nat8)], [], []) }) // IDL.Vec(IDL.Int)
const actor = Actor.createActor(idlFactory, { agent, canisterId })

;(async () => {
    const wasm = fs.readFileSync('./canisters/backend.wasm')
    try {
        await actor.upload_wasm([...new Uint8Array(wasm)])
    } catch (e) {
        console.error('error', e)
    }
})()
