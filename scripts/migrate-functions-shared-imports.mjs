import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const sharedSrc = path.join(root, 'packages', 'shared', 'src')
const functionsDir = path.join(root, 'functions')

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'lib') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.ts$/.test(entry.name)) files.push(full)
  }
  return files
}

function toSharedPrefix(file) {
  let rel = path.relative(path.dirname(file), sharedSrc).replace(/\\/g, '/')
  if (!rel.startsWith('.')) rel = `./${rel}`
  return `${rel}/`
}

let changed = 0
for (const file of walk(functionsDir)) {
  const prefix = toSharedPrefix(file)
  const original = fs.readFileSync(file, 'utf8')
  const updated = original.replace(/from (['"])@fresh-prints\/shared\//g, `from $1${prefix}`)
  if (updated !== original) {
    fs.writeFileSync(file, updated)
    changed++
  }
}

console.log(`Updated ${changed} functions files to relative shared imports`)
