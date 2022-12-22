import { useState, useContext, createContext, useCallback } from 'react'
import { Principal } from '@dfinity/principal'

import { IdentityContext } from './identity'

const ChildContext = createContext()

const ChildProvider = ({ children }) => {

	const [posts, setPosts] = useState()
	const [loading, setLoading] = useState()
	const { principal, childActor } = useContext(IdentityContext)
	const [profile, setProfile] = useState()

	const getPosts = useCallback(async (principalId, pageIndex) => {
		const response = await childActor.get_posts(principalId ?? '', pageIndex)
		setPosts(response.map(p => ({...p, timestamp: new Date(), caller: Principal.anonymous(), replies_count: 0})))
	}, [childActor])

	const createPost = async (title, description) => {
		await childActor.create_post(title, description)
		
		const principalId = principal?.toString() ?? ''
		await getPosts(principalId, 0) // reload data
	}

	const setUsername = async (name) => {
		const profile = await childActor.update_profile([name], [])
		return profile
	}

	const getProfileByAddress = useCallback(async (address) => {
		const response = await childActor.get_profile_by_address(address)
		setProfile(response[0])
	}, [childActor])

	const value = { profile, setProfile, setUsername, getProfileByAddress, loading, setLoading, posts, getPosts, createPost }
	return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>
}

export { ChildContext, ChildProvider }
