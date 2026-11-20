import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const roots = ['app.js', 'server.mjs', 'src'];
const files = [];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.m?js$/.test(entry.name)) files.push(full);
  }
}
for (const path of roots) {
  if (path === 'app.js' || path === 'server.mjs') files.push(path);
  else await walk(path);
}
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(`\n[SYNTAX ERROR] ${file}\n${result.stderr}`);
  }
}
if (failed) process.exitCode = 1;
else console.log(`Syntax check passed for ${files.length} JavaScript files.`);
