const isValidDomainName = (domainName) => {
    return /^(?!-)[A-Za-z0-9-]+([-.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/i.test(domainName)
}

export { isValidDomainName }

const getDomainLastStatus  = (domainStatus) => {
    if (domainStatus.hasOwnProperty('Err')) {
        if(domainStatus.Err.startsWith("missing dns cname record from")) {
            return {color:  'yellow', message: "Waiting DNS", isError: false}
        } else {
            return {color:  'red', message: domainStatus.Err, isError: true}
        }
    } else if (domainStatus.Ok.hasOwnProperty('TimerExpired')) {
        return {color:  'red', message: "Timeout", isError: false}
    } else if (domainStatus.Ok.hasOwnProperty('NotStarted')) {
        return {color:  'yellow', message: "Waiting DNS", isError: false}
    } else if (domainStatus.Ok.hasOwnProperty('PendingOrder')) {
        return {color:  'yellow', message: "Waiting IC", isError: false}
    } else if (domainStatus.Ok.hasOwnProperty('PendingChallengeResponse')) {
        return {color:  'yellow', message: "Waiting IC", isError: false}
    } else if (domainStatus.Ok.hasOwnProperty('PendingAcmeApproval')) {
        return {color:  'yellow', message: "Waiting IC", isError: false}
    } else if (domainStatus.Ok.hasOwnProperty('Available')) {
        return {color:  'green', message: "Ready", isError: false}
    } else if (domainStatus.Ok.hasOwnProperty('Failed')) {
        return {color:  'red', message: "Failed", isError: false}
    } 
}
export { getDomainLastStatus }