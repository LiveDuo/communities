import { useState, useContext, useCallback, createContext } from 'react'

import { IdentityContext } from './identity'

const ProfileContext = createContext()

const ProfileProvider = ({ children }) => {

	const [profile, setProfile] = useState()
	const [loading, setLoading] = useState()
	const { profileActor } = useContext(IdentityContext)

	const setUsername = async (name) => {
		const profile = await profileActor.setName(name)
		return profile
	}

	const getProfileByPrincipal = useCallback(async (principal) => {
		const response = await profileActor.getProfileByPrincipal(principal)
		setProfile(response[0])
	}, [profileActor])

	const getProfileByEth = useCallback(async (address) => {
		const response = await profileActor.getProfileByEth(address)
		setProfile(response[0])
	}, [profileActor])

	const value = { profile, setProfile, setUsername, getProfileByPrincipal, getProfileByEth, loading, setLoading }

	return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export { ProfileContext, ProfileProvider }
