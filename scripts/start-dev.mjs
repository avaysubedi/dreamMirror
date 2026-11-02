import { networkInterfaces } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const adapters = networkInterfaces();
const candidates = Object.entries(adapters).flatMap(([name, entries]) =>
  (entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.'))
    .map((entry) => ({ name: name.toLowerCase(), address: entry.address })),
);
const preferred = candidates.find((entry) => /wi-?fi|wireless|ethernet/.test(entry.name) && !/virtual|vmware|vpn|wsl|docker/.test(entry.name));
const host = (preferred ?? candidates.find((entry) => !/virtual|vmware|vpn|wsl|docker|loopback/.test(entry.name)))?.address ?? '';

await mkdir(publicDir, { recursive: true });
await writeFile(path.join(publicDir, 'dreammirror-network.json'), JSON.stringify({ host }), 'utf8');
if (host) console.log(`DreamMirror phone address: https://${host}:4200/connect`);
else console.warn('No LAN IPv4 address detected. Open the app from its LAN address or enter the address on Connect.');

const angularCli = path.join(root, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
const args = [angularCli, 'serve', '--host', '0.0.0.0', ...process.argv.slice(2)];
const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit' });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
