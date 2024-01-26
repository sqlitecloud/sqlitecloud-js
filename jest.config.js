module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/manager.test.ts'],
  maxWorkers: 12,
  collectCoverageFrom: ['<rootDir>/src/**/types.ts', '<rootDir>/src/**/manager.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        diagnostics: false,
        isolatedModules: true
      }
    ]
  }
}
