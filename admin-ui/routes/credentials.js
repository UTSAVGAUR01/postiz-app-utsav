const express = require('express');
const fs = require('fs');
const { readAll, writeAll } = require('../db');

const router = express.Router();

const ENV_MAP = {
  linkedin:  { id: 'LINKEDIN_CLIENT_ID',  secret: 'LINKEDIN_CLIENT_SECRET' },
  facebook:  { id: 'FACEBOOK_APP_ID',     secret: 'FACEBOOK_APP_SECRET' },
  instagram: { id: 'FACEBOOK_APP_ID',     secret: 'FACEBOOK_APP_SECRET' },
  github:    { id: 'GITHUB_CLIENT_ID',    secret: 'GITHUB_CLIENT_SECRET' },
  google:    { id: 'GOOGLE_CLIENT_ID',    secret: 'GOOGLE_CLIENT_SECRET' },
  youtube:   { id: 'GOOGLE_CLIENT_ID',    secret: 'GOOGLE_CLIENT_SECRET' },
  x:         { id: 'X_CLIENT_ID',         secret: 'X_CLIENT_SECRET' },
  tiktok:    { id: 'TIKTOK_CLIENT_KEY',   secret: 'TIKTOK_CLIENT_SECRET' },
  reddit:    { id: 'REDDIT_CLIENT_ID',    secret: 'REDDIT_CLIENT_SECRET' },
  discord:   { id: 'DISCORD_CLIENT_ID',   secret: 'DISCORD_CLIENT_SECRET' },
  pinterest: { id: 'PINTEREST_CLIENT_ID', secret: 'PINTEREST_CLIENT_SECRET' },
  tumblr:    { id: 'TUMBLR_CLIENT_ID',    secret: 'TUMBLR_CLIENT_SECRET' },
  openai:    { token: 'OPENAI_API_KEY' },
};

router.get('/providers', (_req, res) => res.json(Object.keys(ENV_MAP)));

router.get('/', (_req, res) => {
  const creds = readAll().map(({ client_secret, ...rest }) => rest);
  res.json(creds);
});

router.post('/', (req, res) => {
  const { provider, client_id, client_secret } = req.body;
  const key = provider?.toLowerCase();
  const map = ENV_MAP[key];
  if (!key || !map || !client_id)
    return res.status(400).json({ error: 'a supported provider and client_id are required' });

  const creds = readAll();
  const idx = creds.findIndex(c => c.provider === key);
  const isTokenOnly = !!map.token;
  const secret = isTokenOnly ? '' : (client_secret || (idx >= 0 ? creds[idx].client_secret : ''));
  if (!isTokenOnly && !secret)
    return res.status(400).json({ error: 'client_secret is required when adding a provider' });

  const entry = {
    id: idx >= 0 ? creds[idx].id : Date.now(),
    provider: key,
    client_id,
    client_secret: secret,
    updated_at: new Date().toISOString(),
  };
  if (idx >= 0) creds[idx] = entry; else creds.push(entry);
  writeAll(creds);
  const { client_secret: _s, ...safe } = entry;
  res.json(safe);
});

router.delete('/:provider', (req, res) => {
  writeAll(readAll().filter(c => c.provider !== req.params.provider));
  res.json({ ok: true });
});

router.post('/apply', (req, res) => {
  const envPath = process.env.HOST_ENV_FILE || '/app/.env.stack';
  let content = '';
  try { content = fs.readFileSync(envPath, 'utf8'); } catch {}

  const managedVars = new Set(
    Object.values(ENV_MAP).flatMap(m => [m.id, m.secret, m.token]).filter(Boolean)
  );
  const kept = content.split('\n').filter(line => {
    const key = line.split('=')[0].trim();
    return key && !managedVars.has(key);
  });

  const rows = readAll();
  for (const row of rows) {
    const map = ENV_MAP[row.provider];
    if (map) {
      if (map.token) {
        kept.push(`${map.token}=${row.client_id}`);
      } else {
        kept.push(`${map.id}=${row.client_id}`);
        kept.push(`${map.secret}=${row.client_secret}`);
      }
    }
  }

  fs.writeFileSync(envPath, kept.filter(Boolean).join('\n') + '\n');
  res.json({ ok: true, providers: rows.map(r => r.provider) });
});

module.exports = router;
