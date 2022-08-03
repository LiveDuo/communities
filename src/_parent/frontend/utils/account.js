import { Principal } from '@dfinity/principal'

import CryptoJS from 'crypto-js'
import crc32 from 'buffer-crc32'
import { Buffer } from 'buffer'

window.Buffer = Buffer

const ACCOUNT_DOMAIN_SEPERATOR = '\x0Aaccount-id'
const SUB_ACCOUNT_ZERO = Buffer.alloc(32)

const wordToByteArray = (word, length) => {
  const byteArray = []
  const xFF = 0xff
  if (length > 0) byteArray.push(word >>> 24)
  if (length > 1) byteArray.push((word >>> 16) & xFF)
  if (length > 2) byteArray.push((word >>> 8) & xFF)
  if (length > 3) byteArray.push(word & xFF)

  return byteArray
}

const wordArrayToByteArray = (wordArray, length) => {
  if (
    wordArray.hasOwnProperty('sigBytes') &&
    wordArray.hasOwnProperty('words')
  ) {
    length = wordArray.sigBytes
    wordArray = wordArray.words
  }

  let result = []
  let bytes
  let i = 0
  while (length > 0) {
    bytes = wordToByteArray(wordArray[i], Math.min(4, length))
    length -= bytes.length
    result = [...result, bytes]
    i++
  }
  return [].concat.apply([], result)
}

const intToHex = (val) =>
  val < 0 ? (Number(val) >>> 0).toString(16) : Number(val).toString(16)

const generateChecksum = (hash) => {
  const crc = crc32.unsigned(Buffer.from(hash))
  const hex = intToHex(crc)
  return hex.padStart(8, '0')
}


const byteArrayToWordArray = (byteArray) => {
  const wordArray = []
  let i
  for (i = 0; i < byteArray.length; i += 1) {
    wordArray[(i / 4) | 0] |= byteArray[i] << (24 - 8 * i)
  }
  // eslint-disable-next-line
  const result = CryptoJS.lib.WordArray.create(
    wordArray,
    byteArray.length
  )
  return result
}

const getAccountId = (
  principal,
  subAccount
) => {
  const sha = CryptoJS.algo.SHA224.create()
  sha.update(ACCOUNT_DOMAIN_SEPERATOR) // Internally parsed with UTF-8, like go does
  sha.update(byteArrayToWordArray(Principal.fromText(principal).toUint8Array()))
  let subBuffer
  if (subAccount) {
    const bufPrincipal = Principal.fromText(subAccount).toUint8Array()
    const bufLen = Buffer.from([bufPrincipal.byteLength])
    const bufFill = Buffer.from(Array.from(Array(32 - bufPrincipal.byteLength - 1), () => 0))
    subBuffer = Buffer.concat([bufLen, bufPrincipal, bufFill])
  } else {
    subBuffer = Buffer.from(SUB_ACCOUNT_ZERO)

  }
  sha.update(byteArrayToWordArray(subBuffer))
  const hash = sha.finalize()

  /// While this is backed by an array of length 28, it's canonical representation
  /// is a hex string of length 64. The first 8 characters are the CRC-32 encoded
  /// hash of the following 56 characters of hex. Both, upper and lower case
  /// characters are valid in the input string and can even be mixed.
  /// [ic/rs/rosetta-api/ledger_canister/src/account_identifier.rs]
  const byteArray = wordArrayToByteArray(hash, 28)
  const checksum = generateChecksum(byteArray)
  const val = checksum + hash.toString()

  return val
}
export { getAccountId }
