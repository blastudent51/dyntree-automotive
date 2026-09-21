import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
for (const path of ['.env', '.env.local'])
  if (existsSync(path)) {
    for (const raw of readFileSync(path, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i > 0 && process.env[line.slice(0, i)] === undefined)
        process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^['"]|['"]$/g, '');
    }
  }
const [command, ...args] = process.argv.slice(2);
const child = spawn(command, args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});
child.on('exit', (c) => process.exit(c ?? 1));
