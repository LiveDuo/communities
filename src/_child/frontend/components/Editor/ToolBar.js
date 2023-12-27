import { useCallback } from 'react'
import { Box, ButtonGroup, IconButton } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeading, faList, faQuoteLeft,faListOl, faBold, faItalic, faUnderline, faLink, faCode, faStrikethrough } from '@fortawesome/free-solid-svg-icons'
import { REGEX_NUMBER_LIST, REGEX_BULLET_LIST } from '../../utils/editor'


const getSymbol = (type) => {
    if(type === 'heading') return '###'
    else if(type === 'bullet-list') return '-'
    else if(type === 'quote') return '>'
    else if(type === 'number-list') return '1.'
    else if(type ==='bold') return ['**','**']
    else if(type ==='italic') return ['_','_']
    else if(type ==='underline') return ['<u>','</u>']
    else if(type ==='link') return ['[','](url)']
    else if(type ==='code') return ['`','`']
    else if(type ==='strikethrough') return ['~~','~~']
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
const ToolBar = ({ textAreaRef, setContent, style }) => {
    const addToBeginningOfLine = useCallback((type) => {
        const selectionStart = textAreaRef.current.selectionStart
        const content = textAreaRef.current.value
        const splitLines = content.slice(0, selectionStart).split('\n')
        splitLines[splitLines.length - 1] = getLineWithSymbol(splitLines, type)
        const joinedLines = splitLines.join('\n')
        setContent(joinedLines.concat(content.slice(selectionStart)))
        textAreaRef.current.focus()
    }, [textAreaRef, setContent])

    const addToSelection = useCallback((type) => {
        const content = textAreaRef.current.value
        let start = textAreaRef.current.selectionStart
        let end = textAreaRef.current.selectionEnd
        const [symbolStart, symbolEnd] = getSymbol(type)
        if(start === end) {
            while(start > 0 && content[start - 1] !== '\n' && content[start - 1] !== ' '){
                start--
            }
            while(end < content.length && content[end] !== '\n' && content[end] !== ' '){
                end++
            }
        }
        const beforeSelection = content.substring(0, start)
        const afterSelection = content.substring(end)
        const selected = content.substring(start, end)
        const contentModified = beforeSelection + symbolStart + selected + symbolEnd + afterSelection
        setContent(contentModified)
        textAreaRef.current.focus()
    }, [textAreaRef, setContent])


    return(
        <Box mb="2"  bg={'#e9edf5'} style={{...style}}>
            <ButtonGroup variant='outline' spacing={'0'}>
                <IconButton onClick={() => addToBeginningOfLine('heading')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faHeading}/>} />
                <IconButton onClick={() => addToSelection('bold')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faBold} />} />
                <IconButton onClick={() => addToSelection('italic')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faItalic} />} />
                <IconButton onClick={() => addToSelection('underline')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faUnderline} />} />
                <IconButton onClick={() => addToSelection('strikethrough')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faStrikethrough} />} />
                <IconButton onClick={() => addToBeginningOfLine('quote')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faQuoteLeft} />} />
                <IconButton onClick={() => addToSelection('link')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faLink} />} />
                <IconButton onClick={() => addToSelection('code')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faCode} />} />
                <IconButton onClick={() => addToBeginningOfLine('number-list')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faListOl} />} />
                <IconButton onClick={() => addToBeginningOfLine('bullet-list')} variant={'ghost'} size={'md'} icon={<FontAwesomeIcon icon={faList} />} />
            </ButtonGroup>
        </Box>
    )
}

export default ToolBar