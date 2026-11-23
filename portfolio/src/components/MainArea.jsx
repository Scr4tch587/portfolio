import Home from '../pages/Home';
import { usePlayer } from '../context/PlayerContext';
import LyricsView from './LyricsView';

function killSwitchEnabled() {
  if (typeof window === 'undefined') return false;
  return window.__LYRICS_KILL === true;
}

export default function MainArea() {
  const { currentProject, mainView } = usePlayer();

  if (!killSwitchEnabled() && mainView === 'lyrics' && currentProject) {
    return <LyricsView project={currentProject} />;
  }

  return <Home />;
}
