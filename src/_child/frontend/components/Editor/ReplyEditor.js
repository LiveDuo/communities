import { Box, Textarea, Text } from '@chakra-ui/react'
import Markdown from 'react-markdown'
import 'github-markdown-css/github-markdown-light.css'


const ReplyEditor = ({reply, setReply, isPreview}) => {
    return (
        <Box>
            {!isPreview && <Textarea mb="20px" height="140px" placeholder="Reply to the post" value={reply} onChange={(e) => setReply(e.target.value)}/>}
            {isPreview &&  
                <Box className="markdown-body" mb="20px" height="140px" textAlign="start">
                    {reply?.length > 0 ? <Markdown>{reply}</Markdown> : <Text textAlign="start">Nothing to preview</Text>}
                </Box> 
            }
        </Box>
    )
}

export default ReplyEditor