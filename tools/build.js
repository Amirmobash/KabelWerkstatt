import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');

if (process.argv.includes('--clean')) {
  await rm(dist, { recursive: true, force: true });
  console.log('dist/ wurde entfernt.');
  process.exit(0);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of ['index.html', 'manifest.json', 'README.md', 'LICENSE']) {
  await copyIfExists(entry);
}

for (const entry of ['src', 'examples', 'arduino']) {
  await copyIfExists(entry, { recursive: true });
}

await writeFile(join(dist, 'build-info.json'), JSON.stringify({
  app: 'KabelWerkstatt',
  author: 'Amir Mobasheraghdam',
  version: '1.1.0',
  builtAt: new Date().toISOString(),
  note: 'Statischer Build ohne externe Abhängigkeiten.'
}, null, 2));

console.log('Build abgeschlossen: dist/');

async function copyIfExists(path, options = {}) {
  const source = join(root, path);
  try {
    await stat(source);
    await cp(source, join(dist, path), options);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
