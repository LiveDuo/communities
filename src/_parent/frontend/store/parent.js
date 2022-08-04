import { useState, useContext, createContext } from 'react'

import { IdentityContext } from './identity'

import { parentCanisterId, idlParentFactory } from '../agents/parent'

const ParentContext = createContext()

const ParentProvider = ({ children }) => {

	const [loading, setLoading] = useState()
	const [childPrincipal, setChildPrincipal] = useState()
	const { parentActor } = useContext(IdentityContext)

	const createChild = async () => {
		setLoading(true)
		const {Ok: childPrincipal} = await parentActor.create_child_canister()
		setChildPrincipal(childPrincipal.toString())
		setLoading(false)
		return childPrincipal
	}

	const createParentActor = async () => {
		const actor = await window.ic?.plug.createActor({ canisterId: parentCanisterId, interfaceFactory: idlParentFactory })
		return actor
	}

	const value = { createChild, childPrincipal, parentCanisterId, createParentActor, loading, setLoading }

	return <ParentContext.Provider value={value}>{children}</ParentContext.Provider>
}

export { ParentContext, ParentProvider }
