import { useState, useContext, createContext } from 'react'

import { IdentityContext } from './identity'

import { parentCanisterId, idlParentFactory } from '../agents/parent'

import { useToast } from '@chakra-ui/react'

const ParentContext = createContext()

const ParentProvider = ({ children }) => {

	const toast = useToast()
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

	const callCreateCanister = async () => {
		const actor = await createParentActor()
		try {
			const response = await actor.create_canister()
			if (response.Ok) {
				toast({ description: `Response: ${response.Ok}` })
			} else {
				toast({ description: `Response: ${response.Err}`, status: 'error' })
			}
		} catch (error) {
			const description = error.result?.reject_message ?? 'Response failed'
			toast({ description, status: 'error' })
		}
	}

	const value = { createChild, childPrincipal, parentCanisterId, createParentActor, callCreateCanister, loading, setLoading }

	return <ParentContext.Provider value={value}>{children}</ParentContext.Provider>
}

export { ParentContext, ParentProvider }
