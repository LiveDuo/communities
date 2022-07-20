const http = require('http')
const url = require('url')

const port = 8080

const server = http.createServer((sreq, sres) => {
	console.log(sreq.url)

	const { pathname } = url.parse(sreq.url)

  const childPrincipalid = pathname.split('/')[1]
  const newPathname = '/' + pathname.split('/').slice(2, 4).join('/')
	
  const opts = {
    host: '127.0.0.1',
    port: 8000,
    path: newPathname + `?canisterId=${childPrincipalid}`,
    method: sreq.method,
    headers: sreq.headers,
  }

  const creq = http.request(opts, (cres) => {
    sres.writeHead(cres.statusCode, cres.headers)
    cres.pipe(sres)
  })

  sreq.pipe(creq)
})
exports.server = server

server.listen(port, 'localhost', () => {
  console.log(`Starting proxy on port ${port}`)
})
