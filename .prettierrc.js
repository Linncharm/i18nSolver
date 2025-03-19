module.exports = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  jsxBracketSameLine: false, // This ensures JSX closing brackets are on a new line
  arrowParens: 'avoid',
  parser: 'typescript',
  endOfLine: 'lf',
  overrides: [
    {
      files: '*.tsx',
      options: {
        jsxBracketSameLine: false,
      },
    },
    {
      files: '*.jsx',
      options: {
        jsxBracketSameLine: false,
      },
    },
  ],
};
