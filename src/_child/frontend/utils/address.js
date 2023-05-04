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
