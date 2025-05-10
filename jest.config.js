module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/tests/**/*.test.ts'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	moduleFileExtensions: ['js', 'ts'],
	collectCoverage: true,
	coverageReporters: ['text', 'lcov'],
	coverageDirectory: 'coverage',
}; 