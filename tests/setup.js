// This file will run before each test file

// Set up any global configurations needed for tests
global.console = {
  ...console,
  // Uncomment to suppress console.log output during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
  
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
}; 