module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/tests/**/*.test.ts'],
	collectCoverage: false,
	transform: {
		'^.+\\.tsx?$': ['ts-jest', {
			tsconfig: 'tsconfig.json',
		}],
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
	testPathIgnorePatterns: [
		'/node_modules/',
		'/dist/',
	],
	globals: {
		'ts-jest': {
			isolatedModules: true,
		},
	},
}; 