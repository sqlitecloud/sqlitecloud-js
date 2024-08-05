module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  maxWorkers: 4,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/index.ts', '!<rootDir>/src/types/**/*.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        diagnostics: false,
        isolatedModules: true
      }
    ]
  },
  // Other Jest configuration options
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'SQLite Cloud Driver Test Report',
        outputPath: 'reports/test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true
      }
    ]
  ]
}
