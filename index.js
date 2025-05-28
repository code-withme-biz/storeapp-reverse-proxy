import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import cookieParser from 'cookie-parser'

const app = express()
app.use(cookieParser())

app.use(
  '/',
  createProxyMiddleware({
    target: 'https://storeapp.mschost.net',
    changeOrigin: true,
    onProxyRes: (proxyRes) => {
      if (proxyRes.headers['set-cookie']) {
        const cookies = proxyRes.headers['set-cookie'].map((cookie) => {
          if (cookie.startsWith('site_id=')) {
            return cookie
              .replace(/SameSite=None; Secure/g, 'SameSite=Lax')
              .replace(/Domain=storeapp.mschost.net/g, '')
          }
          return cookie
        })
        proxyRes.headers['set-cookie'] = cookies
      }
    },
    pathRewrite: {
      '^/': '',
    },
  })
)

app.listen(3000, () => console.log('Proxy running on http://localhost:3000'))
