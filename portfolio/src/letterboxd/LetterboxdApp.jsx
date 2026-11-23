import React from 'react';
import LbHeader from './LbHeader';
import { useLbRoute } from './lbRoute';
import LbHome from './pages/LbHome';
import LbFilms from './pages/LbFilms';
import LbFilm from './pages/LbFilm';
import LbJournal from './pages/LbJournal';
import LbArticle from './pages/LbArticle';
import LbSearch from './pages/LbSearch';

function Page({ route }) {
  switch (route.page) {
    case 'films': return <LbFilms />;
    case 'film': return <LbFilm slug={route.slug} />;
    case 'journal': return <LbJournal />;
    case 'article': return <LbArticle slug={route.slug} />;
    case 'search': return <LbSearch query={route.query} />;
    default: return <LbHome />;
  }
}

/** The Letterboxd skin: a plain scrolling site, no player, no sidebars. */
export default function LetterboxdApp() {
  const { route } = useLbRoute();
  return (
    <div className="lb-root min-h-screen" data-mode="letterboxd">
      <LbHeader route={route} />
      <main className="mx-auto min-h-[60vh] max-w-[950px] px-4 pb-10">
        <Page route={route} />
      </main>
    </div>
  );
}
