const express = require('express');
const Docker = require('dockerode');

const router = express.Router();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

router.get('/', async (_req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const stack = containers
      .filter(c => c.Names.some(n => n.includes('postiz')))
      .map(c => ({
        name: c.Names[0].replace('/', ''),
        image: c.Image.split(':')[0].split('/').pop(),
        state: c.State,
        status: c.Status,
        health: c.Status.includes('healthy') && !c.Status.includes('unhealthy')
          ? 'healthy'
          : c.Status.includes('unhealthy') ? 'unhealthy' : 'starting',
      }));
    res.json(stack);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
