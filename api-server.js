import http from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createOrdersApp } from './src/server/orders-app.ts';
import { openLocalDatabase } from './src/server/local-db.js';
import { OrderStore } from './src/server/order-store.ts';
import { retryOrderEmails } from './src/server/order-email.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const envPath = resolve(projectRoot, '.dev.vars');
if (existsSync(envPath)) process.loadEnvFile(envPath);
const db = openLocalDatabase(resolve(projectRoot, process.env.ORDER_DB_PATH || '.data/orders.sqlite'));
const env = { ...process.env, DB: db };
const app = createOrdersApp();
const port = Number(process.env.PORT || 8789);

const server = http.createServer(async (incoming, outgoing) => {
  try {
    if (incoming.method === 'GET' && incoming.url === '/health') {
      outgoing.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      outgoing.end(JSON.stringify({ status: 'ok', paymentProvider: 'paystack', paystackConfigured: Boolean(env.PAYSTACK_SECRET_KEY), ordersEnabled: true, emailConfigured: Boolean(env.RESEND_API_KEY?.trim() && env.ORDER_FROM_EMAIL?.trim()), ownerEmailConfigured: Boolean(env.ORDER_OWNER_EMAIL?.trim()) }));
      return;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 64 * 1024) {
        outgoing.writeHead(413, { 'Content-Type': 'application/json' });
        outgoing.end(JSON.stringify({ error: 'Request is too large.' }));
        return;
      }
      chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) value.forEach(entry => headers.append(key, entry));
      else if (value !== undefined) headers.set(key, value);
    }
    const request = new Request(new URL(incoming.url || '/', `http://localhost:${port}`), {
      method: incoming.method, headers,
      ...(incoming.method !== 'GET' && incoming.method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = await app.fetch(request, env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json' });
    outgoing.end(JSON.stringify({ error: 'Unable to process this request. Please try again.' }));
  }
});

let retryRunning = false;
const retryTimer = setInterval(async () => {
  if (retryRunning) return;
  retryRunning = true;
  try { await retryOrderEmails(new OrderStore(db), env); }
  catch { console.error('Order email retry failed; it will be retried.'); }
  finally { retryRunning = false; }
}, 60_000);
retryTimer.unref();

server.listen(port, '127.0.0.1', () => {
  console.log(`API server running on http://localhost:${port}`);
  console.log(`Paystack: ${env.PAYSTACK_SECRET_KEY ? 'configured' : 'not configured'}. Order email: ${env.RESEND_API_KEY && env.ORDER_FROM_EMAIL ? 'configured' : 'not configured'}.`);
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the previous API process, then restart this command.` : 'The API server could not start.');
  clearInterval(retryTimer);
  db.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  clearInterval(retryTimer);
  server.close(() => { db.close(); process.exit(0); });
});
