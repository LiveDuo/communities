import { Buffer } from 'buffer'

window.Buffer = Buffer

const getAddress = (authentication) => {
    if(authentication.Evm) {
        return authentication.Evm.address
    } else if(authentication.Svm) {
        return authentication.Svm.address
    } else if(authentication.Ic) {
        return authentication.Ic.principal.toString()
    }
}
export { getAddress }

const addressShort = (a) => `${a.substring(0, 8)}...${a.substring(a.length - 6, a.length)}`
export { addressShort }

const getExplorerUrl = (address) => {
    if (address.Evm) 
        return `https://etherscan.io/address/${address.Evm.address}`
    else if(address.Svm) 
        return `https://explorer.solana.com/address/${address.Svm.address}`
    else if(address.Ic) 
        return `https://www.icscan.io/principal/${address.Ic.principal}`
}

export { getExplorerUrl }


const getSeedFromAuthentication = (authentication) => {
    if(authentication.Evm) {
        return Buffer.from(authentication.Evm.address.slice(2)).at(0)
    } else if(authentication.Svm) {
        return Buffer.from(authentication.Svm.address).at(0)
    } else if(authentication.Ic) {
        return Buffer.from(authentication.Ic.principal.toString()).at(0)
    }
}


export { getSeedFromAuthentication }

const getSeedFromAccount = (account) => {
    if(account.type === 'Evm') {
        return Buffer.from(account.address.slice(2)).at(0)
    } else if(account.type === 'Svm') {
        return Buffer.from(account.address).at(0)
    } else if(account.type === 'Ic') {
        return Buffer.from(account.address).at(0)
    }
}


export { getSeedFromAccount }