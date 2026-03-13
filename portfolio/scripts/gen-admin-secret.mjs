import { randomBytes, scryptSync } from 'node:crypto';

const passphrase = process.argv[2];

if (!passphrase || passphrase.length < 12) {
  console.error('Usage: node scripts/gen-admin-secret.mjs <long-passphrase>');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(passphrase, salt, 64);

console.log('ADMIN_PASS_SALT_HEX=' + salt.toString('hex'));
console.log('ADMIN_PASS_HASH_HEX=' + hash.toString('hex'));
console.log('RATE_LIMIT_PEPPER=' + randomBytes(32).toString('hex'));
