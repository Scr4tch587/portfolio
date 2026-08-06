import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { db } from '../firebase';
import { useConversations, useMessages } from '../hooks/useConversations';
import { useMyProfile } from '../hooks/useUserProfile';
import { markRead, sendMessage } from '../lib/messaging';

const relativeTime = (timestamp) => {
  const date = timestamp?.toDate?.();
  if (!date) return '';
  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

const clockTime = (timestamp) => {
  const date = timestamp?.toDate?.();
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const MessagesView = () => {
  const { user, signInWithGoogle } = useAuth();
  const { profile } = useMyProfile();
  const { viewParams, openProfile } = usePlayer();
  const { conversations, loading } = useConversations();

  const [selectedConvId, setSelectedConvId] = useState(null);
  // Target of a conversation that doesn't exist yet (profile "Message" button).
  const [pendingUsername, setPendingUsername] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reportedConvIds, setReportedConvIds] = useState(() => new Set());
  const [isBlocked, setIsBlocked] = useState(false);

  const listEndRef = useRef(null);
  const markReadGuardRef = useRef('');

  useEffect(() => {
    if (viewParams?.convId) {
      setSelectedConvId(viewParams.convId);
      setPendingUsername(null);
    } else if (viewParams?.toUsername) {
      setPendingUsername(viewParams.toUsername);
      setSelectedConvId(null);
    }
    setError('');
  }, [viewParams]);

  // A pending target that already has a conversation just selects it.
  useEffect(() => {
    if (!pendingUsername) return;
    const existing = conversations.find(
      (conv) => conv.otherUsername?.toLowerCase() === pendingUsername.toLowerCase(),
    );
    if (existing) {
      setPendingUsername(null);
      setSelectedConvId(existing.id);
    }
  }, [pendingUsername, conversations]);

  // Default selection: newest conversation.
  useEffect(() => {
    if (!selectedConvId && !pendingUsername && conversations.length > 0) {
      setSelectedConvId(conversations[0].id);
    }
  }, [selectedConvId, pendingUsername, conversations]);

  const selectedConv = useMemo(
    () => conversations.find((conv) => conv.id === selectedConvId) || null,
    [conversations, selectedConvId],
  );

  const { messages } = useMessages(selectedConv ? selectedConv.id : null);

  // Mark read on open and when new messages land while the thread is open;
  // guarded by lastMessageAt so each unread state is stamped exactly once.
  useEffect(() => {
    if (!selectedConv?.unread) return;
    const guardKey = `${selectedConv.id}:${selectedConv.lastMessageAt?.toMillis?.() || 0}`;
    if (markReadGuardRef.current === guardKey) return;
    markReadGuardRef.current = guardKey;
    markRead(selectedConv.id).catch(() => {});
  }, [selectedConv]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, selectedConvId]);

  const otherUid = selectedConv?.otherUid || null;
  useEffect(() => {
    if (!user || !otherUid) {
      setIsBlocked(false);
      return undefined;
    }
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid, 'blocks', otherUid),
      (snapshot) => setIsBlocked(snapshot.exists()),
      () => {},
    );
    return () => unsubscribe();
  }, [user, otherUid]);

  if (!user) {
    return (
      <div className="min-h-full bg-[#121212] flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-lg font-bold">Sign in to use messages</p>
        <button
          type="button"
          onClick={() => signInWithGoogle().catch(() => {})}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:scale-105 transition-transform"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!profile?.username) {
    return (
      <div className="min-h-full bg-[#121212] flex items-center justify-center text-white">
        <p className="text-sm text-[#b3b3b3]">Pick a username to use messages.</p>
      </div>
    );
  }

  const activeUsername = pendingUsername || selectedConv?.otherUsername || null;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeUsername || sending) return;
    setSending(true);
    setError('');
    try {
      const { convId } = await sendMessage({ toUsername: activeUsername, text });
      setDraft('');
      if (pendingUsername) {
        setPendingUsername(null);
        setSelectedConvId(convId);
      }
    } catch (sendError) {
      setError(sendError?.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!otherUid) return;
    const blockRef = doc(db, 'users', user.uid, 'blocks', otherUid);
    try {
      if (isBlocked) await deleteDoc(blockRef);
      else await setDoc(blockRef, { createdAt: serverTimestamp() });
    } catch {
      // Rules reject or offline — the snapshot keeps the label truthful.
    }
  };

  const lastFromOther = [...messages].reverse().find((msg) => msg.senderUid !== user.uid);
  const reported = selectedConv ? reportedConvIds.has(selectedConv.id) : false;

  const handleReport = async () => {
    if (!selectedConv || !lastFromOther || reported) return;
    try {
      await addDoc(collection(db, 'messageReports'), {
        convId: selectedConv.id,
        messageId: lastFromOther.id,
        reason: 'user report',
        reporterUid: user.uid,
        createdAt: serverTimestamp(),
      });
      setReportedConvIds((prev) => new Set(prev).add(selectedConv.id));
    } catch {
      // Swallow: reporting is best-effort.
    }
  };

  return (
    <div className="min-h-full bg-[#121212] text-white flex" style={{ height: '100%' }}>
      {/* Conversation list */}
      <div className="w-80 shrink-0 border-r border-white/10 flex flex-col">
        <h2 className="text-xl font-bold px-4 py-4">Messages</h2>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && conversations.length === 0 && (
            <p className="px-4 text-sm text-[#b3b3b3]">Loading...</p>
          )}
          {!loading && conversations.length === 0 && !pendingUsername && (
            <p className="px-4 text-sm text-[#b3b3b3]">
              No conversations yet. Find someone on their profile and hit Message.
            </p>
          )}
          {pendingUsername && (
            <div className="w-full text-left px-4 py-3 bg-white/10">
              <span className="font-medium">@{pendingUsername}</span>
              <p className="text-sm text-[#b3b3b3]">New conversation</p>
            </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => {
                setSelectedConvId(conv.id);
                setPendingUsername(null);
                setError('');
              }}
              className={`w-full text-left px-4 py-3 hover:bg-white/5 ${conv.id === selectedConvId ? 'bg-white/10' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{conv.otherUsername}</span>
                {conv.unread && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                <span className="ml-auto text-xs text-[#b3b3b3] shrink-0">
                  {relativeTime(conv.lastMessageAt)}
                </span>
              </div>
              <p className="text-sm text-[#b3b3b3] truncate">{conv.lastMessageText}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeUsername ? (
          <>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
              <button
                type="button"
                onClick={() => openProfile(activeUsername)}
                className="font-bold hover:underline"
              >
                @{activeUsername}
              </button>
              {selectedConv && (
                <div className="ml-auto flex items-center gap-4">
                  {lastFromOther && (
                    <button
                      type="button"
                      onClick={handleReport}
                      disabled={reported}
                      className="text-xs text-[#b3b3b3] hover:text-white disabled:hover:text-[#b3b3b3]"
                    >
                      {reported ? 'Reported' : 'Report'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    className="text-xs text-[#b3b3b3] hover:text-white"
                  >
                    {isBlocked ? `Unblock @${activeUsername}` : `Block @${activeUsername}`}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 flex flex-col gap-2">
              {messages.length === 0 && (
                <p className="text-sm text-[#b3b3b3] m-auto">
                  {pendingUsername ? `Say hi to @${pendingUsername}` : 'No messages yet.'}
                </p>
              )}
              {messages.map((msg) => {
                const mine = msg.senderUid === user.uid;
                return (
                  <div key={msg.id} className={`max-w-[70%] ${mine ? 'self-end' : 'self-start'}`}>
                    <div className={`rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-green-500/15' : 'bg-[#282828]'}`}>
                      {msg.text}
                    </div>
                    <p className={`text-[10px] text-[#6a6a6a] mt-0.5 ${mine ? 'text-right' : ''}`}>
                      {clockTime(msg.createdAt)}
                    </p>
                  </div>
                );
              })}
              <div ref={listEndRef} />
            </div>

            <div className="px-5 py-4 border-t border-white/10">
              <div className="h-12 rounded-full bg-[#242424] flex items-center px-4 border border-transparent focus-within:border-[#535353]">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSend();
                  }}
                  disabled={sending}
                  placeholder={`Message @${activeUsername}`}
                  aria-label="Message text"
                  className="bg-transparent outline-none text-white text-[15px] w-full placeholder:text-[#b3b3b3]"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="ml-3 shrink-0 rounded-full bg-green-500 px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
                >
                  Send
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[#b3b3b3]">Select a conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesView;
