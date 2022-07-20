const util = require('util')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { exec } = require('child_process')

const execP = util.promisify(exec)

const exists = (dir) => fs.promises.access(dir).then(() => true).catch(() => false)

const dirName = 'dfx-git'
const tempDir = path.join(os.tmpdir(), dirName)

jest.setTimeout(10000)
// console.log = () => {}

describe('Testing with done', () => {

	let server

	beforeAll(async () => {

		// check dfx running
		const { stdout } = await execP(`lsof -i:8000`).catch((e) => { if (e.killed) throw e; return e })
		if (stdout.split('\n') < 3)
			throw new Error('DFX is not started')
		
		// start proxy server
		server = require('../scripts/proxy-server').server
		await new Promise((r) => setTimeout(r, 1000))
	})

	test('Should clone a repository', async () => {

		// clean up
		if (await exists(tempDir))
			await fs.promises.rm(tempDir, { recursive: true, force: true })

		// create canister
		const { stdout } = await execP(`dfx canister call parent create_git_canister '()'`).catch((e) => { if (e.killed) throw e; return e })
		const childPrincipalid = stdout.substring(31, 58)

		// clone repo
		const {address, port} = server.address()
		const host = address === '127.0.0.1' ? 'localhost' : address
		const repoUrl = `http://${host}:${port}/${childPrincipalid}/`
		await execP(`git clone ${repoUrl} ${dirName}`, {cwd: os.tmpdir()})
		expect(await exists(tempDir)).toBe(true)
		expect(await exists(path.join(tempDir, 'test.md'))).toBe(true)

	})

	afterAll(async () => {

		// delete repo folder
		await fs.promises.rm(tempDir, { recursive: true, force: true })
		expect(await exists(tempDir)).toBe(false)

		// stop server
		if (!!server)
			server.close()
	})

})
