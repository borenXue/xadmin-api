module.exports = {
  parser:'@typescript-eslint/parser',
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    node: true
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'development' ? 'off' : 'error',
    'no-debugger': process.env.NODE_ENV === 'development' ? 'off' : 'error',
    'import/extensions': 0,
    'consistent-return': 1,
    'import/no-unresolved': 'error',
    'max-len': [2, 200],
    'no-restricted-syntax': 0,
    'no-return-await': 0,
    'no-param-reassign': 0,
    'no-plusplus': 0,
    'class-methods-use-this': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
    'func-names': 0,

    '@typescript-eslint/no-explicit-any': 0,
    'no-console': 0,
    'consistent-return': 0,
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      }
    }
  }
}
