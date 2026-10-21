import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { postLoopbackProof, safeProofErrorChain } from './m6-action-proof-http-memory.mjs';

async function withServer(handler, body) {
  const server = createServer(handler); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await body(server.address().port); }
  finally { server.closeAllConnections(); server.close(); await once(server, 'close'); }
}
test('streams exact bytes across chunk boundaries using a fresh connection', async () => {
  const payload = Uint8Array.from({ length: 8 * 64 * 1024 + 123 }, (_, index) => index % 251);
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  await withServer(async (req, res) => {
    assert.equal(req.headers.connection, 'close'); assert.equal(Number(req.headers['content-length']), payload.length);
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    assert.equal(digest(Buffer.concat(chunks)), digest(payload)); res.end(Buffer.from([1, 2, 3]));
  }, async port => assert.deepEqual(await postLoopbackProof('/prove', payload, { port }), new Uint8Array([1, 2, 3])));
});
test('records HTTP status without retaining an error response body', async () => {
  await withServer((req, res) => { req.resume(); res.writeHead(400); res.end('synthetic body excluded'); }, async port => {
    await assert.rejects(postLoopbackProof('/check', new Uint8Array([1]), { port }), error => {
      assert.equal(error.code, 'PROOF_HTTP_400'); assert(!error.message.includes('synthetic'));
      assert.equal(safeProofErrorChain(error)[0].code, 'PROOF_HTTP_400'); return true;
    });
  });
});
test('aborts a stalled local response within its explicit time bound', async () => {
  await withServer(req => req.resume(), async port => {
    await assert.rejects(postLoopbackProof('/check', new Uint8Array([1]), { port, timeoutMs: 100 }), error => error.code === 'ABORT_ERR');
  });
});

test('reports the complete flushed body before a delayed proof response', async () => {
  const payload = new Uint8Array(3 * 64 * 1024 + 17).fill(91);
  let sent = 0;
  await withServer(async (req, res) => {
    let bytes = 0; for await (const chunk of req) bytes += chunk.length;
    assert.equal(bytes, payload.length);
    setTimeout(() => { assert.equal(sent, 1); res.end(Buffer.from([9])); }, 100);
  }, async port => {
    const proof = await postLoopbackProof('/prove', payload, { port, onBodySent: () => sent++ });
    assert.equal(sent, 1); assert.deepEqual(proof, new Uint8Array([9]));
  });
});
