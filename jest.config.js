module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'lib/**/*.js',
    'api/**/*.js',
    '!**/*.test.js',
    '!node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  verbose: true
};
