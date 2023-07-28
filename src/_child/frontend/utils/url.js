const isLocalhost = (h) => h.endsWith('localhost') || h.endsWith('127.0.0.1')
export { isLocalhost }

const isLocal = isLocalhost(window.location.hostname)
export { isLocal }