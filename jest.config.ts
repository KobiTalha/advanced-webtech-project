import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
