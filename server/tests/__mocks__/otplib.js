// Mock для otplib — оригинал использует ESM (@scure/base), несовместимое с Jest CJS
module.exports = {
  generateSecret: () => 'TESTBASE32SECRET',
  generateURI: () => 'otpauth://totp/TestApp:testuser?secret=TESTBASE32SECRET',
  verifySync: () => false,
  authenticator: {
    generate: () => '123456',
    verify: () => false,
    generateSecret: () => 'TESTBASE32SECRET',
  },
};
