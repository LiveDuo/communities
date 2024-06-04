
### String to name

```js
const adjectives = ['happy', 'timid', 'vicious']
const animals = ['panda', 'badger', 'antelope']

const principal = 'rrkah-fqaaa-aaaaa-aaaaq-cai'
const ethereum = '0x0000000000000000000000000000000000000000'
const solana = '30000000000000000000000000000000000000000000'

const stringToName = (seed) => {

    const buffer = Buffer.from(seed)
    
    const part1 = buffer.subarray(0, buffer.length / 2)
    const index1 = BigInt('0x' + part1.toString('hex')) % BigInt(adjectives.length)
    
    const part2 = buffer.subarray(buffer.length / 2, buffer.length)
    const index2 = BigInt('0x' + part2.toString('hex')) % BigInt(animals.length)
    
    return `${adjectives[index1]} ${animals[index2]}`
}

console.log('Name:', stringToName(solana))
```
