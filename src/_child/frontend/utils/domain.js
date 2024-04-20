const isValidDomainName = (domainName) => {
    return /^(?!-)[A-Za-z0-9-]+([-.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/i.test(domainName)
}

export { isValidDomainName }
