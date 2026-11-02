// Unit tests exercise pure logic only; modules that import the DB client need env to parse.
// Nothing here connects to a database.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/finn_test';
process.env.JWT_SECRET ??= 'unit-test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ??= 'unit-test-refresh-secret-0123456789abcdef';
process.env.ENABLE_SCHEDULER = 'false';
process.env.NODE_ENV = 'test';
