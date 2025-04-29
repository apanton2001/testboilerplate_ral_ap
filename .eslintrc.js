module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  rules: {
    // Adjust the rule for unused vars to warning level
    '@typescript-eslint/no-unused-vars': 'warn',
    // Add other custom rules below if needed
  }
};