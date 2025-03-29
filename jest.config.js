module.exports = {
  preset: '@vue/cli-plugin-unit-jest',
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/tests/unit/**/*.spec.[jt]s?(x)',
    '**/__tests__/*.[jt]s?(x)'
  ],
  
  // File transformations
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\js$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest'
  },
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/unit/mocks/styleMock.js',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/unit/mocks/fileMock.js'
  },
  
  // Coverage collection settings
  collectCoverage: process.env.COLLECT_COVERAGE === 'true',
  collectCoverageFrom: [
    'src/**/*.{js,vue}',
    '!src/main.js',
    '!src/router/index.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['lcov', 'text-summary'],
  
  // Configure test setup file
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.js'],
  
  // Global variables available in all test files
  globals: {
    'vue-jest': {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('web3-') || tag.includes('-')
      }
    }
  },
  
  // Test timeouts
  testTimeout: 20000, // 20 seconds for blockchain tests that might be slower
  
  // Watch settings
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};
