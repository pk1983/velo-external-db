module.exports = {
    displayName: 'external-db-security',
    clearMocks: true,
    verbose: true,
    preset: '../../jest.preset.js',
    globals: {
      'ts-jest': {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    },
    transform: {
      '^.+\\.[tj]s$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/libs/external-db-security',
    // testRegex: '(.*\\.spec\\.)js$',
    // roots: ['<rootDir>/src'],
    // testRegex: '(.*\\.spec\\.)js$',
    // testEnvironment: 'node',
}
  