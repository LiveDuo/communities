import { Box, Textarea, Text } from '@chakra-ui/react'
import Markdown from 'react-markdown'
import 'github-markdown-css'
import '../../style/markdown.css'


const PostEditor = ({description, setDescription, isPreview}) => {
    return (
        <Box>
            {!isPreview &&  <Textarea  height="200px" value={description} placeholder="More details about the post" onChange={(e) => setDescription(e.target.value)}/>}
            {isPreview &&
                <Box className="markdown-body" minH="200px">
                    {description?.length > 0 ? <Markdown>{description}</Markdown> : <Text textAlign="start">Nothing to preview</Text>}
                </Box>
            }
        </Box>
    )
}

export default PostEditor