const http = require ('http')
const url = require ('url')

const port = 5000

const getInfoRefs = (_req, res) => {

  res.setHeader ('Content-Type', `application/x-git-upload-pack-advertisement`)
  
  res.write(Buffer.from('30 30 31 65 23 20 73 65 72 76 69 63 65 3d 67 69 74 2d 75 70 6c 6f 61 64 2d 70 61 63 6b 0a'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 30 30'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 31 30 64 30 65 36 30 62 39 61 64 64 33 39 32 63 64 31 32 34 66 62 66 38 65 39 39 34 62 64 62 62 64 65 37 61 33 31 39 32 35 37 32 20 48 45 41 44 00 6d 75 6c 74 69 5f 61 63 6b 20 74 68 69 6e 2d 70 61 63 6b 20 73 69 64 65 2d 62 61 6e 64 20 73 69 64 65 2d 62 61 6e 64 2d 36 34 6b 20 6f 66 73 2d 64 65 6c 74 61 20 73 68 61 6c 6c 6f 77 20 64 65 65 70 65 6e 2d 73 69 6e 63 65 20 64 65 65 70 65 6e 2d 6e 6f 74 20 64 65 65 70 65 6e 2d 72 65 6c 61 74 69 76 65 20 6e 6f 2d 70 72 6f 67 72 65 73 73 20 69 6e 63 6c 75 64 65 2d 74 61 67 20 6d 75 6c 74 69 5f 61 63 6b 5f 64 65 74 61 69 6c 65 64 20 6e 6f 2d 64 6f 6e 65 20 73 79 6d 72 65 66 3d 48 45 41 44 3a 72 65 66 73 2f 68 65 61 64 73 2f 6d 61 73 74 65 72 20 6f 62 6a 65 63 74 2d 66 6f 72 6d 61 74 3d 73 68 61 31 20 61 67 65 6e 74 3d 67 69 74 2f 32 2e 33 33 2e 30 0a'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 33 65 30 65 36 30 62 39 61 64 64 33 39 32 63 64 31 32 34 66 62 66 38 65 39 39 34 62 64 62 62 64 65 37 61 33 31 39 32 35 37 32 20 72 65 66 73 2f 68 65 61 64 73 2f 6d 61 73 74 65 72'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 30 30'.replaceAll(' ', ''), 'hex'))

  res.end()

}

const getServiceRpc = (_req, res) => {

  res.setHeader('Content-Type', 'application/x-git-upload-pack-result')  
  
  res.write(Buffer.from('30 30 30 38 4e 41 4b 0a'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 32 33 02 45 6e 75 6d 65 72 61 74 69 6e 67 20 6f 62 6a 65 63 74 73 3a 20 33 2c 20 64 6f 6e 65 2e 0d'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 32 32 02 43 6f 75 6e 74 69 6e 67 20 6f 62 6a 65 63 74 73 3a 20 20 33 33 25 20 28 31 2f 33 29 0d'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 32 32 02 43 6f 75 6e 74 69 6e 67 20 6f 62 6a 65 63 74 73 3a 20 20 36 36 25 20 28 31 2f 33 29 0d'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 32 33 02 43 6f 75 6e 74 69 6e 67 20 6f 62 6a 65 63 74 73 3a 20 20 31 30 30 25 20 28 31 2f 33 29 0d'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 33 61 02 54 6f 74 61 6c 20 33 20 28 64 65 6c 74 61 20 30 29 2c 20 72 65 75 73 65 64 20 30 20 28 64 65 6c 74 61 20 30 29 2c 20 70 61 63 6b 2d 72 65 75 73 65 64 20 30 0a'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 65 66 01'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('50 41 43 4b 00 00 00 02 00 00 00 03 95 0c 78 9c a5 cc 3d 0a 02 31 10 40 e1 3e a7 98 0b b8 24 9b bf 09 88 08 16 82 b7 98 cc 66 35 90 35 21 c6 c2 db ab 78 04 bb c7 2b be d1 53 82 b4 20 a6 d5 38 65 b4 96 33 4b 62 36 b3 d5 6a 95 68 d9 84 c5 87 48 0e 23 09 7a 8e 5b ed 70 a6 d8 73 2a 70 99 e0 f4 a0 56 61 7f 25 fe c6 b1 d1 ab 51 e1 da db c4 75 3b 80 32 e8 ac f7 01 15 ec 24 4a 29 3e 77 cb 63 a4 bf 10 91 ef 79 64 2a f0 d3 c4 1b 97 41 3d 4e a3 02 78 9c 33 34 30 30 33 31 51 28 49 2d 2e d1 cb 4d 61 d0 7e 7e 2c ea a5 75 c8 ce 0e c7 7c 0d a6 19 1b 76 6c fd c4 dc 0a 00 d8 ad 0e 03 3e 78 9c 53 56 c8 48 cd c9 c9 57 28 cf 2f ca 49 e1 02 00 21 fe 04 aa a2 7b f3 43 3a 83 d9 93 8e 88 84 46 fd bb 25 2e c9 be d2 44'.replaceAll(' ', ''), 'hex'))
  res.write(Buffer.from('30 30 30 30'.replaceAll(' ', ''), 'hex'))

  res.end()

}

const listen = (req, res) => {

  console.log(req.url)

  const reqParsed = url.parse(req.url, true)
  if (reqParsed.pathname === '/info/refs') {
    getInfoRefs(req, res)
  } else if (reqParsed.pathname === '/git-upload-pack') {
    getServiceRpc(req, res)
  }
}

http.createServer(listen).listen(port, () => {
  console.log(`Git server started on http://localhost:${port} ...`)
})
