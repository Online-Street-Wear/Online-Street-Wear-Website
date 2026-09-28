import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
}

function start(args, env = process.env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(`Unable to start development server: ${error.code || error.message}`); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code || 0); });
}

console.log('Starting ONLINE storefront on http://localhost:5173 and payment API on port 8789.');
console.log('Keep this terminal open. Press Ctrl+C to stop both servers.');
start(['api-server.js'], { ...process.env, PORT: '8789' });
start(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort']);
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
