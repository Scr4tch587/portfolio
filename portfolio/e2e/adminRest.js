import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function readEnvLocal() {
  const raw = fs.readFileSync(path.join(rootDir, '.env.local'), 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

const env = readEnvLocal();
const API_KEY = env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;

/** Credentials of the dedicated admin-claim test account (.env.local, gitignored). */
export const E2E_ADMIN_EMAIL = env.E2E_ADMIN_EMAIL;
export const E2E_ADMIN_PASSWORD = env.E2E_ADMIN_PASSWORD;

let cachedIdToken = null;

/**
 * Admin Firebase ID token for direct Firestore REST writes from Node. Signs
 * in as the dedicated e2e admin account (email/password user carrying the
 * admin custom claim); cached per run.
 */
export async function getAdminIdToken(request) {
  if (cachedIdToken) return cachedIdToken;
  if (!E2E_ADMIN_EMAIL || !E2E_ADMIN_PASSWORD) {
    throw new Error('E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD missing from .env.local');
  }

  const signInRes = await request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { data: { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD, returnSecureToken: true } },
  );
  if (!signInRes.ok()) {
    throw new Error(`admin signInWithPassword failed: HTTP ${signInRes.status()} ${await signInRes.text()}`);
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
