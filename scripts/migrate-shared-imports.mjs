import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const skipDirs = new Set(['node_modules', 'dist', 'dist-electron', 'release', 'gang-sheet-builder-reference', '.git', 'packages/shared/src-broken'])

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.(ts|tsx|cjs|mjs|js|md)$/.test(entry.name)) files.push(full)
  }
  return files
}

const importPattern = /from (['"])(?:\.\.\/)+shared\//g
const importPattern2 = /import\((['"])(?:\.\.\/)+shared\//g

let changed = 0
for (const file of walk(root)) {
  if (file.includes(`${path.sep}packages${path.sep}shared${path.sep}src${path.sep}`)) continue
  const original = fs.readFileSync(file, 'utf8')
  const updated = original
    .replace(importPattern, 'from $1@fresh-prints/shared/')
    .replace(importPattern2, 'import($1@fresh-prints/shared/')
  if (updated !== original) {
    fs.writeFileSync(file, updated)
    changed++
  }
}

console.log(`Updated ${changed} files`)
