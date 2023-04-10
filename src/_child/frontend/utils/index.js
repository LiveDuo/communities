import { Buffer } from 'buffer'

window.Buffer = Buffer

const isLocalhost = (h) => {
    return h.endsWith('localhost') || h.endsWith('127.0.0.1')
}
export { isLocalhost }

const getHostnameFromUrl = (hostUrl) => {
    try {
        const url = new URL(hostUrl)
        return url.hostname
    } catch (error) {
        return ''
    }
}
export { getHostnameFromUrl }



const getAddress = (authentication) => {
    if(authentication.Evm) {
        return authentication.Evm.address
    } else if(authentication.Svm) {
        return authentication.Svm.address
    }
}

export { getAddress }

const addressShort = (a) => `${a.substring(0, 8)}...${a.substring(42 - 6, 42)}`

export { addressShort }