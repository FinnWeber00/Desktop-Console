const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'out/**', '.vite/**', 'temp-electron-forge/**', 'node_modules/**', 'eslint.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx,mts}'],
  })),
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'off',
    },
  },
);
