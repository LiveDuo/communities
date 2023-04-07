const timeSince = (date) => {
    const s = Math.floor((new Date() - date) / 1000)
    let i = s / 31536000
    if (i > 1) {const x = Math.floor(i); return `${x} year${x > 1 ? 's' : ''} ago`}
    i = s / 2592000
    if (i > 1) {const x = Math.floor(i); return `${x} month${x > 1 ? 's' : ''} ago`}
    i = s / 86400
    if (i > 1) {const x = Math.floor(i); return `${x} day${x > 1 ? 's' : ''} ago`}
    i = s / 3600
    if (i > 1) {const x = Math.floor(i); return `${x} hour${x > 1 ? 's' : ''} ago`}
    i = s / 60
    if (i > 1) {const x = Math.floor(i); return `${x} minute${x > 1 ? 's' : ''} ago`}
    return 'Now'
}
export { timeSince }
