import { useState, createContext } from 'react' // useContext

// import { IdentityContext } from './identity'

import { ledgerCanisterId, idlLedgerFactory } from '../agents/ledger'

const LedgerContext = createContext()

const LedgerProvider = ({ children }) => {

	const [loading, setLoading] = useState()
	// const [childPrincipal, setChildPrincipal] = useState()
	// const { parentActor } = useContext(IdentityContext)

	// const createChild = async () => {
	// 	setLoading(true)
	// 	const {Ok: childPrincipal} = await parentActor.create_child_canister()
	// 	setChildPrincipal(childPrincipal.toString())
	// 	setLoading(false)
	// 	return childPrincipal
	// }

	const requestTransfer = async (transferParams) => {
		await window.ic?.plug.requestTransfer(transferParams)
	}
	
	const requestBalance = async () => {
		const balance = await window.ic?.plug.requestBalance()
		return balance
	}
	
	const createLedgerActor = async () => {
		const actor = await window.ic?.plug.createActor({ canisterId: ledgerCanisterId, interfaceFactory: idlLedgerFactory })
		return actor
	}

	const value = { requestTransfer, requestBalance, createLedgerActor, loading, setLoading }

	return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export { LedgerContext, LedgerProvider }
