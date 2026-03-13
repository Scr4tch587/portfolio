import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { getOrCreateVisitorId } from './visitor';

const VISITOR_UPDATE_KEY = 'visitorLastUpdateTs';
const UPDATE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export async function touchVisitor() {
  try {
    const id = getOrCreateVisitorId();
    const lastLocal = parseInt(localStorage.getItem(VISITOR_UPDATE_KEY) || '0', 10);
    const now = Date.now();

    if (now - lastLocal < UPDATE_THRESHOLD_MS) return;

    await setDoc(doc(db, 'visitors', id), { lastSeen: serverTimestamp() }, { merge: true });
    localStorage.setItem(VISITOR_UPDATE_KEY, String(now));
    console.debug('[analytics] touchVisitor: wrote lastSeen for', id);
  } catch (err) {
    console.error('[analytics] touchVisitor error', err);
  }
}

export async function getMonthlyVisitorCount() {
  try {
    const call = httpsCallable(functions, 'visitorMonthlyCount');
    const res = await call();
    const c = Number(res?.data?.count || 0);
    console.debug('[analytics] getMonthlyVisitorCount:', c);
    return c;
  } catch (err) {
    console.error('[analytics] getMonthlyVisitorCount error', err);
    return 0;
  }
}
