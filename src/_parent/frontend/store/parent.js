import { useState, useContext, createContext } from 'react'

import { IdentityContext } from './identity'

import { idlParentFactory, parentCanisterId } from '../agents/parent'

import { useToast } from '@chakra-ui/react'

const ParentContext = createContext()

const ParentProvider = ({ children }) => {

	const toast = useToast()
	const [loading, setLoading] = useState()
	const [childPrincipal, setChildPrincipal] = useState()
	const { parentActor, parentActorPlug } = useContext(IdentityContext)

	const createChild = async () => {
		setLoading(true)
		const {Ok: childPrincipal} = await parentActor.create_child_canister()
		setChildPrincipal(childPrincipal.toString())
		setLoading(false)
		return childPrincipal
	}

	const callCreateCanister = async () => {
		try {
			const response = await parentActorPlug.create_child_canister()
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

	const getCreateChildTx = (_params) => ({
		idl: idlParentFactory,
		canisterId: parentCanisterId,
		methodName: 'create_child_canister',
		args: [],
		onSuccess: (res) => console.log('Success', res),
		onFail: (res) => console.log('Error', res)
	})

	const value = { getCreateChildTx, createChild, childPrincipal, parentCanisterId, callCreateCanister, loading, setLoading }

	return <ParentContext.Provider value={value}>{children}</ParentContext.Provider>
}

export { ParentContext, ParentProvider }
