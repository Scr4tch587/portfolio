import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable, httpsCallableFromURL } from 'firebase/functions';
import { auth, functions } from '../firebase';

const issueAdminToken = httpsCallable(functions, 'adminIssueToken');
const callableUrl = 'https://us-central1-portfolio-d996c.cloudfunctions.net/adminIssueToken';
const issueAdminTokenByUrl = httpsCallableFromURL(
  functions,
  callableUrl,
);

export async function loginWithPassphrase(passphrase) {
  let response;
  try {
    response = await issueAdminToken({ passphrase });
  } catch (error) {
    if (String(error?.code || '').includes('not-found')) {
      try {
        response = await issueAdminTokenByUrl({ passphrase });
      } catch (urlError) {
        if (String(urlError?.code || '').includes('not-found')) {
          const raw = await fetch(callableUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: { passphrase } }),
          });
          const payload = await raw.json().catch(() => ({}));

          if (!raw.ok || payload?.error) {
            const message = payload?.error?.message || `HTTP ${raw.status}`;
            throw new Error(`Callable fetch failed: ${message}`);
          }

          response = { data: payload?.result || {} };
        } else {
          throw urlError;
        }
      }
    } else {
      throw error;
    }
  }

  const token = response?.data?.token;

  if (!token) {
    throw new Error('Auth function did not return a token.');
  }

  await signInWithCustomToken(auth, token);
}
