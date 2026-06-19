import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');

if (process.argv.includes('--clean')) {
  await rm(dist, { recursive: true, force: true });
  console.log('dist/ removed');
  process.exit(0);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'index.html'), join(dist, 'index.html'));
await cp(join(root, 'manifest.json'), join(dist, 'manifest.json'));
await cp(join(root, 'src'), join(dist, 'src'), { recursive: true });
await cp(join(root, 'examples'), join(dist, 'examples'), { recursive: true });
await writeFile(join(dist, 'build-info.json'), JSON.stringify({
  app: 'KabelWerkstatt',
  author: 'Amir Mobasheraghdam',
  version: '1.0.0',
  builtAt: new Date().toISOString(),
  note: 'Static build generated without external dependencies.'
}, null, 2));
console.log('Build completed: dist/');
