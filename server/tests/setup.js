// Test environment setup
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // random port
// 1С OData — нерабочий адрес, чтобы тесты не ходили в реальный 1С
process.env.ODATA_BASE_URL = 'http://127.0.0.1:19999';
process.env.ODATA_USER = 'test';
process.env.ODATA_PASS = 'test';
