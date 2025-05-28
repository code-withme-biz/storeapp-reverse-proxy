import express from 'express'
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware'
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
    selfHandleResponse: true,
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
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        console.log('🟢 Proxy Response:', {
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers
        });
        try {
          const contentType = proxyRes.headers['content-type'];
          let response = responseBuffer.toString('utf8');
  
          if (contentType?.includes('text/html')) {
            response = response.replace(
              /(href|src|action)=["'](\/[^"']*)["']/g,
              '$1="/storeapp$2"'
            );
  
            if (!response.includes('<base href')) {
              response = response.replace(
                /<head([^>]*)>/i,
                `<head$1><base href="/storeapp/">`
              );
            }
          }
  
          if (proxyRes.headers['set-cookie']) {
            const newCookies = proxyRes.headers['set-cookie'].map(cookie => {
              return decodeURIComponent(cookie)
                .replace(/domain=.mschost.net/gi, '')
                .replace(/samesite=none/gi, 'samesite=lax')
                .replace(/\bsecure\b/gi, '')
                .replace(/path=\/[^;]*/gi, 'path=/')
                .replace(/expires=[^;]+/gi, 'expires=Fri, 31 Dec 9999 23:59:59 GMT');
            });
            res.setHeader('set-cookie', newCookies);
          }
  
          return response;
        } catch (error) {
          console.error('Response modification error:', error);
          return responseBuffer;
        }
      }),
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

    // Other important options
    secure: false, // Only for development
    preserveHeaderKeyCase: true,
    followRedirects: true,
    autoRewrite: true,
    xfwd: true // Forward headers
  })
)

app.use('/storeapp/:asset(*)', createProxyMiddleware({
  target: 'https://storeappwave.mschost.net',
  changeOrigin: true,
  pathRewrite: {
    '^/storeapp': ''
  }
}));

export default app
