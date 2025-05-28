import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import cookieParser from 'cookie-parser'

const app = express()
app.use(cookieParser())

app.use((req, res, next) => {
  console.log('➡️ Incoming Request:', {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    query: req.query,
    cookies: req.cookies
  });
  next();
});

app.get('/', (req, res) => {
  res.send('Reverse Proxy Running. Use /proxy-example to forward requests.');
});

app.use(
  '/storeapp',
  createProxyMiddleware({
    target: 'https://storeappwave.mschost.net',
    changeOrigin: true,
    secure: false,
    headers: {
      Host: 'storeappwave.mschost.net',
    },
    logLevel: 'debug',
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log('🔵 Proxy Request:', {
          path: proxyReq.path,
          headers: proxyReq.getHeaders()
        });
      },
      proxyRes: (proxyRes) => {
        console.log('🟢 Proxy Response:', {
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers
        });
        if (proxyRes.headers['set-cookie']) {
          const cookies = proxyRes.headers['set-cookie'].map((cookie) => {
            if (cookie.startsWith('site_id=')) {
              console.log('🟢 Cookie:', cookie);
              return cookie
                .replace(/samesite=none/g, 'samesite=lax')
                .replace(/domain=.mschost.net/g, '')
                .replace(/secure/g, '')
            }
            return cookie
          })
          proxyRes.headers['set-cookie'] = cookies
        }
      },
      error: (err, req, res) => {
        console.error('🔴 Proxy Error:', err);
        res.status(500).json({ 
          error: 'Proxy failed',
          message: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      }
    },
    pathRewrite: {
      '^/storeapp': '',
    },
  })
)

export default app
