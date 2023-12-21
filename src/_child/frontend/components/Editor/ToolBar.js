import { useCallback } from 'react'
import { Box, ButtonGroup, IconButton } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeading, faList, faQuoteLeft,faListOl } from '@fortawesome/free-solid-svg-icons'
import { REGEX_NUMBER_LIST, REGEX_BULLET_LIST } from '../../utils/editor'


const getSymbol = (type) => {
    if(type === 'heading') return '###'
    else if (type === 'bullet-list') return '-'
    else if (type === 'number-list') return '1.'
    else if (type === 'quote') return '>'
}

const getLineWithSymbol = (lines, type) => {
    const symbol = getSymbol(type)
    let line = `${symbol} ${lines[lines.length - 1]}`
    if((type === 'bullet-list' || type === 'number-list') && lines.length > 1) {
        const lineBefore = lines[lines.length - 2]
        if(REGEX_BULLET_LIST.test(lineBefore) || REGEX_NUMBER_LIST.test(lineBefore)) {
            line = `\n${line}`
        } 
    }
    return line
}
const ToolBar = ({ textAreaRef, setContent }) => {
    const addToBeginningOfLine = useCallback((type) => {
        const selectionStart = textAreaRef.current.selectionStart
        const content = textAreaRef.current.value
        const splitLines = content.slice(0, selectionStart).split('\n')
        splitLines[splitLines.length - 1] = getLineWithSymbol(splitLines, type)
        const joinedLines = splitLines.join('\n')
        setContent(joinedLines.concat(content.slice(selectionStart)))
        textAreaRef.current.focus()
    }, [textAreaRef, setContent])


    return(
        <Box bg={'#e9edf5'} mb="2" >
            <ButtonGroup variant='outline' spacing={'0'} bg={'#e9edf5'}>
                <IconButton onClick={() => addToBeginningOfLine('heading')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faHeading}/>} />
                <IconButton onClick={() => addToBeginningOfLine('bullet-list')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faList} />} />
                <IconButton onClick={() => addToBeginningOfLine('number-list')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faListOl} />} />
                <IconButton onClick={() => addToBeginningOfLine('quote')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faQuoteLeft} />} />
            </ButtonGroup>
        </Box>
    )
}

export default ToolBar