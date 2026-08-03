import { useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { usePlayer } from '../context/PlayerContext';
import StreamToast from './StreamToast';

/**
 * Always-mounted stream handler. Lives outside MainArea so confirmed streams
 * register (and the toast shows) no matter which view is active — Home
 * unmounts whenever the lyrics view takes over, so this cannot live there.
 */
const StreamRegistrar = () => {
  const { streamConfirmedTrigger, currentProject } = usePlayer();
  const [showToast, setShowToast] = useState(false);
  const lastProcessedTrigger = useRef(0);
  const currentProjectRef = useRef(currentProject);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  useEffect(() => {
    if (streamConfirmedTrigger > 0 && streamConfirmedTrigger !== lastProcessedTrigger.current) {
      lastProcessedTrigger.current = streamConfirmedTrigger;
      const project = currentProjectRef.current;
      if (!project) return;

      // Informational toast — playback is never interrupted.
      setShowToast(true);
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setShowToast(false), 1800);

      // Views are incremented server-side (client writes to projects/ are
      // blocked by Firestore rules); onSnapshot updates the local count.
      const registerStream = httpsCallable(functions, 'registerStream');
      registerStream({ projectId: String(project.docId ?? project.id) })
        .catch((err) => console.error('Error registering stream:', err));
    }
  }, [streamConfirmedTrigger]);

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), []);

  return <StreamToast show={showToast} />;
};

export default StreamRegistrar;
