import { useState, useContext, createContext } from 'react'

import { IdentityContext } from './identity'

import { idlParentFactory, parentCanisterId } from '../agents/parent'

import { useToast } from '@chakra-ui/react'

const ParentContext = createContext()

const ParentProvider = ({ children }) => {

	const toast = useToast()
	const [loading, setLoading] = useState()
	const { parentActor, parentActorPlug } = useContext(IdentityContext)

	const createChild = async () => {
		setLoading(true)
		const {Ok: childPrincipal} = await parentActor.create_child()
		setLoading(false)
		return childPrincipal
	}

	const getUserCanisters = async () => {
		try {
			const response = await parentActorPlug.get_user_canisters()
			return response.map(c => ({id: c.id, timestamp: new Date(Number(c.timestamp / 1000n / 1000n)), state: Object.keys(c.state)[0]}))
		} catch (error) {
			const description = error.result?.reject_message ?? 'Response failed'
			toast({ description, status: 'error' })
		}
	}

	const callCreateCanister = async () => {
		try {
			const response = await parentActorPlug.create_child()
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

	const getCreateChildTx = (_params, callback = () => {}) => ({
		idl: idlParentFactory,
		canisterId: parentCanisterId,
		methodName: 'create_child',
		args: [],
		onSuccess: callback,
		onFail: (_res) => toast({ description: 'Something went wrong', status: 'error' })
	})

	const value = { getCreateChildTx, createChild, parentCanisterId, callCreateCanister, getUserCanisters, loading, setLoading }

	return <ParentContext.Provider value={value}>{children}</ParentContext.Provider>
}

export { ParentContext, ParentProvider }
