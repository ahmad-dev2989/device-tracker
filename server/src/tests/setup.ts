// Configure environment variables for the test suite
process.env.DATABASE_PATH = ":memory:";
process.env.JWT_SECRET = "test-secret-key-for-omnirecover-unit-tests";
process.env.PORT = "3005";
process.env.HEARTBEAT_TIMEOUT_MS = "100";
