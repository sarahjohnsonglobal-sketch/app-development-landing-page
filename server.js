const http = require('http');
const fs = require('fs');
const path = require('path');

let PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = __dirname;
const TESTMIONAL_DIR = path.resolve(__dirname, '..', 'testmional');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let safePath = decodeURIComponent(parsedUrl.pathname);

  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const normalizedPath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, normalizedPath);

  // If path starts with /testmional, resolve from sibling testmional folder
  if (normalizedPath.startsWith('testmional') || normalizedPath.startsWith('\\testmional')) {
    filePath = path.join(path.dirname(PUBLIC_DIR), normalizedPath);
  }

  // Check if file exists, if not check testmional assets fallback
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const fallbackPath = path.join(TESTMIONAL_DIR, normalizedPath);
    if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).isFile()) {
      filePath = fallbackPath;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${safePath}`);
      return;
    }
  }

  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const range = req.headers.range;
  if (range && (ext === '.mp4' || ext === '.webm')) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
    const chunksize = (end - start) + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });
    stream.pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stats.size,
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
});

function startServer(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  AlgoFort Landing Page Server is RUNNING!`);
    console.log(`  Link: http://localhost:${port}/`);
    console.log(`======================================================\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is in use, trying ${PORT + 1}...`);
    PORT++;
    startServer(PORT);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);
