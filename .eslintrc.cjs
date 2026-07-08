module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'dist-electron', 'release', '.eslintrc.cjs', 'functions/lib', 'functions/node_modules', 'references', 'apps/portal/.next', 'apps/portal/next-env.d.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
    {
      files: ['apps/portal/**/*.{ts,tsx}'],
      rules: {
        // Next.js App Router layouts export metadata alongside components.
        'react-refresh/only-export-components': 'off',
      },
    },
  ],
}
