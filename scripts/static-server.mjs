/**
 * HTTP/1.1 static server for production (Docker / Railway).
 * The `serve` CLI uses http2.createServer for non-TLS, which often returns 502 behind Railway’s HTTP/1.1 proxy.
 */
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const handler = require('serve-handler');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');

const port = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer((req, res) =>
  handler(req, res, {
    public: distPath,
    single: true,
  })
);

server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on http://0.0.0.0:${port}`);
});
