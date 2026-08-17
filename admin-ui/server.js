const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const httpProxy = require('http-proxy');
const path = require('path');

const credentialsRouter = require('./routes/credentials');
const healthRouter = require('./routes/health');
const dockerRouter = require('./routes/docker-ops');
const aiContentRouter = require('./routes/ai-content');

const app = express();
const PORT = process.env.PORT || 3001;
const POSTIZ_URL = process.env.POSTIZ_INTERNAL_URL || 'http://postiz:5000';

const proxy = httpProxy.createProxyServer({ changeOrigin: true });
proxy.on('error', (err, req, res) => {
  res.status(502).json({ error: 'Postiz unreachable: ' + err.message });
});

// Forward Postiz response headers (JWT on login)
proxy.on('proxyRes', (proxyRes, req, res) => {
  const authHeader = proxyRes.headers['auth'];
  if (authHeader) res.setHeader('x-postiz-auth', authHeader);
});

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
// express.json() only on admin routes — applying it globally consumes the body
// stream before http-proxy can forward POST requests to Postiz
app.use('/api/credentials', express.json(), credentialsRouter);
app.use('/api/health', healthRouter);
app.use('/api/docker', express.json(), dockerRouter);
app.use('/api/ai', express.json(), aiContentRouter);

// Proxy /postiz/* → Postiz container (strip the /postiz prefix)
app.use('/postiz', (req, res) => {
  const auth = req.headers['auth'] || req.cookies?.auth;
  if (auth) req.headers['auth'] = auth;
  proxy.web(req, res, { target: POSTIZ_URL });
});

// Serve Vite build in production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Admin UI → http://localhost:${PORT}`));
