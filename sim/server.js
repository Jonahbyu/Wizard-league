// sim/server.js — tiny results-saver for Wizard League sim
// Run: node sim/server.js
// Saves each sim run to sim/last_results.json (latest) and sim/results_history.json (last 10).

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT          = 3456;
const RESULTS_FILE  = path.join(__dirname, 'last_results.json');
const HISTORY_FILE  = path.join(__dirname, 'results_history.json');
const HISTORY_MAX   = 10;

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
        const parsed = JSON.parse(body);

        // Always overwrite last_results.json with the latest run
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(parsed, null, 2), 'utf8');

        // Maintain rolling history of last 10 runs
        let history = [];
        try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch(e) {}
        if (!Array.isArray(history)) history = [];
        history.unshift(parsed);
        if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');

        console.log(`[${new Date().toLocaleTimeString()}] Saved → last_results.json  (${parsed.cfg?.element}, ${parsed.cfg?.nRuns} runs, ${(parsed.stats?.winRate * 100).toFixed(1)}% win)  [history: ${history.length}/${HISTORY_MAX}]`);
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
  console.log(`History (last ${HISTORY_MAX}) saved to: ${HISTORY_FILE}`);
  console.log('Waiting for sim runs...\n');
});
