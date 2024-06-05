import { useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Spinner, Box, Heading, Tag, Link } from '@chakra-ui/react'
import { Text, Flex, Button, IconButton, Divider } from '@chakra-ui/react'
import { useDisclosure } from '@chakra-ui/react'
import Jazzicon from 'react-jazzicon'

import { timeSince } from '../../utils/time'
import { capitalizeFirstLetter, getAddress, getAuthenticationType, getSeedFromAuthentication, getAuthentication, addressToName } from '../../utils/address'
import { getTempId } from '../../utils/random'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faEyeSlash, faEye, faHeart } from '@fortawesome/free-solid-svg-icons'

import { ChildContext } from '../../store/child'
import { IdentityContext } from '../../store/identity'

import { Link as RouterLink , useNavigate, useParams, useLocation } from 'react-router-dom'
import Markdown from 'react-markdown'
import Editor from '../Editor/Editor'
import ToolBar from '../Editor/ToolBar'
import LikesModal from '../modals/LikesModal'


const PostContainer = () => {
  const { account, principal, setSelectedNetwork, onWalletModalOpen } = useContext(IdentityContext)
  const { profile, getPost, createReply, childActor, updateReplyStatus, updatePostStatus, likePost, unlikePost, likeReply, unlikeReply } = useContext(ChildContext)

  const textAreaRef = useRef()
  
	const [replyText, setReplyText] = useState('')
	const [isPreview, setIsPreview] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [removedLikeReply, setRemovedLikeReply] = useState()
	const [post, setPost] = useState()
	const [replyLikes, setReplyLikes] = useState([])
  
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  const canGoBack = location.key !== 'default'

  const { isOpen: isPostLikeModalOpen, onOpen: onPostLikeModalOpen, onClose: onPostLikeModalClose } = useDisclosure()
  const { isOpen: isReplyLikeModalOpen, onOpen: onReplyLikeModalOpen, onClose: onReplyLikeModalClose } = useDisclosure()

  const getData = useCallback(async () => {
    const post_id = params.index
    const _post = await getPost(post_id)
    setPost({..._post, post_id})
  }, [getPost, params.index])

  const replyToPost = async (p) => {
    if (!(account && principal)) {
      setSelectedNetwork()
      onWalletModalOpen()
      return
    }

		setReplyText('')

    const tempId = getTempId()
		const _reply = {reply_id: null, text: replyText, tempId, timestamp: new Date(), status:{ Visible:null}, authentication: getAuthentication(account.address, account.type), likes:[] }
		setPost(h => ({...h, replies: [...h.replies, _reply]}))

		const reply = await createReply(p.post_id, replyText)
		
		setPost(p => {
      const _post = {...p}
      const replyIndex = _post.replies.findIndex(_h => _h.tempId === tempId)
      _post.replies[replyIndex].reply_id = reply.reply_id
      return _post
    })
	}

  const changePostVisibility = useCallback(async (postId, statusType)=>{
    const status = { [statusType]: null }
    setPost(p => ({...p, status: status}))
    await updatePostStatus(postId, status)
  },[updatePostStatus])
  const changeReplyVisibility = useCallback(async (replyId, statusType)=>{
    const status = { [statusType]: null }
    const replyIndex = post.replies.findIndex(r => r.reply_id === replyId)
    post.replies[replyIndex].status = status
    setPost(p => ({...p, replies: [...post.replies]}))
    await updateReplyStatus(replyId, status)
  },[post, updateReplyStatus])

  const addLikePost = useCallback(async (postId) => {
    if (!(account && principal)) {
      setSelectedNetwork()
      onWalletModalOpen()
      return
    }
    const tempId = getTempId()
    const like = [null, getAuthentication(account.address, account.type), tempId]
    setPost(p => ({...p, likes: [...p.likes, like]}))

    const likedPostId = await likePost(postId)
    setPost(p => {
      const _post = {...p}
      const likeIndex = _post.likes.findIndex(([likeId, auth, _tempId]) => _tempId === tempId)
      _post.likes[likeIndex][0] = likedPostId
      return _post
    })
  },[account, principal, likePost, setSelectedNetwork, onWalletModalOpen])

  const removeLikePost = useCallback(async ()=>{
    const likeIndex = post.likes.findIndex(([_, auth]) => getAddress(auth) === account.address)
    const [likedPostId] = post.likes[likeIndex]
    post.likes.splice(likeIndex, 1)
    setPost(p => ({...p, likes: [...post.likes]}))
    setIsLoading(true)
    await unlikePost(likedPostId)
    setIsLoading(false)
  },[post, account, unlikePost])

  const addLikeReply = useCallback(async (replyId) => {
    if (!(account && principal)) {
      setSelectedNetwork()
      onWalletModalOpen()
      return
    }
    const tempId = getTempId()
    const like = [null, getAuthentication(account.address, account.type), tempId]
    const replyIndex = post.replies.findIndex(r => r.reply_id === replyId)
    post.replies[replyIndex].likes.push(like)
    setPost(p => ({...p, replies: [...post.replies]}))
    const likedPostId = await likeReply(replyId)

    setPost(p => {
      const _post = {...p}
      const replyIndex = _post.replies.findIndex(r => r.reply_id === replyId)
      const likeIndex = _post.replies[replyIndex].likes.findIndex(([likeId, auth, _tempId]) => _tempId === tempId)
      _post.replies[replyIndex].likes[likeIndex][0] = likedPostId
      return _post
    })
  },[post, account, principal, likeReply, onWalletModalOpen, setSelectedNetwork])

  const removeLikeReply = useCallback(async (replyId) => {
    const replyIndex = post.replies.findIndex(r => r.reply_id === replyId)
    const likeIndex = post.replies[replyIndex].likes.findIndex(([_, auth]) => getAddress(auth) === account.address)
    const [likedReplyId] = post.replies[replyIndex].likes[likeIndex]
    post.replies[replyIndex].likes.splice(likeIndex, 1)
    setPost(p => ({...p, replies: [...post.replies]}))
    setRemovedLikeReply(replyId)
    await unlikeReply(likedReplyId)
    setRemovedLikeReply()
  },[post, account, unlikeReply])

  const isAdmin = useMemo(()=> profile?.roles?.some(r => r.hasOwnProperty('Admin') ),[profile])

  const isLikedPost = useMemo(()=>{
    if(!account || !post) {
      return false
    }
    return post.likes.some(([_, auth]) => {
      return getAddress(auth) === account.address
    })
  } ,[account, post])

  const isLikedReply = useCallback((reply) => {
    if(!account || !reply) {
      return false
    }

    return reply.likes.some(([_, auth]) => getAddress(auth) === account.address)
  } ,[account])

  useEffect(() => {
    if (childActor) {
			getData()
    }
	}, [getData, childActor])

  if (!post) return <Spinner/>

  return <Box>
      {post ? 
        <Box mt="20px" padding="40px">
          <Flex mt="40px" mb="20px" justifyContent="center" alignItems="center">
            <IconButton icon={<FontAwesomeIcon icon={faArrowLeft} />} onClick={() =>navigate(-1)} disabled={!canGoBack}/>
            <Heading ml="40px" display="inline-block">{post.title}</Heading>
            {isAdmin && post.status.hasOwnProperty("Hidden") && <Tag ml="10px" colorScheme='orange' size={'md'}>Hidden</Tag>}
            <Text ml="auto">{timeSince(post.timestamp)}</Text>
          </Flex>
            <Flex mb="20px" padding="20px 60px" alignItems="center">
            <Jazzicon diameter={20} seed={getSeedFromAuthentication(post.authentication)} />
            <Link as={RouterLink} to={`/user/${getAuthenticationType(post.authentication).toLocaleLowerCase()}/${getAddress(post.authentication)}`}>
              <Text fontWeight={'bold'} ml="20px">{capitalizeFirstLetter(addressToName(getAddress(post.authentication)))}</Text>
            </Link>
          </Flex>
          <Box mb="40px" padding="20px 60px">
          <Box textAlign="start" className="markdown-body">
            <Markdown>{post.description}</Markdown>
          </Box>
          <Flex>
            <Flex alignItems="center" justifyContent="space-between" ml="auto" w="36px">
              {isLikedPost ?
                <IconButton isDisabled={post.likes.some(([likeId, _]) => likeId === null)} onClick={() => removeLikePost()} variant={'link'} _focus={{boxShadow: 'none'}} color={'red.300'} minW="2" icon={<FontAwesomeIcon icon={faHeart} />} /> 
                :
                <IconButton isDisabled={isLoading} onClick={() => addLikePost(post.post_id)} variant={'link'} color={'gray.300'} _focus={{boxShadow: 'none'}} minW="2" icon={<FontAwesomeIcon icon={faHeart} />} /> 
              }
              {(post.likes.some(([likeId, _]) => likeId === null) || isLoading) && 
                <Box ml="10px" mr="10px">
                  <Spinner size={'xs'} color={'gray.600'}/>
                </Box>
              }
              {post.likes.length > 0 && <Button onClick={onPostLikeModalOpen} _focus={{boxShadow: 'none'}} color={'gray.600'} minW="2" variant="link" >{post.likes.length}</Button>}
            </Flex>
            {isAdmin && 
              <>
                {post.status.hasOwnProperty("Visible") ? 
                  <IconButton onClick={() => changePostVisibility(post.post_id, 'Hidden')}  variant={'ghost'} ml="10px" icon={<FontAwesomeIcon icon={faEyeSlash}/>} /> 
                  :
                  <IconButton  onClick={() => changePostVisibility(post.post_id, 'Visible')} variant={'ghost'} ml="10px"  icon={<FontAwesomeIcon icon={faEye}/>} />
                }
              </>
            }
          </Flex>
        </Box>
          <Divider mb="10px"/>
          <Box mb="40px">
            {post.replies.length > 0 ? post.replies.map((r, i) => 
              <Flex opacity={r.status.hasOwnProperty('Hidden') ? '0.4' : '1'} key={r.reply_id} flexDirection={'column'}  borderBottom="1px solid #00000010" padding="20px">
                <Flex flexDirection={'row'} alignItems={'center'} mb="6">
                  <Jazzicon diameter={20} seed={getSeedFromAuthentication(r?.authentication)} />
                  <Link as={RouterLink} to={`/user/${getAuthenticationType(r?.authentication).toLocaleLowerCase()}/${getAddress(r?.authentication)}`}>
                    <Text ml="10px" fontWeight="bold">{capitalizeFirstLetter(addressToName(getAddress(r?.authentication)) || '')}</Text>
                  </Link>
                  {!r.reply_id && <Spinner ml="10px" size={'xs'}/>}
                  <Text ml="auto">{timeSince(r?.timestamp)}</Text>
                </Flex>
                <Box textAlign={'start'} className="markdown-body">
                  <Markdown>{r.text}</Markdown>
                </Box>
                <Flex>
                  <Flex alignItems="center" justifyContent="space-between" w="36px" ml="auto">
                    {isLikedReply(r) ? 
                      <IconButton onClick={() => removeLikeReply(r.reply_id)} isDisabled={!r.reply_id || r.likes.some(([likeId, _]) => likeId === null)} variant={'link'} _focus={{boxShadow: 'none'}} color={'red.300'} minW="2" icon={<FontAwesomeIcon icon={faHeart} />} />
                    :
                      <IconButton onClick={() => addLikeReply(r.reply_id)} isDisabled={!r.reply_id || r.reply_id === removedLikeReply} variant={'link'} _focus={{boxShadow: 'none'}} color={'gray.300'} minW="2" icon={<FontAwesomeIcon icon={faHeart} />} /> 
                    }
                    {(r.likes.some(([likeId, _]) => likeId === null) || r.reply_id === removedLikeReply) && 
                      <Box ml="10px" mr="10px">
                        <Spinner size={'xs'} color={'gray.600'}/>
                      </Box>
                    }
                    {r.likes.length > 0 && <Button onClick={()=>{setReplyLikes(r.likes);onReplyLikeModalOpen()}} _focus={{boxShadow: 'none'}} color={'gray.600'} minW="2" variant="link">{r.likes.length}</Button>}
                  </Flex>
                  {isAdmin &&
                    <>
                      {r.status.hasOwnProperty('Visible') ? 
                        <IconButton onClick={()=> changeReplyVisibility(r.reply_id, 'Hidden')} variant={'ghost'} ml="8px" icon={<FontAwesomeIcon icon={faEyeSlash}/>} /> 
                        :
                        <IconButton onClick={()=> changeReplyVisibility(r.reply_id, 'Visible')} variant={'ghost'} ml="8px" icon={<FontAwesomeIcon icon={faEye}/>} />
                      }
                    </>
                  }
                </Flex>
              </Flex>
            ) : <Text textAlign="center">No replies yet</Text>}
          </Box>
          {isPreview ? 
					  <Box minH="200px" mb="10px" className='markdown-body' textAlign={'start'}>
              {replyText.length > 0 ? <Markdown>{replyText}</Markdown>: <Text>Nothing to preview</Text>}
            </Box> 
            :
            <Box mb="10px" >
              <ToolBar setContent={setReplyText} textAreaRef={textAreaRef} style={{display: 'flex', flexDirection: 'row'}}/>
              <Editor content={replyText} setContent={setReplyText} textAreaRef={textAreaRef} placeholder={"Reply to the post"} style={{minHeight: '200px'}} /> 
            </Box>
				  }
          <Flex textAlign="end" >
            <Button mr="auto" variant="ghost" onClick={() => setIsPreview((p)=>!p)}>{!isPreview ? 'Preview': 'Markdown'}</Button>
            <Button mr="20px" onClick={() => replyToPost(post)}>Submit</Button>
          </Flex>
        </Box> :
        <Spinner/>}
        <LikesModal isOpen={isPostLikeModalOpen} onClose={onPostLikeModalClose} likes={post.likes} title={"Post likes"}/>
        <LikesModal isOpen={isReplyLikeModalOpen} onClose={()=> {setReplyLikes([]);onReplyLikeModalClose()}} likes={replyLikes} title={"Reply likes"}/>
    </Box>
}
export default PostContainer
