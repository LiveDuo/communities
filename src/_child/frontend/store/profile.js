import { useState, useContext, useCallback, createContext } from 'react'

import { IdentityContext } from './identity'

const ProfileContext = createContext()

const ProfileProvider = ({ children }) => {

	const [profile, setProfile] = useState()
	const [loading, setLoading] = useState()
	const { childActor } = useContext(IdentityContext)

	const setUsername = async (name) => {
		const profile = await childActor.update_profile([name], [])
		return profile
	}

	const getProfileByAddress = useCallback(async (address) => {
		const response = await childActor.get_profile_by_address(address)
		setProfile(response[0])
	}, [childActor])

	const value = { profile, setProfile, setUsername, getProfileByAddress, loading, setLoading }

	return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export { ProfileContext, ProfileProvider }
