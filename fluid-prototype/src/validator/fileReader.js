import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';

export async function readOutputFiles(outputDir) {
  const srcDir = join(outputDir, 'src');
  const files = new Map();

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        await walk(full);
      } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        const rel = 'src/' + relative(srcDir, full);
        const code = await readFile(full, 'utf-8');
        files.set(rel, code);
      }
    }
  }

  await walk(srcDir);
  return files;
}
