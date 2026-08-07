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
export const API_KEY = env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
const DOC_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Create a throwaway email/password user; returns { uid, idToken, email }. */
export async function signUpTestUser(request, email, password) {
  const res = await request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    { data: { email, password, returnSecureToken: true } },
  );
  if (!res.ok()) throw new Error(`signUp failed: ${await res.text()}`);
  const body = await res.json();
  return { uid: body.localId, idToken: body.idToken, email };
}

/** Self-delete an auth user (allowed with their own idToken). */
export async function deleteAuthUser(request, idToken) {
  await request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`,
    { data: { idToken } },
  );
}

/** Create users/{uid} + usernames/{lower} docs directly (used for the second
 *  test user so the UI flow only needs to run once). */
export async function createProfileDocs(request, idToken, uid, username) {
  const lower = username.toLowerCase();
  const now = new Date().toISOString();
  const userRes = await request.post(`${DOC_BASE}/users?documentId=${uid}`, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: {
      fields: {
        username: { stringValue: username },
        usernameLower: { stringValue: lower },
        displayName: { stringValue: username },
        photoURL: { nullValue: null },
        bio: { stringValue: '' },
        createdAt: { timestampValue: now },
      },
    },
  });
  if (!userRes.ok()) throw new Error(`users doc create failed: ${await userRes.text()}`);
  const nameRes = await request.post(`${DOC_BASE}/usernames?documentId=${lower}`, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: { fields: { uid: { stringValue: uid } } },
  });
  if (!nameRes.ok()) throw new Error(`usernames doc create failed: ${await nameRes.text()}`);
}

export async function getDoc(request, idToken, docPath) {
  const res = await request.get(`${DOC_BASE}/${docPath}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (res.status() === 404) return null;
  if (!res.ok()) throw new Error(`get ${docPath} failed: HTTP ${res.status()}`);
  return res.json();
}

export async function deleteDocPath(request, idToken, docPath) {
  await request.delete(`${DOC_BASE}/${docPath}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
}

/** List a user's playlists (owner-scoped query, matches the rules). */
export async function listOwnPlaylists(request, idToken, uid) {
  const res = await request.post(`${DOC_BASE.replace(/\/documents$/, '')}/documents:runQuery`, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: {
      structuredQuery: {
        from: [{ collectionId: 'playlists' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'ownerUid' },
            op: 'EQUAL',
            value: { stringValue: uid },
          },
        },
      },
    },
  });
  if (!res.ok()) return [];
  const rows = await res.json();
  return rows
    .filter((row) => row.document)
    .map((row) => row.document.name.split('/').pop());
}

/** Create a playlist doc directly (owner idToken); returns the new doc id. */
export async function createPlaylistDoc(request, idToken, { ownerUid, ownerUsername, name, projectIds, visibility }) {
  const now = new Date().toISOString();
  const res = await request.post(`${DOC_BASE}/playlists`, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: {
      fields: {
        ownerUid: { stringValue: ownerUid },
        ownerUsername: { stringValue: ownerUsername },
        name: { stringValue: name },
        description: { stringValue: '' },
        projectIds: { arrayValue: { values: projectIds.map((id) => ({ stringValue: String(id) })) } },
        visibility: { stringValue: visibility },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      },
    },
  });
  if (!res.ok()) throw new Error(`playlist create failed: ${await res.text()}`);
  const body = await res.json();
  return body.name.split('/').pop();
}

/** List message doc ids of a conversation (admin token). */
export async function listMessageDocs(request, idToken, convId) {
  const res = await request.get(`${DOC_BASE}/conversations/${convId}/messages?pageSize=200`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok()) return [];
  const body = await res.json();
  return (body.documents || []).map((docEntry) => docEntry.name.split('/').pop());
}
