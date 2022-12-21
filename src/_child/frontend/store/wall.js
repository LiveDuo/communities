import { useState, useContext, createContext, useCallback } from 'react'

import { IdentityContext } from './identity'

const WallContext = createContext()

const WallProvider = ({ children }) => {

	const [wallData, setWallData] = useState()
	const [loading, setLoading] = useState()
	const { principal, wallActor } = useContext(IdentityContext)

	const getWallData = useCallback(async (principalId, pageIndex) => {
		const response = await wallActor.get_posts(principalId ?? '', pageIndex)
		setWallData(response)
	}, [wallActor])

	const writeData = async (text) => {
		await wallActor.create_post(text)
		
		const principalId = principal?.toString() ?? ''
		await getWallData(principalId, 0) // reload data
	}

	const value = { wallData, getWallData, loading, setLoading, writeData }
	return <WallContext.Provider value={value}>{children}</WallContext.Provider>
}

export { WallContext, WallProvider }
