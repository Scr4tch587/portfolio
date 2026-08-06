import { collection, limitToLast, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';

/**
 * Live list of the signed-in user's conversations, newest first, enriched
 * with the other participant's identity and an unread flag.
 */
export function useConversations() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc'),
    );
    const unsubscribe = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        setRows(snapshot.docs.map((convDoc) => ({ id: convDoc.id, ...convDoc.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, [user]);

  const conversations = useMemo(() => rows.map((conv) => {
    const participants = conv.participants || [];
    const otherIndex = participants[0] === user?.uid ? 1 : 0;
    const lastRead = conv.lastReadAt?.[user?.uid];
    const unread = Boolean(conv.lastMessageAt)
      && (!lastRead || lastRead.toMillis() < conv.lastMessageAt.toMillis());
    return {
      ...conv,
      otherUid: participants[otherIndex] || null,
      otherUsername: (conv.participantUsernames || [])[otherIndex] || 'unknown',
      unread,
    };
  }), [rows, user]);

  const unreadCount = useMemo(
    () => conversations.filter((conv) => conv.unread).length,
    [conversations],
  );

  return { conversations, loading, unreadCount };
}

/** Live tail (last 50) of one conversation's messages, oldest first. */
export function useMessages(convId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(Boolean(convId));

  useEffect(() => {
    if (!convId) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const messagesQuery = query(
      collection(db, 'conversations', convId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(50),
    );
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(snapshot.docs.map((msgDoc) => ({ id: msgDoc.id, ...msgDoc.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, [convId]);

  return { messages, loading };
}
