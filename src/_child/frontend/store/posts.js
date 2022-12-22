import { useState, useContext, createContext, useCallback } from 'react'

import { IdentityContext } from './identity'

const PostsContext = createContext()

const PostsProvider = ({ children }) => {

	const [postsData, setPostsData] = useState()
	const [loading, setLoading] = useState()
	const { principal, childActor } = useContext(IdentityContext)

	const getPostsData = useCallback(async (principalId, pageIndex) => {
		const response = await childActor.get_posts(principalId ?? '', pageIndex)
		setPostsData(response)
	}, [childActor])

	const writeData = async (title, description) => {
		await childActor.create_post(title, description)
		
		const principalId = principal?.toString() ?? ''
		await getPostsData(principalId, 0) // reload data
	}

	const value = { postsData, getPostsData, loading, setLoading, writeData }
	return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
}

export { PostsContext, PostsProvider }
