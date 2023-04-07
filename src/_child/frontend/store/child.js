import { useState, useContext, createContext, useCallback } from 'react'

import { IdentityContext } from './identity'
/* global BigInt */

const ChildContext = createContext()

const ChildProvider = ({ children }) => {

	const [posts, setPosts] = useState()
	const [loading, setLoading] = useState()
	const { childActor, account } = useContext(IdentityContext)
	const [profile, setProfile] = useState()

	const getPosts = useCallback(async () => {
		const response = await childActor.get_posts()
		setPosts(response.map(p => ({...p, last_activity: new Date(Number(p.timestamp / 1000n / 1000n)), timestamp: new Date(Number(p.timestamp / 1000n / 1000n)), replies_count: 0})))
	}, [childActor])
	
	const getPost = async (index) => {
		const response = await childActor.get_post(BigInt(index)).then(r =>  r.Ok)
		const _post = {...response, timestamp: new Date(Number(response.timestamp / 1000n / 1000n)), replies: response.replies.map(r => ({...r, timestamp: new Date(Number(r.timestamp / 1000n / 1000n))}))}
		return _post
	}

	const createPost = async (title, description) => {
		await childActor.create_post(title, description)
		
		await getPosts() // reload data
	}

	const createReply = async (_post_id, text) => {
		const post_id = BigInt(_post_id)
		await childActor.create_reply(post_id, text)
		const reply = { text, timestamp: new Date(), address: account}
		return reply
	}

	const setUsername = async (name) => {
		const profile = await childActor.update_profile([name], [])
		return profile
	}

	const getProfileByAddress = useCallback(async () => {
		const response = await childActor.get_profile()
		setProfile(response[0])
	}, [childActor])

	const value = { profile, setProfile, setUsername, getProfileByAddress, loading, setLoading, posts, getPosts, getPost, createPost, createReply }
	return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>
}

export { ChildContext, ChildProvider }
