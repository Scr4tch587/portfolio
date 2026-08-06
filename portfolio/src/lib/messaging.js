import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const sendMessageCallable = httpsCallable(functions, 'sendMessage');
const markReadCallable = httpsCallable(functions, 'markRead');

/** Send a DM by username. Resolves to { convId }; throws with a
 *  user-presentable .message on validation/rate-limit/block failures. */
export async function sendMessage({ toUsername, text }) {
  const response = await sendMessageCallable({ toUsername, text });
  return response.data;
}

/** Stamp the caller's lastReadAt on a conversation. */
export async function markRead(convId) {
  const response = await markReadCallable({ convId });
  return response.data;
}
