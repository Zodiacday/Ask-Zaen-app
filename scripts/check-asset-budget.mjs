import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../assets', import.meta.url));
const rasterExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const KB = 1024;

const limits = [
  { test: (name) => name === 'auth_botanical_background_v2.jpg', bytes: 900 * KB },
  { test: (name) => /^onboarding_nature.*\.jpg$/i.test(name), bytes: 500 * KB },
  { test: (name) => /(^|[\\/])images[\\/]artwork[\\/]fallback_.*\.jpg$/i.test(name), bytes: 100 * KB },
  { test: (name) => /(^|[\\/])icons[\\/]/i.test(name), bytes: 350 * KB },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (rasterExtensions.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

function limitFor(relativePath) {
  const rule = limits.find(({ test }) => test(relativePath));
  return rule?.bytes ?? 750 * KB;
}

const files = await walk(root);
const hashes = new Map();
const violations = [];
const duplicates = [];

for (const file of files) {
  const bytes = (await stat(file)).size;
  const relativePath = relative(root, file).replaceAll('\\', '/');
  const name = relativePath.split('/').at(-1);
  const limit = limitFor(relativePath);
  if (bytes > limit) violations.push(`${relativePath}: ${bytes} bytes exceeds ${limit} bytes`);

  const hash = createHash('sha256').update(await readFile(file)).digest('hex');
  const previous = hashes.get(hash);
  if (previous) duplicates.push(`${previous} == ${relativePath}`);
  else hashes.set(hash, relativePath);
}

console.log(`asset-budget: checked ${files.length} raster assets`);
if (duplicates.length) {
  console.log('asset-budget: duplicate byte-identical assets:');
  duplicates.forEach((duplicate) => console.log(`  ${duplicate}`));
}

if (violations.length) {
  console.error('asset-budget: violations:');
  violations.forEach((violation) => console.error(`  ${violation}`));
  process.exitCode = 1;
} else {
  console.log('asset-budget: ok');
}
