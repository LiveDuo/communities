import { useCallback } from 'react'
import { Textarea } from '@chakra-ui/react'
import {REGEX_NUMBER_LIST, REGEX_BULLET_LIST, ENTER_KEY_CODE} from '../../utils/editor'

const Editor = ({content, setContent, textAreaRef, placeholder, style}) => {

    const onKeyUp = useCallback((e) => {
        if(e.keyCode === ENTER_KEY_CODE) {
            const selectionStart = e.target.selectionStart
            const content = e.target.value
            const splitLines = content.slice(0, selectionStart).split('\n')
            const lineBefore = splitLines[splitLines.length - 2]
            if(REGEX_BULLET_LIST.test(lineBefore)) {
                splitLines[splitLines.length - 1] = '- '
            } else if(REGEX_NUMBER_LIST.test(lineBefore)) {
                let count = Number(lineBefore.split('.')[0]) + 1
                splitLines[splitLines.length - 1] = `${count}. `
            }
            const joinedLines = splitLines.join('\n')
            setContent(joinedLines.concat(content.slice(selectionStart)))
        }
    }, [setContent])
    return (
        <Textarea onKeyUp={onKeyUp} style={{...style}} ref={textAreaRef}  value={content} placeholder={placeholder} onChange={(e) => setContent(e.target.value)}/>
    )
}

export default Editor