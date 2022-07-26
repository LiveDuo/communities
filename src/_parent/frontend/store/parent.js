import { useState, useContext, createContext } from 'react'

import { IdentityContext } from './identity'

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

	const value = { createChild, childPrincipal, loading, setLoading }

	return <ParentContext.Provider value={value}>{children}</ParentContext.Provider>
}

export { ParentContext, ParentProvider }
