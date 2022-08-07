const isLocalhost = () => {
    const h = window.location.host
    return h.startsWith('localhost') || h.startsWith('127.0.0.1')
}
export { isLocalhost }
