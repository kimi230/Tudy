import http from 'http'
import pkg from 'http-proxy'
const { createProxyServer } = pkg

const proxy = createProxyServer({ ws: true })

const TARGETS = {
  cn: 'http://localhost:4101',
  jp: 'http://localhost:4102',
  en: 'http://localhost:4100',
}

function getTarget(url = '') {
  if (url.startsWith('/Tudy/cn')) return TARGETS.cn
  if (url.startsWith('/Tudy/jp')) return TARGETS.jp
  return TARGETS.en
}

const server = http.createServer((req, res) => {
  proxy.web(req, res, { target: getTarget(req.url) }, (err) => {
    res.writeHead(502)
    res.end('Dev proxy error: ' + err.message)
  })
})

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, { target: getTarget(req.url) })
})

server.listen(4000, () => {
  console.log('  Dev proxy running on http://localhost:4000')
  console.log('  http://localhost:4000/Tudy/      → English  (4100)')
  console.log('  http://localhost:4000/Tudy/cn/   → Chinese  (4101)')
  console.log('  http://localhost:4000/Tudy/jp/   → Japanese (4102)')
})
