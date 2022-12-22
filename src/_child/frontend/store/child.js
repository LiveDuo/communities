import { useState, useContext, createContext, useCallback } from 'react'

import { IdentityContext } from './identity'

import { Principal } from '@dfinity/principal'

const ChildContext = createContext()

const ChildProvider = ({ children }) => {

	const [posts, setPosts] = useState()
	const [loading, setLoading] = useState()
	const { childActor, principal } = useContext(IdentityContext)
	const [profile, setProfile] = useState()

	const getPosts = useCallback(async () => {
		const response = await childActor.get_posts()
		setPosts(response.map(p => ({...p, last_activity: new Date(Number(p.timestamp / 1000n / 1000n)), timestamp: new Date(Number(p.timestamp / 1000n / 1000n)), replies_count: 0})))
	}, [childActor])

	const getPost = async (index) => {
		const response = await childActor.get_post(index)
		const _post = {...response, timestamp: new Date(Number(response.timestamp / 1000n / 1000n)), replies: response.replies.map(r => ({...r, timestamp: new Date(Number(r.timestamp / 1000n / 1000n))}))}
		return _post
	}

	const createPost = async (title, description) => {
		await childActor.create_post(title, description)
		
		await getPosts() // reload data
	}

	const createReply = async (index, text) => {

		await childActor.create_reply(index, text)

		const reply = { text, timestamp: new Date(), caller: principal}
		return reply
	}

	const setUsername = async (name) => {
		const profile = await childActor.update_profile([name], [])
		return profile
	}

	const getProfileByAddress = useCallback(async (address) => {
		const response = await childActor.get_profile_by_address(address)
		setProfile(response[0])
	}, [childActor])

	const value = { profile, setProfile, setUsername, getProfileByAddress, loading, setLoading, posts, getPosts, getPost, createPost, createReply }
	return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>
}

export { ChildContext, ChildProvider }
