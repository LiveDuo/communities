const isUrlLocalhost = (h) => {
    return h.startsWith('localhost') || h.startsWith('127.0.0.1')
}
export { isUrlLocalhost }

const isLocal = isUrlLocalhost(window.location.hostname)
export { isLocal }

