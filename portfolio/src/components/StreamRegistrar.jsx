import { useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { usePlayer } from '../context/PlayerContext';
import StreamToast from './StreamToast';

const TOAST_MS = 2600;

/**
 * Always-mounted stream handler. Lives outside MainArea so streams register
 * (and the toast shows) no matter which view is active — Home unmounts
 * whenever the lyrics view takes over, so this cannot live there.
 *
 * A stream is counted the moment a project is played. Each event just
 * (re)shows the toast and fires the server call without awaiting it, so
 * clicking through many projects in quick succession stays smooth.
 */
const StreamRegistrar = () => {
  const { streamEvent } = usePlayer();
  const [showToast, setShowToast] = useState(false);
  const lastSeqRef = useRef(0);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    if (!streamEvent || streamEvent.seq === lastSeqRef.current) return;
    lastSeqRef.current = streamEvent.seq;
    const { project } = streamEvent;
    if (!project) return;

    // Informational toast — never blocks input, never interrupts playback.
    setShowToast(true);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setShowToast(false), TOAST_MS);

    // Views are incremented server-side (client writes to projects/ are
    // blocked by Firestore rules); onSnapshot updates the local count.
    const registerStream = httpsCallable(functions, 'registerStream');
    registerStream({ projectId: String(project.docId ?? project.id) })
      .catch((err) => console.error('Error registering stream:', err));
  }, [streamEvent]);

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), []);

  return <StreamToast show={showToast} />;
};

export default StreamRegistrar;
