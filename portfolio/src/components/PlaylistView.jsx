import React, { useEffect, useMemo, useState } from 'react';
import { SpChevronDown, SpChevronUp, SpClose, SpPlay } from './icons/SpotifyIcons';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylist } from '../hooks/usePlaylists';
import {
  deletePlaylist,
  removeProjectFromPlaylist,
  reorderPlaylist,
  updatePlaylistMeta,
} from '../lib/playlists';

const VISIBILITY_EYEBROW = {
  public: 'Playlist',
  unlisted: 'Unlisted playlist',
  private: 'Private playlist',
};

const normalizeProjectId = (rawId) => {
  const asNumber = Number.parseInt(rawId, 10);
  return Number.isNaN(asNumber) ? rawId : asNumber;
};

const PlaylistView = ({ playlistId }) => {
  const { user } = useAuth();
  const { playlist, loading, notFound } = usePlaylist(playlistId);
  const {
    allProjectsList,
    playFromQueue,
    currentProject,
    getDisplayDuration,
    goHome,
  } = usePlayer();

  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');

  const isOwner = Boolean(user && playlist && user.uid === playlist.ownerUid);

  const resolvedProjects = useMemo(() => {
    if (!playlist) return [];
    return (playlist.projectIds || [])
      .map((rawId) => allProjectsList.find((project) => project.id === normalizeProjectId(rawId)))
      .filter(Boolean);
  }, [playlist, allProjectsList]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (loading) {
    return (
      <div className="min-h-full bg-[#121212] flex items-center justify-center">
        <p className="text-sm text-[#b3b3b3]">Loading playlist...</p>
      </div>
    );
  }

  if (notFound || !playlist) {
    return (
      <div className="min-h-full bg-[#121212] flex items-center justify-center">
        <p className="text-sm text-[#b3b3b3]">Playlist not found.</p>
      </div>
    );
  }

  const coverProject = resolvedProjects[0] || null;

  const handleShare = async () => {
    const link = `${window.location.origin}${window.location.pathname}#/playlist/${playlist.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Clipboard unavailable (permissions) — nothing sensible to do.
    }
  };

  const startEditing = () => {
    setNameDraft(playlist.name);
    setDescriptionDraft(playlist.description || '');
    setEditing(true);
  };

  const saveEdits = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    await updatePlaylistMeta(playlist.id, {
      name: trimmed.slice(0, 60),
      description: descriptionDraft.slice(0, 300),
    }).catch(() => {});
    setEditing(false);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete "${playlist.name}"? This cannot be undone.`);
    if (!confirmed) return;
    await deletePlaylist(playlist.id).catch(() => {});
    goHome();
  };

  const moveProject = async (index, direction) => {
    const ids = [...(playlist.projectIds || [])];
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await reorderPlaylist(playlist.id, ids).catch(() => {});
  };

  return (
    <div className="min-h-full bg-[#121212] relative">
      <div className="absolute inset-x-0 top-0 h-80 bg-linear-to-b from-[#252b36] to-[#121212]" />

      <div className="relative z-10 px-6 pt-16 pb-8">
        {/* Header */}
        <div className="flex items-end gap-6">
          <div className="w-48 h-48 shrink-0 rounded-md overflow-hidden bg-[#282828] shadow-2xl flex items-center justify-center">
            {coverProject?.image ? (
              <img src={coverProject.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl text-[#b3b3b3]">♪</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{VISIBILITY_EYEBROW[playlist.visibility] || 'Playlist'}</p>
            {editing ? (
              <div className="mt-2 flex flex-col gap-2 max-w-xl">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={60}
                  className="bg-[#282828] rounded-md px-3 py-2 text-2xl font-bold text-white outline-none border border-transparent focus:border-[#535353]"
                  aria-label="Playlist name"
                />
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Add a description"
                  className="bg-[#282828] rounded-md px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-[#535353] resize-none"
                  aria-label="Playlist description"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveEdits}
                    className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-1.5 rounded-full border border-[#7c7c7c] text-sm font-bold hover:border-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-5xl md:text-6xl font-extrabold mt-2 truncate">{playlist.name}</h1>
                {playlist.description && (
                  <p className="mt-3 text-sm text-[#b3b3b3] max-w-xl">{playlist.description}</p>
                )}
                <p className="mt-2 text-sm">
                  <span className="font-bold">{playlist.ownerUsername}</span>
                  <span className="text-[#b3b3b3]">
                    {' '}&bull; {resolvedProjects.length} {resolvedProjects.length === 1 ? 'project' : 'projects'}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-4 mt-8">
          <button
            type="button"
            onClick={() => playFromQueue(resolvedProjects)}
            disabled={resolvedProjects.length === 0}
            className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"
            aria-label="Play playlist"
          >
            <SpPlay size={24} className="text-black" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="px-4 py-1.5 border border-[#7c7c7c] rounded-full text-sm font-bold hover:border-white hover:scale-105 transition-transform"
          >
            {copied ? 'Link copied!' : 'Share'}
          </button>
          {isOwner && !editing && (
            <>
              <button
                type="button"
                onClick={startEditing}
                className="px-4 py-1.5 border border-[#7c7c7c] rounded-full text-sm font-bold hover:border-white hover:scale-105 transition-transform"
              >
                Edit details
              </button>
              <select
                value={playlist.visibility}
                onChange={(e) => updatePlaylistMeta(playlist.id, { visibility: e.target.value }).catch(() => {})}
                className="bg-[#282828] text-white text-sm rounded-full px-3 py-1.5 border border-transparent hover:border-[#7c7c7c] outline-none cursor-pointer"
                aria-label="Playlist visibility"
              >
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-1.5 border border-red-400/60 text-red-400 rounded-full text-sm font-bold hover:border-red-400 hover:scale-105 transition-transform"
              >
                Delete playlist
              </button>
            </>
          )}
        </div>

        {/* Track list */}
        <div className="mt-8">
          {resolvedProjects.length === 0 ? (
            <p className="text-sm text-[#b3b3b3]">
              No projects yet. Use the add-to-playlist option on any project to fill this playlist.
            </p>
          ) : (
            <div className="flex flex-col">
              {resolvedProjects.map((project, index) => {
                const isCurrent = currentProject?.id === project.id;
                return (
                  <div
                    key={project.id}
                    className="grid grid-cols-[16px_4fr_1fr_auto] gap-4 items-center px-4 h-14 rounded-md hover:bg-white/10 group"
                  >
                    <button
                      type="button"
                      onClick={() => playFromQueue(resolvedProjects, project)}
                      className="text-base text-[#b3b3b3] text-left"
                      aria-label={`Play ${project.title}`}
                    >
                      <span className="group-hover:hidden">{index + 1}</span>
                      <SpPlay size={14} className="hidden group-hover:block text-white" />
                    </button>
                    <button
                      type="button"
                      onClick={() => playFromQueue(resolvedProjects, project)}
                      className="flex items-center gap-3 min-w-0 text-left"
                    >
                      <div className="w-10 h-10 rounded-[4px] overflow-hidden bg-[#282828] shrink-0">
                        {project.image && (
                          <img src={project.image} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className={`font-normal text-base truncate ${isCurrent ? 'text-green-500' : 'text-white'}`}>
                        {project.title}
                      </span>
                    </button>
                    <span className="text-base text-[#b3b3b3] tabular-nums text-right">
                      {getDisplayDuration(project)}
                    </span>
                    {isOwner ? (
                      <div className="flex items-center gap-2 text-[#b3b3b3] opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => moveProject(index, -1)}
                          disabled={index === 0}
                          className="hover:text-white disabled:opacity-30"
                          aria-label={`Move ${project.title} up`}
                        >
                          <SpChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProject(index, 1)}
                          disabled={index === resolvedProjects.length - 1}
                          className="hover:text-white disabled:opacity-30"
                          aria-label={`Move ${project.title} down`}
                        >
                          <SpChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeProjectFromPlaylist(playlist.id, project.id).catch(() => {})}
                          className="hover:text-white"
                          aria-label={`Remove ${project.title} from playlist`}
                        >
                          <SpClose size={14} />
                        </button>
                      </div>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistView;
