const express = require('express');
const Docker = require('dockerode');
const fs = require('fs');

const router = express.Router();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const POSTIZ = process.env.POSTIZ_CONTAINER_NAME || 'postiz-test-app';
const HOST_ENV_FILE = process.env.HOST_ENV_FILE || '/app/.env.stack';

const PROVIDER_ENV_KEYS = new Set([
  'LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET',
  'FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET',
  'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'X_CLIENT_ID', 'X_CLIENT_SECRET',
  'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET',
  'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET',
  'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET',
  'PINTEREST_CLIENT_ID', 'PINTEREST_CLIENT_SECRET',
  'TUMBLR_CLIENT_ID', 'TUMBLR_CLIENT_SECRET',
]);

function readProviderEnvironment() {
  const values = new Map();
  let content = '';
  try { content = fs.readFileSync(HOST_ENV_FILE, 'utf8'); } catch {}

  for (const line of content.split(/\r?\n/)) {
    const separator = line.indexOf('=');
    if (separator < 1 || line.trimStart().startsWith('#')) continue;
    const key = line.slice(0, separator).trim();
    if (PROVIDER_ENV_KEYS.has(key)) values.set(key, line.slice(separator + 1));
  }
  return values;
}

router.post('/restart-postiz', async (_req, res) => {
  try {
    const container = docker.getContainer(POSTIZ);
    const inspect = await container.inspect();
    const providerEnvironment = readProviderEnvironment();
    const existingEnvironment = new Map(inspect.Config.Env.map(value => {
      const separator = value.indexOf('=');
      return [value.slice(0, separator), value.slice(separator + 1)];
    }));

    for (const [key, value] of providerEnvironment) existingEnvironment.set(key, value);
    for (const key of PROVIDER_ENV_KEYS) {
      if (!existingEnvironment.has(key)) existingEnvironment.set(key, '');
    }

    const endpoints = Object.fromEntries(
      Object.entries(inspect.NetworkSettings.Networks).map(([network, settings]) => [network, {
        Aliases: settings.Aliases || [],
      }])
    );
    const config = { ...inspect.Config, Env: [...existingEnvironment].map(([key, value]) => `${key}=${value}`) };

    await container.stop({ t: 15 });
    await container.remove();
    const replacement = await docker.createContainer({
      name: POSTIZ,
      ...config,
      HostConfig: inspect.HostConfig,
      NetworkingConfig: { EndpointsConfig: endpoints },
    });
    await replacement.start();
    res.json({ ok: true, message: `${POSTIZ} recreated with updated provider credentials` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/postiz-logs', async (_req, res) => {
  try {
    const container = docker.getContainer(POSTIZ);
    const logs = await container.logs({ stdout: true, stderr: true, tail: 100 });
    res.type('text').send(logs.toString());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
