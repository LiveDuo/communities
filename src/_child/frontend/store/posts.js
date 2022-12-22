import { useState, useContext, createContext, useCallback } from 'react'
import { Principal } from '@dfinity/principal'

import { IdentityContext } from './identity'

const PostsContext = createContext()

const PostsProvider = ({ children }) => {

	const [posts, setPosts] = useState()
	const [loading, setLoading] = useState()
	const { principal, childActor } = useContext(IdentityContext)

	const getPosts = useCallback(async (principalId, pageIndex) => {
		const response = await childActor.get_posts(principalId ?? '', pageIndex)
		setPosts(response.map(p => ({...p, timestamp: new Date(), caller: Principal.anonymous(), replies_count: 0})))
	}, [childActor])

	const createPost = async (title, description) => {
		await childActor.create_post(title, description)
		
		const principalId = principal?.toString() ?? ''
		await getPosts(principalId, 0) // reload data
	}

	const value = { posts, getPosts, loading, setLoading, createPost }
	return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
}

export { PostsContext, PostsProvider }
