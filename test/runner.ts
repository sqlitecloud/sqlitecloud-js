global.console = {
  log: jest.fn(),
  // Add other methods that you want to silence
  warn: jest.fn(),
  error: jest.fn()
}
