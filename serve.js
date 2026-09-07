/* ==========================================================================
   serve.js — tiny static server, no dependencies.

     node serve.js            → http://localhost:8777
     node serve.js 9000       → http://localhost:9000

   You do not need this for normal OBS use: browser sources can load the
   HTML files straight from disk. Run it when you want a real http:// origin,
   which the 'eventsub' source needs in order to call the Twitch API.
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = parseInt(process.argv[2], 10) || 8777;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  /* Any directory URL gets its index.html — "/" and "/dist/nikos/" alike. */
  if (rel.endsWith('/')) rel += 'index.html';

  /* Keep requests inside the folder — no ../.. escapes. */
  const file = path.join(root, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(root)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — ' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}).listen(port, () => {
  console.log('Overlays: http://localhost:' + port);
  console.log('Control room ready. Ctrl+C to stop.');
});
