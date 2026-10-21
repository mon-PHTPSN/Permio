// Local diagnostic transport only: exact SDK bytes, fresh connection, no retries.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';

export function safeProofErrorChain(error) {
  const result = [], seen = new Set();
  for (let value = error; value && result.length < 5 && !seen.has(value); value = value.cause) {
    seen.add(value);
    const safe = input => typeof input === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(input) ? input : undefined;
    result.push({ name: safe(value.name), code: safe(String(value.code ?? '')), syscall: safe(value.syscall),
      socketBytesWritten: Number.isSafeInteger(value.socket?.bytesWritten) ? value.socket.bytesWritten : undefined,
      socketBytesRead: Number.isSafeInteger(value.socket?.bytesRead) ? value.socket.bytesRead : undefined });
  }
  return result;
}

export function postLoopbackProof(endpoint, payload, { port = 6302, timeoutMs = 3_600_000, onBodySent = undefined } = {}) {
  assert(['/check', '/prove'].includes(endpoint));
  assert(payload instanceof Uint8Array && payload.length > 0);
  assert(Number.isInteger(port) && port > 0 && port < 65536);
  assert(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 3_600_000);
  return new Promise((resolve, reject) => {
    const req = request(`http://127.0.0.1:${port}${endpoint}`, {
      method: 'POST', agent: false, signal: AbortSignal.timeout(timeoutMs),
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': payload.length, Connection: 'close' },
    }, response => {
      if (response.statusCode !== 200) {
        const error = Object.assign(new Error('Local proof HTTP status'), { code: `PROOF_HTTP_${response.statusCode}` });
        response.resume(); reject(error); req.destroy(); return;
      }
      const chunks = []; let length = 0;
      response.on('error', reject);
      response.on('data', chunk => {
        length += chunk.length;
        if (length > 1024 * 1024) {
          const error = Object.assign(new Error('Local proof response size bound'), { code: 'PROOF_RESPONSE_TOO_LARGE' });
          reject(error); req.destroy(); return;
        }
        chunks.push(chunk);
      });
      response.once('end', () => resolve(new Uint8Array(Buffer.concat(chunks, length))));
    });
    req.once('error', reject);
    req.once('finish', () => {
      payload = undefined;
      if (onBodySent) setImmediate(() => {
        try { onBodySent(); } catch (error) { req.destroy(error); reject(error); }
      });
    });
    void (async () => {
      try {
        for (let offset = 0; offset < payload.length; offset += 64 * 1024) {
          if (!req.write(payload.subarray(offset, offset + 64 * 1024))) await once(req, 'drain');
        }
        req.end();
      } catch (error) { req.destroy(error); reject(error); }
    })();
  });
}
