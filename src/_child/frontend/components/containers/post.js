import { useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Spinner, Box, Heading, Tag } from '@chakra-ui/react'
import { Text, Flex, Button, IconButton, Divider } from '@chakra-ui/react'
import { useDisclosure } from '@chakra-ui/react'
import Jazzicon from 'react-jazzicon'

import { timeSince } from '../../utils/time'
import { addressShort, getAddress, getSeedFromAuthentication, getAuthentication } from '../../utils/address'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faEyeSlash, faEye, faHeart } from '@fortawesome/free-solid-svg-icons'

import { ChildContext } from '../../store/child'
import { IdentityContext } from '../../store/identity'

import { useNavigate, useParams, useLocation } from 'react-router-dom'
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
	const [post, setPost] = useState()
  
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

		const reply = await createReply(p.post_id, replyText)
		
		setPost(h => ({...h, replies: [...h.replies, reply]}))
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
    const likedPostId = await likePost(postId)
    const like = [likedPostId, getAuthentication(account.address, account.type)]
    setPost(p => ({...p, likes: [...p.likes, like]}))
  },[account, principal, likePost, setSelectedNetwork, onWalletModalOpen])

  const removeLikePost = useCallback(async ()=>{
    const likeIndex = post.likes.findIndex(([_, auth]) => getAddress(auth) === account.address)
    const [likedPostId] = post.likes[likeIndex]
    post.likes.splice(likeIndex, 1)
    setPost(p => ({...p, likes: [...post.likes]}))
    await unlikePost(likedPostId)
  },[post, account, unlikePost])

  const addLikeReply = useCallback(async (replyId) => {
    if (!(account && principal)) {
      setSelectedNetwork()
      onWalletModalOpen()
      return
    }

    const likedPostId = await likeReply(replyId)
    const like = [likedPostId, getAuthentication(account.address, account.type)]
    const replyIndex = post.replies.findIndex(r => r.reply_id === replyId)
    post.replies[replyIndex].likes.push(like)
    setPost(p => ({...p, replies: [...post.replies]}))
  },[post, account, principal, likeReply, onWalletModalOpen, setSelectedNetwork])

  const removeLikeReply = useCallback(async (replyId) => {
    const replyIndex = post.replies.findIndex(r => r.reply_id === replyId)
    const likeIndex = post.replies[replyIndex].likes.findIndex(([_, auth]) => getAddress(auth) === account.address)
    const [likedReplyId] = post.replies[replyIndex].likes[likeIndex]
    post.replies[replyIndex].likes.splice(likeIndex, 1)
    setPost(p => ({...p, replies: [...post.replies]}))
    await unlikeReply(likedReplyId)
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
            <Text ml="20px">{getAddress(post.authentication)}</Text>
          </Flex>
          <Box mb="40px" padding="20px 60px">
          <Box textAlign="start" className="markdown-body">
            <Markdown>{post.description}</Markdown>
          </Box>
          <Flex>
            <Flex alignItems="center" justifyContent="space-between" ml="auto" w="36px">
              {isLikedPost ?
                <IconButton onClick={() => removeLikePost()} variant={'link'} _focus={{boxShadow: 'none'}} minW="2" icon={<FontAwesomeIcon color="#ff8787"  icon={faHeart} />} /> 
                :
                <IconButton onClick={() => addLikePost(post.post_id)} variant={'link'} _focus={{boxShadow: 'none'}} minW="2" icon={<FontAwesomeIcon color="#c7cdd6"  icon={faHeart} />} /> 
              }
              {post.likes.length > 0 && <Button onClick={onPostLikeModalOpen} _focus={{boxShadow: 'none'}} color="#595958" minW="2" variant="link" >{post.likes.length}</Button>}
            </Flex>
            {isAdmin && 
              <>
                {post.status.hasOwnProperty("Visible") ? 
                  <IconButton onClick={() => changePostVisibility(post.post_id, 'Hidden')}  variant={'ghost'} ml="auto" icon={<FontAwesomeIcon icon={faEyeSlash}/>} /> 
                  :
                  <IconButton  onClick={() => changePostVisibility(post.post_id, 'Visible')} variant={'ghost'} ml="auto"  icon={<FontAwesomeIcon icon={faEye}/>} />
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
                  <Text ml="5px" fontWeight="bold">{addressShort(getAddress(r?.authentication) || '')}</Text>
                  <Text ml="auto">{timeSince(r?.timestamp)}</Text>
                </Flex>
                <Box textAlign={'start'} className="markdown-body">
                  <Markdown>{r.text}</Markdown>
                </Box>
                <Flex>
                  <Flex alignItems="center" justifyContent="space-between" w="36px" ml="auto">
                    {isLikedReply(r) ? 
                      <IconButton onClick={() => removeLikeReply(r.reply_id)} variant={'link'} _focus={{boxShadow: 'none'}} minW="2" icon={<FontAwesomeIcon color="#ff8787"  icon={faHeart} />} />
                    :
                      <IconButton onClick={() => addLikeReply(r.reply_id)} variant={'link'} _focus={{boxShadow: 'none'}} minW="2" icon={<FontAwesomeIcon color="#c7cdd6"  icon={faHeart} />} /> 
                    }
                    {r.likes.length > 0 && <Button onClick={onReplyLikeModalOpen} _focus={{boxShadow: 'none'}} color="#595958" minW="2" variant="link">{r.likes.length}</Button>}
                    <LikesModal isOpen={isReplyLikeModalOpen} onClose={onReplyLikeModalClose} likes={r.likes} title={"Reply likes"}/>
                  </Flex>
                  {isAdmin &&
                    <>
                      {r.status.hasOwnProperty('Visible') ? 
                        <IconButton onClick={()=> changeReplyVisibility(r.reply_id, 'Hidden')} variant={'ghost'} ml="auto" icon={<FontAwesomeIcon icon={faEyeSlash}/>} /> 
                        :
                        <IconButton onClick={()=> changeReplyVisibility(r.reply_id, 'Visible')} variant={'ghost'} ml="auto" icon={<FontAwesomeIcon icon={faEye}/>} />
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
    </Box>
}
export default PostContainer
