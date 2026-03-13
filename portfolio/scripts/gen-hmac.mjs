import { createHmac } from 'crypto';

const CHALLENGE = 'kai-admin-challenge-v1';
const secret = process.argv[2];

if (!secret) {
  console.error('Usage: node scripts/gen-hmac.mjs <passphrase>');
  process.exit(1);
}

console.log(createHmac('sha256', secret).update(CHALLENGE).digest('hex'));
