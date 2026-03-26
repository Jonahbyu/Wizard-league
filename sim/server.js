// sim/server.js — tiny results-saver for Wizard League sim
// Run: node sim/server.js
// Saves each sim run to sim/last_results.json so Claude can review it.

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT         = 3456;
const RESULTS_FILE = path.join(__dirname, 'last_results.json');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        // Pretty-print so it's readable
        const parsed = JSON.parse(body);
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
        console.log(`[${new Date().toLocaleTimeString()}] Saved → last_results.json  (${parsed.cfg?.element}, ${parsed.cfg?.nRuns} runs, ${(parsed.stats?.winRate * 100).toFixed(1)}% win)`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch(e) {
        console.error('Save error:', e.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Wizard League sim server — http://127.0.0.1:${PORT}`);
  console.log(`Results will be saved to: ${RESULTS_FILE}`);
  console.log('Waiting for sim runs...\n');
});
