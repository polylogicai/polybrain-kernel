#!/usr/bin/env node
// Polybrain kernel — minimalist progress dashboard
// Serves a single-number/single-bar view at http://localhost:4848
// Reads state from ../../state/progress.json
// No framework, no dependencies, pure Node stdlib.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.POLYBRAIN_DASHBOARD_PORT || 4848);
const PROGRESS_FILE = join(__dirname, '..', '..', 'state', 'progress.json');
const INDEX_FILE = join(__dirname, 'public', 'index.html');

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/' || req.url === '/index.html') {
      const html = await readFile(INDEX_FILE);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(html);
      return;
    }
    if (req.url === '/state') {
      let body;
      try {
        body = await readFile(PROGRESS_FILE, 'utf-8');
      } catch {
        body = JSON.stringify({ complete: 0, stage: 'init', label: '' });
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end();
  } catch (e) {
    res.writeHead(500);
    res.end(String(e?.message || e));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`polybrain-kernel dashboard → http://localhost:${PORT}`);
});
