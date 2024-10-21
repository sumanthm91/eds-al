module.exports = {
  root: true,
  extends: ['airbnb', 'airbnb/hooks'],
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    // allow reassigning param
    'no-param-reassign': [2, { props: false }],
    'linebreak-style': ['error', 'unix'],
    'import/extensions': ['error', {
      js: 'always',
    }],
    'react/prop-types': 'off',
  },
  overrides: [{
    files: ['react-app/**/*.{js,jsx}'],
    rules: {
      'import/extensions': 'off',
      'max-len': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }],
  settings: {
    react: {
      version: 'detect',
    },
  },
};
