import { useEffect, useState } from 'react'
import { useEthers } from '@usedapp/core'
import { getAddress } from '@ethersproject/address'

// returns the address if valid, otherwise returns false
const isAddress = (value) => {
  try {
    return getAddress(value)
  } catch {
    return false
  }
}

// does a reverse lookup (different from ENS look up).
const useENSName = (address) => {
  const { library } = useEthers()

  const [ENSName, setENSName] = useState({
    loading: false,
    ENSName: null,
  })

  useEffect(() => {
    const validated = isAddress(address)
    if (!library || !validated) {
      setENSName({ loading: false, ENSName: null })
      return
    } else {
      let stale = false
      setENSName({ loading: true, ENSName: null })
      library
        .lookupAddress(validated)
        .then((name) => {
          if (!stale) {
            if (name) {
              setENSName({ loading: false, ENSName: name })
            } else {
              setENSName({ loading: false, ENSName: null })
            }
          }
        })
        .catch(() => {
          if (!stale) {
            setENSName({ loading: false, ENSName: null })
          }
        })

      return () => {
        stale = true
      }
    }
  }, [library, address])

  return ENSName
}
export { useENSName }
