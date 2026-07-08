import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const rendererRoot = path.join(root, 'src', 'renderer', 'src', 'shared')

const studioUiPrefixes = [
  'components/',
  'hooks/',
  'pages/',
  'context/',
  'types/shellHeader.types',
  'utils/pipelineLog',
  'utils/formatFileSize',
  'utils/isElectronDesktop',
  'utils/findScrollableAncestor',
]

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full)
  }
  return files
}

function toRendererSharedPrefix(file) {
  let rel = path.relative(path.dirname(file), rendererRoot).replace(/\\/g, '/')
  if (!rel.startsWith('.')) rel = `./${rel}`
  return `${rel}/`
}

let changed = 0
for (const file of walk(path.join(root, 'src'))) {
  const prefix = toRendererSharedPrefix(file)
  const original = fs.readFileSync(file, 'utf8')
  let updated = original
  for (const uiPrefix of studioUiPrefixes) {
    updated = updated.replaceAll(
      `@fresh-prints/shared/${uiPrefix}`,
      `${prefix}${uiPrefix}`,
    )
  }
  if (updated !== original) {
    fs.writeFileSync(file, updated)
    changed++
  }
}

console.log(`Reverted Studio UI imports in ${changed} renderer files`)
