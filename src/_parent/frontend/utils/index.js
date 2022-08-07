const isLocalhost = (h) => {
    return h.startsWith('localhost') || h.startsWith('127.0.0.1')
}
export { isLocalhost }

const getHostFromUrl = (hostUrl) => {
    try {
        const url = new URL(hostUrl)
        return url.host
    } catch (error) {
        return ''
    }
}
export { getHostFromUrl }
