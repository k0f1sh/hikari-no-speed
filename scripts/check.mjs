import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const folder = await mkdtemp(join(tmpdir(), 'hikari-no-speed-check-'));
try {
  await build({
    entryPoints: [fileURLToPath(new URL('./check.ts', import.meta.url))],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: join(folder, 'check.mjs'),
  });
  await import(pathToFileURL(join(folder, 'check.mjs')).href);
} finally {
  await rm(folder, { recursive: true, force: true });
}
