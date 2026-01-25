const crypto = require('crypto');

function genHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

console.log('# Paste these into server/.env (or .env.local)');
console.log(`SESSION_SECRET=${genHex(32)}`);
console.log(`JWT_SECRET=${genHex(32)}`);
console.log(`EMAIL_PASSWORD=${genHex(24)}`);
console.log(`
# Example: set EMAIL_USER to your SMTP user (e.g., smtp user)
# and EMAIL_HOST/EMAIL_PORT as needed.
`);
