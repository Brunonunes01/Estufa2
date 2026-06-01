const fs = require('fs');
const path = require('path');

const files = [
  path.join('node_modules', '@supabase', 'supabase-js', 'dist', 'index.cjs'),
  path.join('node_modules', '@supabase', 'supabase-js', 'dist', 'index.mjs'),
];

const from = /function loadOtel\(\)\s*\{[\s\S]*?return otelModulePromise;\s*\}/m;
const to = `function loadOtel() {
\tif (otelModulePromise === null) otelModulePromise = Promise.resolve(null);
\treturn otelModulePromise;
}`;

let patchedAny = false;

for (const relativeFile of files) {
  const absoluteFile = path.resolve(process.cwd(), relativeFile);
  if (!fs.existsSync(absoluteFile)) {
    continue;
  }

  const original = fs.readFileSync(absoluteFile, 'utf8');
  if (!from.test(original)) {
    continue;
  }

  const updated = original.replace(from, to);
  if (updated !== original) {
    fs.writeFileSync(absoluteFile, updated, 'utf8');
    patchedAny = true;
    console.log(`[patch-supabase-hermes] patched ${relativeFile}`);
  }
}

if (!patchedAny) {
  console.log('[patch-supabase-hermes] no changes needed');
}
