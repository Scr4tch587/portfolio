import Home from '../pages/Home';
import { usePlayer } from '../context/PlayerContext';
import LyricsView from './LyricsView';
import MessagesView from './MessagesView';
import PlaylistView from './PlaylistView';
import ProfileView from './ProfileView';

function killSwitchEnabled() {
  if (typeof window === 'undefined') return false;
  return window.__LYRICS_KILL === true;
}

export default function MainArea() {
  const { currentProject, mainView, viewParams, openMessages } = usePlayer();

  if (mainView === 'profile' && viewParams.username) {
    return (
      <ProfileView
        username={viewParams.username}
        onMessage={({ username }) => openMessages({ toUsername: username })}
      />
    );
  }

  if (mainView === 'playlist' && viewParams.playlistId) {
    return <PlaylistView playlistId={viewParams.playlistId} />;
  }

  if (mainView === 'messages') {
    return <MessagesView />;
  }

  if (!killSwitchEnabled() && mainView === 'lyrics' && currentProject) {
    return <LyricsView project={currentProject} />;
  }

  return <Home />;
}
