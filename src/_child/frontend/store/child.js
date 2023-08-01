import { useState, useContext, createContext, useCallback, useEffect } from 'react'
import { IdentityContext } from './identity'

import { useToast } from '@chakra-ui/react'

import { utils , ethers} from 'ethers'
import bs58 from 'bs58'

import { getLoginMessage, getIdentityFromSignature } from '../utils/identity'

/* global BigInt */


export const CHILD_CANISTER_ID =  process.env.REACT_APP_CHILD_CANISTER_ID ?? 'REACT_APP_CHILD_CANISTER_ID'


const idlFactory = ({ IDL }) => {
	const authentication = IDL.Variant({
		Ic: IDL.Null,
		Evm: IDL.Record({ address: IDL.Text }),
		Svm: IDL.Record({ address: IDL.Text }),
	});
	const authenticationWithAddress = IDL.Variant({
		Ic: IDL.Record({ principal: IDL.Principal}),
		Evm: IDL.Record({ address: IDL.Text }),
		Svm: IDL.Record({ address: IDL.Text }),
	});

	const ReplyResponse = IDL.Record({
		text: IDL.Text,
		timestamp: IDL.Nat64,
		authentication: authenticationWithAddress
	});

	const PostResponse = IDL.Record({
		title: IDL.Text,
		description: IDL.Text,
		timestamp: IDL.Nat64,
		replies: IDL.Vec(ReplyResponse),
    authentication: authenticationWithAddress,
	});

	const Profile = IDL.Record({
		name: IDL.Text,
		description: IDL.Text,
		authentication: authentication,
		active_principal: IDL.Principal
	});

	const PostSummary = IDL.Record({
		title: IDL.Text,
		post_id: IDL.Nat64,
		description: IDL.Text,
		authentication: authenticationWithAddress,
		timestamp: IDL.Nat64,
		replies_count: IDL.Nat64,
		last_activity: IDL.Nat64,
	});

	const authenticationWith = IDL.Variant({
		Evm: IDL.Record({ message: IDL.Text, signature: IDL.Text, }),
		Svm: IDL.Record({ public_key: IDL.Text, signature: IDL.Text, message: IDL.Text }),
		Ic: IDL.Null,
	});

	const UpgradeWithTrack = IDL.Record({
		version: IDL.Text,
		upgrade_from: IDL.Opt(IDL.Vec(IDL.Nat8)),
		timestamp: IDL.Nat64,
		assets: IDL.Vec(IDL.Text),
		track: IDL.Text
	})

	return IDL.Service({
		create_profile: IDL.Func([authenticationWith], [IDL.Variant({ Ok: Profile, Err: IDL.Text })], ["update"]),
		create_post: IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ Ok: PostSummary, Err: IDL.Text })], ["update"]),
		create_reply: IDL.Func([IDL.Nat64, IDL.Text], [IDL.Variant({ Ok: ReplyResponse, Err: IDL.Text })], ["update"]),
		get_profile: IDL.Func([], [IDL.Variant({ Ok: Profile, Err: IDL.Text })], ["query"]),
		get_post: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: PostResponse, Err: IDL.Text })], ["query"]),
		get_posts: IDL.Func([], [IDL.Vec(PostSummary)], ["query"]),
		get_posts_by_user: IDL.Func([authentication], [IDL.Variant({ Ok: IDL.Vec(PostSummary), Err: IDL.Text })], ["query"]),
		get_profile_by_user: IDL.Func([authentication], [IDL.Opt(Profile)], ["query"]),
		upgrade_canister: IDL.Func([IDL.Vec(IDL.Nat8), IDL.Text], [], ["update"]),
		get_next_upgrades: IDL.Func([],[IDL.Variant({ 'Ok': IDL.Vec(UpgradeWithTrack), 'Err': IDL.Text })], ["query"])
	});
};

const ChildContext = createContext()

const ChildProvider = ({ children }) => {

	const [childActor, setChildActor] = useState()
	const [posts, setPosts] = useState()
	const [postsUser, setPostsUser] = useState()
	const [loading, setLoading] = useState()
	const [profile, setProfile] = useState()

	const { identity, account, createActor, updateIdentity, getWallet, connectWallet} = useContext(IdentityContext)

	const toast = useToast()

	const loadActor = useCallback(async () => {
		let _actor
		if (!account) {
			_actor = await createActor({interfaceFactory: idlFactory, canisterId: CHILD_CANISTER_ID, identity: null})
		} else if (account.type ==='Evm' || account.type ==='Svm') {
			_actor = await createActor({interfaceFactory: idlFactory, canisterId: CHILD_CANISTER_ID, identity: identity})
		} else if(account.type === 'Ic') {
			_actor = await createActor({interfaceFactory: idlFactory, canisterId: CHILD_CANISTER_ID, type: 'ic'})
		}
		
		setChildActor(_actor)
  },[account, identity, createActor])

  useEffect(() => {
    loadActor()
  }, [loadActor])

	const createReply = useCallback(async (_post_id, text) => {
		const post_id = BigInt(_post_id)
		await childActor.create_reply(post_id, text)
		const reply = { text, timestamp: new Date(), authentication: { [account.type]: {address: account.address} }}
		return reply
	}, [account, childActor])

	const createPost = useCallback(async (title, description) => {
		const response = await childActor.create_post(title, description)
		const _post = {...response.Ok, last_activity: new Date(Number(response.Ok.timestamp / 1000n / 1000n)), timestamp: new Date(Number(response.Ok.timestamp / 1000n / 1000n)) }
		setPosts([...posts, _post])
	},[childActor, posts])

	const getPosts = useCallback(async () => {
		const response = await childActor.get_posts()
		setPosts(response.map(p => ({...p, last_activity: new Date(Number(p.timestamp / 1000n / 1000n)), timestamp: new Date(Number(p.timestamp / 1000n / 1000n)), replies_count: 0})))
	}, [childActor])
	
	const getPost = useCallback(async (index) => {
		const response = await childActor.get_post(BigInt(index)).then(r =>  r.Ok)
		const _post = {...response, timestamp: new Date(Number(response.timestamp / 1000n / 1000n)), replies: response.replies.map(r => ({...r, timestamp: new Date(Number(r.timestamp / 1000n / 1000n))}))}
		return _post
	}, [childActor])

	const getPostsByUser = useCallback(async () => {
		const response = await childActor.get_posts_by_user(profile.authentication)
		setPostsUser(response.Ok.map(p => ({...p, last_activity: new Date(Number(p.timestamp / 1000n / 1000n)), timestamp: new Date(Number(p.timestamp / 1000n / 1000n)), replies_count: 0})))
	}, [profile, childActor])

	const getProfileByAuth = useCallback(async (account) => {
		const auth = {}
		if (account.type === 'Evm' ||  account.type === 'Svm') {
			auth[account.type] = {address: account.address}
		} else {
			auth[account.type] = null
		}
		const response = await childActor.get_profile_by_user(auth)
		setProfile(response[0])
	}, [childActor])

	const loginWithEvm = useCallback(async () => {
		try {
			// get identity
			const ethereum = getWallet('evm')
			const provider = new ethers.providers.Web3Provider(ethereum)
			await provider.send("eth_requestAccounts", [])
			const signer = await provider.getSigner()
			const identity = getIdentityFromSignature() // generate Ed25519 identity
			const loginMessage = getLoginMessage(identity.getPrincipal().toString())
			const signature = await signer.signMessage(loginMessage)// sign with metamask
			
			// link address
			const _childActor = await createActor({interfaceFactory: idlFactory, canisterId: CHILD_CANISTER_ID, identity: identity})
			const auth = {Evm: { message: utils.hashMessage(loginMessage), signature} }
			const response = await _childActor.create_profile(auth)
			const profile = response.Ok
			setProfile(profile)

			updateIdentity('Evm', identity)

			toast({ title: 'Signed in with Ethereum', status: 'success', duration: 4000, isClosable: true })
		} catch (error) {
			toast({ title: error.message, status: 'error', duration: 4000, isClosable: true })
		}
	}, [toast, updateIdentity, createActor, getWallet])

  const loginWithSvm = useCallback(async () => {
    try {

      const phantom = getWallet('svm')
      await phantom.connect()
      const identity = getIdentityFromSignature() // generate Ed25519 identity
      const loginMessage = getLoginMessage(identity.getPrincipal().toString())
      
      // get identity
      const encodedMessage = new TextEncoder().encode(loginMessage)
      const signedMessage = await phantom.signMessage(encodedMessage, "utf8")
			
      // link address
      const _childActor = await createActor({interfaceFactory: idlFactory, canisterId: CHILD_CANISTER_ID, identity: identity})
      const publicKey = Buffer.from(bs58.decode(signedMessage.publicKey.toString())).toString('hex')
      const signature = signedMessage.signature.toString('hex')
      const message = Buffer.from(encodedMessage).toString('hex')
      const response = await _childActor.create_profile({Svm: { public_key: publicKey, signature, message }});
      const profile = response.Ok
      setProfile(profile)

			updateIdentity('Svm', identity)

      toast({ title: 'Signed in with Solana', status: 'success', duration: 4000, isClosable: true })
    } catch (error) {
      console.log(error)
      toast({ title: error.message, status: 'error', duration: 4000, isClosable: true })
    }
	}, [toast, updateIdentity, createActor, getWallet])

  const loginWithIc = useCallback(async (wallet) => {
    try {
			await connectWallet('ic', wallet)
			
      const _childActor = await createActor({interfaceFactory: idlFactory, canisterId: CHILD_CANISTER_ID, type: 'ic', wallet})
      const response = await _childActor.create_profile({Ic: null});
      const profile = response.Ok
			setProfile(profile)

			updateIdentity('Ic', undefined, wallet)
      
      toast({ title: 'Signed in with Internet Computer', status: 'success', duration: 4000, isClosable: true })
    } catch (error) {
      console.log(error)
      toast({ title: error.message, status: 'error', duration: 4000, isClosable: true })
    }
	}, [toast, createActor, updateIdentity, connectWallet])

	const login = async (type, wallet) => {
    if(type === 'evm') {
      return await loginWithEvm()
    } else if(type === 'svm') {
      return await loginWithSvm()
    } else if(type === 'ic'){
      return await loginWithIc(wallet)
    }
  }

	const value = {childActor, profile, setProfile, postsUser , getProfileByAuth, getPostsByUser, loading, setLoading, posts, getPosts, getPost, createPost, createReply, login }
	return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>
}

export { ChildContext, ChildProvider }
