import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_PASSPHRASE } from './helpers.js';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function readEnvLocal() {
  const raw = fs.readFileSync(path.join(rootDir, '.env.local'), 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

const env = readEnvLocal();
const API_KEY = env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
const CALLABLE_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/adminIssueToken`;

let cachedIdToken = null;
let cachedCustomToken = null;

/**
 * Passphrase -> admin custom token via the adminIssueToken callable. The UI
 * is Google-only now; tests sign in by handing this token to the page's
 * DEV-only __testSignInWithCustomToken hook. Counts one attempt against the
 * admin login rate limit; cached per run.
 */
export async function getAdminCustomToken(request) {
  if (cachedCustomToken) return cachedCustomToken;

  const callableRes = await request.post(CALLABLE_URL, {
    headers: { 'Content-Type': 'application/json' },
    data: { data: { passphrase: ADMIN_PASSPHRASE } },
  });
  if (!callableRes.ok()) {
    throw new Error(`adminIssueToken failed: HTTP ${callableRes.status()} ${await callableRes.text()}`);
  }
  const callableBody = await callableRes.json();
  const customToken = callableBody?.result?.token;
  if (!customToken) throw new Error('adminIssueToken returned no token');
  cachedCustomToken = customToken;
  return customToken;
}

/** Admin Firebase ID token for direct Firestore REST writes from Node. */
export async function getAdminIdToken(request) {
  if (cachedIdToken) return cachedIdToken;

  const customToken = await getAdminCustomToken(request);
  const signInRes = await request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    { data: { token: customToken, returnSecureToken: true } },
  );
  if (!signInRes.ok()) {
    throw new Error(`signInWithCustomToken failed: HTTP ${signInRes.status()} ${await signInRes.text()}`);
  }
  const signInBody = await signInRes.json();
  cachedIdToken = signInBody.idToken;
  return cachedIdToken;
}

const DOC_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** PATCH a single field on a project document as the admin. */
export async function setProjectField(request, docId, field, value) {
  const idToken = await getAdminIdToken(request);
  const fieldValue = typeof value === 'number'
    ? { integerValue: String(value) }
    : { stringValue: String(value) };
  const url = `${DOC_BASE}/projects/${encodeURIComponent(docId)}?updateMask.fieldPaths=${encodeURIComponent(field)}`;
  const res = await request.patch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: { fields: { [field]: fieldValue } },
  });
  if (!res.ok()) {
    throw new Error(`setProjectField(${docId}.${field}) failed: HTTP ${res.status()} ${await res.text()}`);
  }
}

/** Delete a project document as the admin (cleanup safety net). */
export async function deleteProjectDoc(request, docId) {
  const idToken = await getAdminIdToken(request);
  const res = await request.delete(`${DOC_BASE}/projects/${encodeURIComponent(docId)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok()) {
    throw new Error(`deleteProjectDoc(${docId}) failed: HTTP ${res.status()} ${await res.text()}`);
  }
}

/**
 * Restore orderingPriority values captured before a create test. Only writes
 * docs whose current value differs from the snapshot.
 */
export async function restoreOrderingPriorities(request, snapshotByDocId, currentProjects) {
  for (const project of currentProjects) {
    const before = snapshotByDocId.get(project.docId);
    if (before === undefined) continue;
    const current = project.orderingPriority;
    if (current !== before) {
      await setProjectField(request, project.docId, 'orderingPriority', before);
    }
  }
}
