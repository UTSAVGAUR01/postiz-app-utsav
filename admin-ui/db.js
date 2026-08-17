const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/app/data';
const CREDS_FILE = path.join(DATA_DIR, 'credentials.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8')); } catch { return []; }
}

function writeAll(data) {
  ensureDir();
  fs.writeFileSync(CREDS_FILE, JSON.stringify(data, null, 2));
}

module.exports = { readAll, writeAll };
