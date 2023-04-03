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
