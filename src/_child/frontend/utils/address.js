import { Buffer } from 'buffer'

window.Buffer = Buffer

const getAddress = (authentication) => {
    if(authentication.Evm) {
        return authentication.Evm.address
    } else if(authentication.Svm) {
        return authentication.Svm.address
    }
}
export { getAddress }

const addressShort = (a) => `${a.substring(0, 8)}...${a.substring(42 - 6, 42)}`
export { addressShort }
